> Status (2026-09-20): Recovery metrics and My Day persistence are available in local mode only. Cloud core data reloads after actions; there is no realtime subscription. Sample history is fictional. Use README.md and supabase/demo/README.md for current setup; treat the presentation below as talking points, not acceptance results.

# Pro-fit Demo Video Script

## 🎬 Demo Structure (5-7 minutes)

### 1. Introduction (30 seconds)
**Michael on camera:**
> "Hi, I'm Michael, a high school basketball player. During training season, I struggled to balance workouts, nutrition, recovery, and school. So I built Pro-fit - a coaching platform that helps student athletes train scientifically while managing their time and energy."

---

### 2. The Problem (30 seconds)
**Show/Explain:**
- Busy student athlete schedule
- Need for structured training plans
- Importance of recovery tracking
- Need for coach-athlete communication

---

### 3. Coach Perspective (2 minutes)

**Login as Ben (Coach)**
- Email: `demo-coach@pro-fit.app`
- Password: `ProFit2026!`
- Or click the quick login button: **Ben · Coach**

**Show these features:**

#### Coach Dashboard
- View all coachees (athletes you're coaching)
- See their activity status and compliance

#### Create Weekly Workout Plan
- Navigate to "Workout Assignment"
- Show the basketball-focused template:
  - Zone 2 cardio (45 min daily)
  - Mon: Push day
  - Wed: Legs & Core
  - Fri: Pull day
  - Tue & Sat: Basketball practice (75 min)
  - Thu & Sun: Active recovery
- Demonstrate editing exercises, sets, reps, weights
- Publish the plan

#### Review Check-ins
- View athlete's recovery data:
  - Sleep hours
  - Fatigue levels (1-10)
  - Muscle soreness locations
  - Pain tracking
  - Training feel
  - Zone 2 actual minutes
- See meal logs with photos
- Provide written feedback
- Mark as "reviewed"

**Key Message:** "As a coach, I can create personalized plans and monitor recovery to prevent overtraining."

---

### 4. Athlete Perspective (2-3 minutes)

**Login as Michael (Coachee)**
- Email: `demo-athlete@pro-fit.app`
- Password: `ProFit2026!`
- Or click: **Michael · Coachee**

**Show these features:**

#### Today's Training Tab
- View today's workout plan
- See exercises with:
  - Sets, reps, weights
  - Exercise instructions
  - Coach's notes about form and progression
- Check Zone 2 cardio target

#### Recovery Check-in
- Log sleep hours (e.g., 7.5 hours)
- Rate fatigue (1-10 scale)
- Mark muscle soreness:
  - Select body areas (legs, shoulders, etc.)
  - Rate severity (1-10)
- Track any pain (location + severity)
- Subjective training feel
- Log actual Zone 2 minutes
- Rate perceived exertion (RPE)

#### My Day Tab
- Daily time and energy planner
- Prioritize: School → Training → Recovery → Other
- See 14-day activity history

#### Meal Logging
- View meal plan from coach
- Upload food photos
- Track macros (protein, carbs, fats)
- See coach feedback

#### Activity History (14 days)
- Scroll through past workouts
- See coach feedback from previous sessions
- Track consistency over time

**Key Message:** "As an athlete, I can follow my plan, log honestly, and adjust based on how I'm actually feeling - not just push through."

---

### 5. The Science Behind It (1 minute)

**Explain the basketball-specific approach:**
- **Zone 2 Cardio**: Builds aerobic base without interfering with basketball performance
- **Push/Pull/Legs Split**: Balanced strength development for basketball movements
- **Recovery Tracking**: Prevents overtraining in growing athletes
- **Rest Days**: Thursday & Sunday - light cardio only, no heavy lifting
- **Basketball Integration**: Practice days (Tue/Sat) scheduled around strength work

**Show the workout details:**
- Progressive overload principles
- Talk test for Zone 2 monitoring
- "Reps in Reserve" approach for sustainable progression
- Recovery-based adjustments

---

### 6. Local Mode Demo Features (30 seconds)

**Point out:**
- "SAMPLE WORKSPACE" or "LOCAL WORKSPACE" banner at top
- Data saved in browser only
- Works offline
- No cloud sync in demo mode
- Quick login buttons for easy demo switching

---

### 7. Technical Implementation (1 minute)

**Briefly show/mention:**
- Built with React + Vite
- Clean, responsive design (works on phone)
- Local-first development (localStorage + IndexedDB)
- Supabase backend ready for production
- Photo storage for meal logging
- Role-based access (coach vs athlete views)

**Show responsiveness:** Resize browser or show on mobile

---

### 8. Impact & Next Steps (30 seconds)

**Michael on camera:**
> "This project taught me to identify real problems, design solutions, and ship working software. Next steps include:
> - Deploy to production with Supabase backend
> - Pilot with my basketball team
> - Gather feedback and iterate
> - Add analytics and progress tracking
> - Build team-wide features
> 
> Pro-fit isn't just a portfolio project - it's solving a real problem for student athletes like me."

---

## 📱 Demo Tips

### Recording Setup
- Use 1920×1080 resolution (or 1440×900)
- Keep browser at about 80% zoom for visibility
- Enable cursor highlighting in screen recording
- Use a clean browser profile (hide bookmarks bar)
- Pre-login to both accounts in separate browser windows

### Pacing
- Speak clearly and not too fast
- Pause briefly when switching screens
- Don't rush through features - show them working
- Demonstrate actual interactions (clicking, typing, selecting)

### What to Emphasize
- **Student-athlete problem** → Solution
- **Two-sided platform** (coach + athlete)
- **Recovery-first approach** (not just workouts)
- **Science-based** (Zone 2, progressive overload)
- **Real-world application** (your basketball team)

### Test Run Before Recording
1. Clear localStorage to start fresh: `localStorage.clear()` in console
2. Test both login flows
3. Create a workout plan as coach
4. Submit check-in as athlete
5. Verify all photos load
6. Check all navigation works

---

## 🎯 Key Differentiators to Highlight

1. **Built BY a student athlete FOR student athletes**
2. **Recovery and wellness tracking** (not just workouts)
3. **Coach feedback loop** (not just plan delivery)
4. **Basketball-specific programming**
5. **Time and energy management** (school integration)
6. **Science-based but practical** (talk test, RPE, RIR)
7. **Real problem, real solution, real pilot planned**

---

## 🚀 Optional: Show the Code (30 seconds)

If you want to show technical skills:
- Open VSCode briefly
- Show clean component structure
- Mention: React, state management, authentication
- Domain-driven design (training.js, dayPlanner.js)
- Don't spend too long here - focus on the product

---

## Sample Talking Points

### Opening Hook
"What if I told you that 80% of high school athletes are overtraining or undertraining because they don't track recovery?"

### Problem Statement
"As a basketball player, I was following generic workout plans that didn't account for my school schedule, game days, or how I actually felt."

### Solution
"Pro-fit combines evidence-based training with personalized coaching and honest recovery tracking."

### Technical Credibility
"I built this as a full-stack web application with React, implemented role-based authentication, designed a complete database schema, and created a deployment plan."

### Next Steps
"I'm preparing to pilot this with my basketball team and iterate based on real student-athlete feedback."

---

Good luck with the recording! 🏀🎥
