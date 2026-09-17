# Pro-fit 数据库优化与修改建议（本次未实施）

日期：2026-08-12

## 文档状态

本文只记录后续可评审的优化与结构修改建议。按照本次要求，以下内容均未写入线上数据库迁移，也未改变附件定义的 MVP 字段结构。

当前已实施的基线是：附件中的 8 个枚举、12 张业务表、附件声明的外键与索引、Supabase Auth 资料同步、RLS、Data API 最小权限、私有 `avatars` / `meal-photos` bucket，以及完成打卡反馈闭环所需的触发器。

## P1：建议在进入真实用户测试前评审

### 1. 增加字段值检查约束

建议增加以下 `CHECK` 约束，阻止可信后台、脚本或 `service_role` 写入无效数据：

- `workout_plans.end_date >= workout_plans.start_date`
- `workout_days.scheduled_date` 位于所属计划的起止日期内
- `sets`、`sort_order`、`day_number`、训练时长、休息时间和营养数值不得为负数
- 同时存在 `reps_min`、`reps_max` 时满足 `reps_min <= reps_max`
- 设置 `target_weight` 时必须同时设置 `weight_unit`
- `diet_logs.actual_food` 与 `photo_path` 至少有一个非空
- `ended_at` 不早于 `started_at`

未实施原因：这些会修改附件允许的数据范围，需要先确认业务期望和历史数据兼容方式。

### 2. 强化计划和打卡的状态机

建议通过受控 RPC 或触发器限制状态只能按以下方向流转，并由数据库维护时间戳：

- 计划：`draft → published → archived`
- 每日打卡：`draft → submitted → reviewed`
- 监督关系：`active → ended`
- 自动维护 `published_at`、`submitted_at`、`reviewed_at`、`ended_at`

目前 RLS 已阻止训练人员将打卡直接设为 `reviewed`，监督反馈也会把已提交打卡更新为 `reviewed`；但客户端仍可提交与状态不完全一致的时间戳。状态机能进一步消除这类语义不一致。

### 3. 明确主要监督人员规则

附件允许一个训练人员存在多条 `is_primary = true` 的 active 关系。若产品规则确定为“可有多名监督人员，但只能有一名主要监督人员”，建议增加部分唯一索引：

```sql
create unique index ...
on public.coach_trainees (trainee_id)
where status = 'active' and is_primary;
```

未实施原因：多监督人员及主要监督人员规则尚未经过最终业务确认。

### 4. 明确删除与历史保留规则

建议确定每条外键的 `ON DELETE` 行为：

- 已发布计划和已提交打卡优先归档，不物理删除
- 草稿计划可考虑级联删除其训练日和动作项
- 删除 Auth 用户时，是否匿名化历史业务数据，或继续使用当前 `profiles` 级联删除行为
- Storage 文件是否随饮食日志/用户删除而清理

未实施原因：这是数据保留与审计政策，不应在没有产品确认时由数据库默认决定。

### 5. 完成真实 Storage API 文件测试

本次测试验证了两个 bucket 的私有属性及 `storage.objects` RLS，包括本人写入/更新、对应监督人员读取和无关用户隔离。上线前仍建议用前端 SDK 上传、下载、替换和删除真实文件，以同时覆盖对象存储服务、文件内容和网络接口。

同时建议确认：

- 最大文件大小
- 允许的 MIME 类型
- 图片压缩、缩略图和 EXIF 清理
- 孤儿文件清理任务

## P2：有真实使用数据后再决定

### 6. 不要立即删除 Advisors 标记的未使用索引

Supabase Performance Advisors 当前报告 11 条 `unused_index` INFO：

- `exercises_created_by_idx`
- `exercises_exercise_name_idx`
- `workout_days_scheduled_date_idx`
- `workout_items_exercise_id_idx`
- `workout_checkins_workout_day_idx`
- `workout_checkins_status_idx`
- `diet_logs_daily_checkin_idx`
- `diet_logs_diet_meal_idx`
- `diet_logs_daily_meal_type_idx`
- `coach_feedback_daily_checkin_idx`
- `coach_feedback_coach_idx`

当前业务表为空，索引自然没有使用记录。这些索引又全部来自附件定义，因此本次没有删除。建议在真实流量运行一段时间后，结合慢查询、查询计划、索引大小与 `pg_stat_user_indexes` 再决定保留、合并或删除。

参考：[Supabase unused index advisor](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)

### 7. 增加查询专用复合索引

在有真实查询后，重点检查 RLS 和页面列表涉及的条件：

- 监督人员查看某学员的已提交打卡
- 学员查看日期区间内的已发布训练计划
- 某训练日读取有序动作项
- 某日按餐次读取实际饮食

只有在 `EXPLAIN (ANALYZE, BUFFERS)` 证明存在瓶颈时，再创建贴合实际过滤与排序顺序的复合索引，避免过早增加写入成本。

### 8. 完成率视图或 RPC

建议在需求稳定后提供一个 `security_invoker = true` 的视图或受 RLS 保护的 SQL 函数，实时计算：

```text
截至今天已完成的训练日数量 ÷ 截至今天应完成的已发布训练日数量
```

不建议直接把完成率保存为普通列，因为调整或归档计划后容易产生过期数据。

### 9. 记录动作级实际结果

如果后续需要分析每组实际重量、次数、RPE/RIR 或渐进超负荷，建议新增 `workout_item_results`，关联 `workout_checkins` 与 `workout_items`。MVP 当前只记录训练日级结果，不应提前扩展。

### 10. 反馈唯一性或反馈线程

附件允许同一监督人员对同一每日打卡创建多条反馈。后续需二选一：

- 每位监督人员每天一份反馈：增加 `(daily_checkin_id, coach_id)` 唯一约束
- 保留多轮交流：新增评论线程、作者、发送时间和已读状态

本次保持附件原有的一对多模型。

### 11. 动作库共享和去重

当前动作按监督人员创建。若未来形成平台级动作库，可考虑：

- 平台公共动作与监督人员私有动作分层
- 对标准化名称或 slug 建唯一规则
- 视频来源、版权、语言与器材分类字段
- 使用软删除代替物理删除

## P3：上线运维建议

### 12. 账号和角色管理后台

普通注册始终默认为 `trainee`，前端无法修改 `role` 或 `status`。上线前需要一个可信管理流程，用于：

- 将指定账号提升为 `coach`
- 禁用/恢复账号
- 创建、结束监督关系
- 更换主要监督人员

该流程应运行在可信服务端或人工管理通道，不能把 `service_role` 放入浏览器。

### 13. Auth 邮件与滥用防护

当前数据库支持邮箱+密码账号模型。生产上线前建议在 Supabase Dashboard 单独配置并测试：

- 自定义 SMTP
- 注册确认邮件
- 忘记密码与重置密码回调地址
- 密码策略和泄露密码保护
- 注册/登录 rate limit 与 CAPTCHA

这些属于 Auth 项目配置，不在本次数据库结构迁移范围内。

### 14. 自动化测试和备份

建议将 `supabase/tests/pro_fit_mvp_test.sql` 接入 CI，并在每次迁移后运行：

- schema diff / migration replay
- RLS 角色矩阵测试
- Security Advisors
- Performance Advisors
- TypeScript 类型生成检查

生产环境还应根据套餐确认每日备份、恢复演练和是否需要 Point-in-Time Recovery。

## 本次明确未实施的项目

本文所有 P1、P2、P3 建议均未实施。线上只包含附件 MVP 结构和使其在 Supabase 中安全运行、完成当前业务闭环所必需的权限及触发器。
