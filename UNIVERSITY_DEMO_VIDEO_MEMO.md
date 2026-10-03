# Pro-fit University Application Demo Video Memo

**Version:** 2026-10-03  
**Purpose:** Recording guide for a short university application video  
**Recommended length:** 5–6 minutes

## What the video should communicate

Pro-fit is a training workspace for student athletes and coaches. It connects a coach-assigned plan with the student’s real day: available time, school workload, energy, training logs, meals, check-ins, and coach feedback.

The video should show a real product journey rather than a list of screens:

1. A student athlete has a training plan but also has school and changing energy levels.
2. The athlete follows the plan, records what happened, and uses **My Day** to make the plan fit.
3. The coach reviews the information and uses it to plan the next action.

## Recording setup

- Use a clean browser window at 1440×900 or 1920×1080.
- Record the local app at `http://127.0.0.1:5173/` after the server has loaded.
- Use the existing demo accounts for **Michael · Coachee** and **Coach Ben · Coach**. Pre-login before recording, and never show email addresses, passwords, tokens, or private account details on screen.
- Keep the browser zoom at 90–100% and enable cursor highlighting.
- Record voice clearly. Add English captions if the application portal allows them.
- Use the current cloud-backed demo when available. If recording in local mode, describe it as a local demonstration and do not present browser-only data as production evidence.

## Before pressing Record

- Open the landing page and confirm the correct role name is visible after login.
- Let the first-login guide appear. It can be advanced with **Next**, dismissed with **Skip guide**, and reopened through **How it works**.
- Confirm that Michael can open **Today's Training**, **Weekly Plan**, **Training History**, and **My Day**.
- Confirm that the My Day page shows **Time available**, **School workload**, **Energy right now**, and **Save daily priorities**.
- Use existing demo records for the coach review. Do not submit Michael’s real check-in or create personal records during the recording unless the demo workspace has been reset for that purpose.
- Close unrelated tabs and notifications. Hide bookmarks and personal browser information.

## Recommended recording sequence

| Time | Screen action | Suggested narration | Evidence to show |
|---|---|---|---|
| 0:00–0:30 | Start with the Pro-fit title or landing page. | “I built Pro-fit to help student athletes connect training with the reality of school, recovery, and daily time constraints.” | Product name and the student-athlete problem. |
| 0:30–1:00 | Briefly introduce the two roles. | “A coach creates and reviews the plan. A student sees a clear next step, records what actually happened, and communicates back.” | Role-based workspace idea. |
| 1:00–1:20 | Log in as Michael and show the page guide. Advance one or two steps, then choose **Skip guide**. | “The first-login guide explains what each page does. It can be skipped and reopened later from How it works.” | Contextual guide, Next/Skip behavior, accessible help. |
| 1:20–2:00 | On **Today's Training**, show the workout, one **Exercise Guide**, the nutrition plan, and the check-in area. | “Michael starts with today’s coach-assigned plan. The page shows the session, movement guidance, meal ideas, and the place to send a daily check-in.” | Training details, exercise guidance, nutrition, check-in workflow. |
| 2:00–2:45 | Open **My Day**. Change the three selectors to a realistic example such as 30 minutes, a typical school day, and low energy. Click **Save daily priorities**. | “My Day lets the student describe the day before training. Pro-fit suggests a manageable approach without replacing the coach’s assigned plan.” | Time, school workload, energy, saved priorities, suggested approach. |
| 2:45–3:15 | Show **Training History** or the recent check-ins section on My Day. | “The student can return to recent check-ins and coach feedback, so progress is a conversation rather than a single completion checkbox.” | History and feedback context. |
| 3:15–4:20 | Log out and log in as Coach Ben. Show **Coachees**, the roster, and one existing review. | “The coach sees the assigned athletes and can review the information that came back from training. This supports a more specific next decision.” | Roster, plan status, check-in review, feedback. |
| 4:20–4:50 | Open **Workouts** or **Assign Plan** and briefly show the editable plan fields. Do not publish changes during the recording. | “The coach can shape a plan with dates, duration, exercises, sets, reps, rest, and instructions, then publish it when it is ready.” | Coach-side planning workflow. |
| 4:50–5:30 | End on either My Day or the coach roster. | “I built this as a working React and Supabase application. The project taught me to turn a real student-athlete problem into role-based workflows, data rules, and a product that can be tested locally and with two accounts.” | Personal ownership, implementation, and learning. |

## Short closing script

> Pro-fit is designed to help student athletes train consistently while staying honest about school, energy, and recovery. The coach creates the plan, the student follows and records it, and the next decision is based on the student’s actual day. I built this project to make that communication clearer and more practical.

## Accurate feature boundaries for the recording

- **My Day daily priorities are connected to the cloud database** in the current demo. The save flow, account isolation, and read-only behavior after check-in submission have been tested against the project database.
- **Sleep tracking is still shown as not connected in the cloud workspace.** Do not say that cloud sleep data is already fully persisted. You may describe sleep and recovery as planned or locally demonstrated capabilities.
- The product is a working demonstration. Do not claim university pilot results, injury reduction, medical outcomes, or measured user impact unless those results have actually been collected and documented.
- Present the training suggestions as planning support. They are not medical advice or a universal training prescription.
- Use demo identities and fictional/sample records only. Do not show a real student’s health information, photos, email address, or password.

## Submission package

Recommended filenames:

- `Michael_Pro-fit_University_Demo_2026.mp4`
- `Pro-fit_University_Demo_Video_Memo.pdf` or this Markdown memo

Before uploading the video, check that the first 10 seconds identify the project, the audio is understandable, the cursor does not cover important controls, and the final file opens without requiring access to the local development server.

## If the recording needs to be shorter

Use this three-minute cut:

1. 20 seconds: problem and purpose.
2. 45 seconds: Michael’s Today's Training page.
3. 45 seconds: My Day with the three selectors and Save daily priorities.
4. 45 seconds: Coach Ben’s roster and review.
5. 25 seconds: technical learning and closing statement.

