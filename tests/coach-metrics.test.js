import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCoachMetrics } from '../src/domain/coachMetrics.js';

test('weekly metrics join logs to dates, ignore missing nutrition, and use actual response time', () => {
  const summary = {
    checkins: [
      {daily_checkin_id:1, trainee_id:'a',checkin_date:'2026-09-13',wellness:{fatigue:5}},
      {daily_checkin_id:2, trainee_id:'a',checkin_date:'2026-09-14',wellness:{fatigue:5}},
      {daily_checkin_id:3, trainee_id:'a',checkin_date:'2026-09-20',status:'reviewed',submitted_at:'2026-09-20T10:00:00Z',reviewed_at:'2026-09-20T12:30:00Z',wellness:{sleepHours:8,fatigue:2}},
      {daily_checkin_id:4, trainee_id:'b',checkin_date:'2026-09-21',wellness:{fatigue:5}},
    ],
    workoutLogs: [{daily_checkin_id:1,status:'completed'}, {daily_checkin_id:2,status:'skipped'}, {daily_checkin_id:3,status:'completed'}, {daily_checkin_id:4,status:'completed'}],
    dietLogs: [{daily_checkin_id:1,actual_calories:null},{daily_checkin_id:3,actual_calories:600,actual_protein_g:30,photo_path:'photo'}],
  };
  const result = calculateCoachMetrics(summary,'2026-09-20');
  assert.equal(result.recentCompletionRate,50);
  assert.equal(result.recentCheckins.length,2);
  assert.equal(result.recentMeals.length,1);
  assert.equal(result.activeCount,1);
  assert.equal(result.recoveryAlerts.length,0);
  assert.equal(result.avgResponseHours,2.5);
  assert.equal(result.avgCaloriesPerLog,600);
  assert.equal(result.photoCount,1);
});

test('empty metrics report missing observations rather than invented zeros', () => {
  const result = calculateCoachMetrics({checkins:[],workoutLogs:[],dietLogs:[]},'2026-09-20');
  assert.equal(result.avgResponseHours,null);
  assert.equal(result.avgCaloriesPerLog,null);
  assert.equal(result.recentCompletionRate,null);
  assert.equal(result.wellnessRows.length,0);
});
