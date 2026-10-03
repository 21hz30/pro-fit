export function getWorkspaceGuideSteps(role, isLocal) {
  if (role === 'coach') return [
    { route: 'coach', target: 'coach-overview', title: 'See who needs your support', text: 'These cards summarize your coachees, workout logs, pending reviews, and recovery alerts. Use them to decide where to start.' },
    { route: 'coach', target: 'coach-roster', title: 'Choose a coachee and an action', text: 'Each row shows a coachee’s plan and latest check-in. Assign opens their workout plan, Nutrition opens meal planning, and Review opens their submitted check-in.' },
    { route: 'coach', target: 'coach-activity', title: 'Review updates and leave feedback', text: 'Recent Activity lists submitted check-ins. Use Review to read training notes and meal logs, then send feedback the coachee can see.' },
    { route: 'workout', target: 'workout-template', title: 'Start with a training template', text: 'Load the basketball template to build a week, or create next week. Review the dates and exercises before publishing.' },
    { route: 'workout', target: 'workout-details', title: 'Make the plan specific', text: 'Choose the coachee, name the plan, and set its dates and goal. Below this section, you can adjust each day, exercise, duration, and instruction.' },
    { route: 'workout', target: 'plan-publish', title: 'Save privately, then publish', text: 'Save Draft keeps your work for later. When you have reviewed the dates, exercises, and instructions, Publish Plan makes the workout visible to the selected coachee.' },
    { route: 'diet', target: 'nutrition-targets', title: 'Plan meals for the right day', text: 'Choose a coachee and date here. Add meal ideas and coach notes on this page, then use Publish Plan to share them. Nutrition targets are optional.' },
    { route: 'schedule', target: 'coach-schedule', title: 'Check the published week', text: 'Choose a coachee, move between weeks, and select a day to see its sessions. Assign / Edit Workout takes you back to planning.' },
    { route: 'coach', target: 'workspace-help', title: 'Help for the page you are on', text: 'Use How it works for a guided reminder of the current page. You can skip at any point and start using Pro-fit. The full guide appears when you log in again.' },
  ];
  return [
    { route: 'trainee', target: 'trainee-tabs', title: 'Find your way around Pro-fit', text: 'Today’s Training is your daily plan. Weekly Plan shows upcoming sessions, Training History holds past check-ins and feedback, and My Day brings your daily context together.' },
    { route: 'trainee', target: 'training-workout', title: 'Follow your coach’s workout', text: 'Read the exercises, sets, reps, and instructions here. Exercise Guide explains a movement; Log Workout records what you actually completed. If no workout is scheduled, your coach’s next published plan will appear here.' },
    { route: 'trainee', target: 'training-nutrition', title: 'See your meals and log what you ate', text: 'Find your coach’s meal ideas and notes here. Log a Meal lets you add food and an optional photo. Open Nutrition totals if you want to view the numbers.' },
    { route: 'trainee', target: 'training-checkin', title: 'Send your day to your coach', text: isLocal ? 'Save your recovery check-in first, log training and meals, then add a note here. Submit Daily Check-in sends your entries for review and makes this day read-only.' : 'After logging your workout and meals, add any questions or notes here. Submit Daily Check-in sends your entries to your coach for review and makes this day read-only.' },
    { route: 'trainee/week', target: 'trainee-week', title: 'Look ahead at your week', text: 'See the date, session, and estimated time for each assigned day. View Details opens that day’s workout; future dates are for preview only.' },
    { route: 'trainee/history', target: 'trainee-history', title: 'Look back and read feedback', text: 'Your recent check-ins show completed workouts, notes, and coach feedback. View check-in opens the full record for that date.' },
    { route: 'day', target: 'trainee-day', title: 'Review your day', text: 'Review your recent check-ins and coach feedback here. When daily planning is connected, choose your time, school workload, and energy, then Save daily priorities. Open Today’s Training to follow your assigned plan.' },
    { route: 'trainee', target: 'workspace-help', title: 'Your guide is always here', text: 'Use How it works for a guided reminder of the current page. You can skip at any point and explore at your own pace. The full guide appears when you log in again.' },
  ];
}
