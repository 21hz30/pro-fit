> Status (2026-09-20): Recovery metrics and My Day persistence are available in local mode only. Cloud core data reloads after actions; there is no realtime subscription. Sample history is fictional. Use README.md and supabase/demo/README.md for current setup; treat the presentation below as talking points, not acceptance results.

# Pro-fit Demo Guide

## Overview
Pro-fit is a web application designed to help high school athletes (like Michael) work with their coaches (like Ben) to manage training, nutrition, and recovery. The demo shows how student athletes can balance sports training with school life while getting professional guidance from their coaches.

## Why This Project Matters

### The Problem
High school athletes face challenges:
- **Overtraining without guidance** - Many students push too hard without understanding recovery
- **No structured plans** - Random workouts without progression or balance
- **Poor communication with coaches** - Coaches can't see what athletes do outside practice
- **Ignoring recovery** - Athletes don't track sleep, fatigue, or soreness
- **Nutrition confusion** - Students don't know what or when to eat around training

### The Solution
Pro-fit provides:
- **Structured Training Plans** - Coach Ben creates weekly workout plans with progressive exercises
- **Real-time Check-ins** - Michael logs workouts, meals, sleep, and recovery daily
- **Coach Feedback** - Ben reviews Michael's logs and provides personalized guidance
- **Video Exercise Library** - Every exercise has a YouTube link for proper form
- **Recovery Monitoring** - Tracks sleep, fatigue, soreness to prevent overtraining
- **School-Life Balance** - Plans are flexible and adapt to homework, exams, and busy schedules

## Demo Data Structure

### Accounts
- **Coach Ben**: demo-coach@pro-fit.app (password: ProFit2026!)
- **Athlete Michael**: demo-athlete@pro-fit.app (password: ProFit2026!)

### What's in the Database

#### 1. Exercise Library (15 exercises with YouTube links)
**Strength Training:**
- Dumbbell Bench Press / Push-Up - https://www.youtube.com/watch?v=iA6xEQ31jGI&t=255s
- Half-Kneeling Single-Arm Press - https://www.youtube.com/watch?v=d3CRIDSCOhw
- Cable Triceps Pressdown - https://www.youtube.com/watch?v=2cdIRe5tcqI
- Goblet Squat - https://www.youtube.com/watch?v=gCESNsDsbqk
- Dumbbell Romanian Deadlift - https://www.youtube.com/watch?v=xAL7lHwj30E
- Split Squat - https://www.youtube.com/watch?v=la0pLPq-3A8
- Dead Bug - https://www.youtube.com/watch?v=GbSC02oU3To
- Chest-Supported Dumbbell Row - https://www.youtube.com/watch?v=9zkP4Cd_cz0
- Lat Pulldown - https://www.youtube.com/watch?v=_97pmOC2tzE
- Resistance Band Face Pull - https://www.youtube.com/watch?v=JBpj9-3tP0c

**Cardio & Recovery:**
- Zone 2 Cardio (cycling/walking) - https://www.youtube.com/watch?v=L5J6sgQLvuE
- Dynamic Warm-Up - https://www.youtube.com/watch?v=1e528F0pYPg
- Easy Movement & Mobility - for recovery days
- Basketball A · Skills & Footwork - ball handling, shooting drills
- Basketball B · Team Play & Scrimmage - team tactics, controlled scrimmage

#### 2. Workout Plans (5 weeks)
- **Past 2 weeks** - shows Michael's training history
- **Current week** - TODAY's workout is visible
- **Next 2 weeks** - shows upcoming training schedule

**Weekly Structure (7 days):**
- Monday: Push (Upper Body) - Bench press, overhead press, triceps
- Tuesday: Basketball Skills & Footwork - Ball handling, shooting practice
- Wednesday: Legs & Core - Squats, deadlifts, split squats, core work
- Thursday: Cardio & Recovery - Zone 2 cardio, mobility work
- Friday: Pull (Upper Body) - Rows, pulldowns, face pulls
- Saturday: Basketball Team Play - Scrimmage, team tactics
- Sunday: Cardio & Recovery - Light cardio, rest day

Each workout includes:
- Zone 2 Cardio (45 min)
- Dynamic warm-up (8 min)
- Strength exercises (2 sets × 8-12 reps)
- Rest periods (90 seconds between sets)

#### 3. Check-ins (~12 past days)
Michael has logged:
- **Workout completion** - "Completed as planned" or "Shortened the plan to fit the day"
- **Recovery data**:
  - Sleep: 7.5-8 hours (some nights 6.5 hours with homework)
  - Fatigue level: 2/5 (normal) or 4/5 (tired from exams)
  - Soreness: Legs (level 3) on some days
  - Zone 2 cardio: 15-20 minutes
- **Meal logs** - Rice bowls, burritos, fruits
- **Coach feedback** - Ben's personalized responses

**Sample Check-in:**
```
Date: September 15
Sleep: 6.5 hours
Fatigue: 4/5
Notes: "A lot of homework tonight. I chose a shorter session and an earlier bedtime."
Workout: Completed (20 min instead of 40 min)
Meal: Rice bowl with chicken, vegetables, and fruit
Coach feedback: "Good call adapting to your workload. Prioritize sleep tonight."
```

#### 4. Diet Plans (35 days)
Daily meal suggestions:
- **Breakfast**: Oatmeal, yogurt & berries
- **Lunch**: Chicken or tofu rice bowl
- **Snack**: Banana & nut butter
- **Dinner**: Pasta, beans & vegetables

*Note: "Flexible meal ideas, not a calorie prescription. Adjust portions to hunger, activity, and allergies."*

## How to Present the Demo

### Part 1: The Problem (1 minute)
"As a high school basketball player, I struggled with:
- Not knowing if I was training too much or too little
- Random workouts without structure
- My coach couldn't see what I did outside practice
- I ignored signs of fatigue and got injured
- I didn't know how to eat properly around training"

### Part 2: The Solution - Michael's View (2 minutes)

**Login as Michael (demo-athlete@pro-fit.app)**

1. **Today's Workout Dashboard**
   - "Here's my workout for today - my coach Ben assigned it"
   - Click on any exercise → Show YouTube video link
   - "Every exercise has a video so I learn proper form"
   - Show estimated duration: 90 minutes (45 min cardio + exercises)

2. **Daily Check-in**
   - "After training, I log what I did"
   - Show workout log: status (completed/skipped), actual duration, notes
   - Show recovery tracking: sleep hours, fatigue level, soreness
   - Show meal log: what I ate, with photo option
   - "This helps my coach see if I'm overtraining or need rest"

3. **Coach Feedback**
   - "My coach reviews my check-ins and gives feedback"
   - Show example: "Good call adapting to your workload. Prioritize sleep tonight."

### Part 3: The Solution - Coach's View (2 minutes)

**Login as Coach Ben (demo-coach@pro-fit.app)**

1. **Coachee Roster**
   - "I can see all my athletes in one place"
   - Show Michael's status: submitted check-ins, workout completion
   - "I see who needs my attention - red flags for poor recovery"

2. **Review Check-ins**
   - Click "Review" on Michael's check-in
   - Show recovery summary: sleep, fatigue, soreness
   - Show workout logs: what he completed, how long it took
   - Show meal logs: what he ate
   - "I can see the full picture - not just what happens at practice"

3. **Provide Feedback**
   - Click feedback box
   - Type: "Great work staying consistent. Let's adjust your volume next week."
   - Submit feedback → Michael sees it immediately

4. **Create Workout Plans**
   - Click "Basketball Week" or "Assign Workout"
   - Show exercise library (15 exercises with videos)
   - Show how to build a weekly plan:
     - Select exercises
     - Set reps, sets, rest periods
     - Add cardio and recovery days
   - Publish → Michael sees it on his dashboard

### Part 4: The Impact (1 minute)

"Pro-fit helps student athletes like me:
- **Train smarter, not harder** - Structured plans with recovery built in
- **Prevent injuries** - Coach sees early warning signs (poor sleep, high fatigue)
- **Balance school and sports** - Flexible plans that adapt to exams and homework
- **Learn proper technique** - Video library for every exercise
- **Stay accountable** - Daily check-ins create consistency
- **Get personalized guidance** - Coach feedback based on my actual data"

## Key Features to Highlight

### For Athletes (Students)
✅ See today's workout with exercise videos
✅ Log workouts, meals, sleep, and recovery
✅ Get personalized coach feedback
✅ Track training streak
✅ Flexible plans that respect school commitments

### For Coaches
✅ Create structured weekly training plans
✅ Comprehensive exercise library with YouTube videos
✅ Monitor all athletes in one dashboard
✅ See red flags (poor recovery, overtraining)
✅ Provide timely feedback
✅ Track compliance and progress

## Technical Highlights

### Architecture
- **Frontend**: React with Vite
- **Backend**: Supabase (PostgreSQL database)
- **Authentication**: Supabase Auth with quick demo login buttons
- **Storage**: Supabase Storage for meal photos
- **Video Integration**: YouTube embedded links

### Data Structure
- **12 business tables**: profiles, exercises, workout_plans, workout_days, workout_items, daily_checkins, workout_checkins, diet_plans, diet_meals, diet_logs, coach_feedback, coach_trainees
- **Row Level Security (RLS)**: Athletes only see their data, coaches see their assigned athletes
- **Real-time updates**: Saved changes appear on the next load; no realtime subscription

### Demo Data Quality
- **Realistic patterns**: Check-ins show varied sleep, some fatigue from exams
- **Progressive training**: 3-day strength split (Push/Legs/Pull) + 2 basketball days
- **Coach-athlete relationship**: Ben provides thoughtful feedback based on Michael's logs
- **Complete exercise library**: Every strength exercise has a YouTube tutorial

## Questions to Anticipate

**Q: Why not just use Google Sheets or a notebook?**
A: Pro-fit provides:
- Structured check-ins with recovery metrics coaches need
- Video library for proper form
- Real-time coach feedback
- Automatic tracking of streaks and patterns
- Prevents data from getting lost or forgotten

**Q: How is this different from fitness apps like MyFitnessPal?**
A: Pro-fit is designed for student athletes with coaches:
- Coach assigns the plan (not generic programs)
- Recovery tracking (sleep, fatigue, soreness)
- Two-way communication (athlete logs → coach reviews → feedback)
- School-life balance (plans adapt to exams, homework)
- Sport-specific training (basketball drills, team practice)

**Q: What if students don't have a coach?**
A: The app is designed for the coach-athlete relationship, but students could:
- Self-assign workouts using the exercise library
- Track their own progress
- Use the recovery metrics to self-regulate training

**Q: How do you prevent overtraining?**
A: Multiple layers:
- Daily recovery tracking (sleep, fatigue, soreness)
- Coach reviews and provides guidance
- Built-in rest days in every weekly plan
- Flexible structure that respects school commitments
- Visual warnings when athletes report high fatigue or poor sleep

## Future Enhancements (If Asked)

- **Team dashboard**: Coaches see aggregate data for their whole team
- **Progress charts**: Track strength improvements, volume, consistency over time
- **Mobile app**: Easier check-ins on-the-go
- **Calendar integration**: Sync with school calendar for exams, game days
- **Parent access**: Read-only view for parents to see training compliance
- **Injury tracking**: Log injuries and rehab progress
- **Competition prep**: Special plans for pre-game weeks

---

## Final Demo Tips

1. **Start with the problem** - Make it personal and relatable
2. **Show both sides** - Michael's view first (athlete perspective), then Ben's view (coach control)
3. **Click through live** - Don't just talk about features, show them working
4. **Highlight YouTube integration** - Click an exercise video to show it works
5. **Show real data patterns** - Point out when Michael had homework and adjusted his training
6. **End with impact** - How this helps students train smarter and stay healthy

Good luck with your demo! 🏀💪
