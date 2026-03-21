# Shift Coach

**The only health app built specifically for shift workers.**

Shift Coach helps shift workers manage their health and wellbeing by tracking sleep, nutrition, activity, and recovery patterns that adapt to rotating schedules, night shifts, and irregular work hours.

## 🎯 Core Features

### Sleep & Recovery
- **Shift-Aware Sleep Tracking** - Log sleep sessions with automatic classification (Main Sleep, Post-Shift Recovery, Pre-Shift Nap, etc.)
- **Sleep Prediction** - AI-powered suggestions for optimal sleep times based on your shift schedule
- **Sleep Deficit Tracking** - Monitor accumulated sleep debt and recovery needs
- **Circadian Rhythm Analysis** - Track your body clock alignment with shift patterns
- **Shift Lag Detection** - Identify and manage circadian misalignment

### Nutrition & Meal Timing
- **Shift-Adjusted Calories** - Personalized calorie targets that adapt to your shift type and activity level
- **Macro Recommendations** - Protein, carbs, and fat targets optimized for shift work
- **Meal Timing Advice** - Suggestions for when to eat based on your shift schedule and biological night
- **Binge Risk Assessment** - Identify high-risk periods for overeating during shift transitions

### Activity & Movement
- **Step Tracking** - Monitor daily activity with shift-appropriate goals
- **Activity Level Logging** - Track shift intensity (very light, light, moderate, busy, intense)
- **Recovery Recommendations** - Activity suggestions based on sleep, shift type, and recovery status

### Shift Management
- **Rota Planning** - Set up shift patterns and schedules
- **Shift Rhythm Score** - Body Clock Score (0-100) measuring how well you're adapting to your schedule
- **Social Jetlag Tracking** - Monitor circadian disruption from shift changes

### AI Coach
- **Adaptive Coaching** - Personalized advice that adjusts based on your current state (RED/AMBER/GREEN)
- **Shift-Specific Guidance** - Recommendations tailored to night shifts, rotating schedules, and recovery needs
- **Non-Judgmental Support** - Empathetic coaching that understands the challenges of shift work

### Mood & Wellbeing
- **Mood & Focus Tracking** - Daily check-ins to monitor mental wellbeing
- **Progress Insights** - Weekly summaries of sleep, nutrition, activity, and recovery patterns

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shiftcoach
   ```

   Mobile + Wear workflow: see **[docs/GOLDEN_PATH_MOBILE.md](docs/GOLDEN_PATH_MOBILE.md)**.

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase (Required)
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   
   # OpenAI (Required for AI Coach)
   OPENAI_API_KEY=your-openai-api-key
   
   # Optional
   NEXT_PUBLIC_DEV_USER_ID=your-dev-user-id  # For development
   CRON_SECRET_KEY=your-cron-secret  # For scheduled tasks
   WEEKLY_SUMMARY_SECRET=your-weekly-summary-secret  # For weekly summaries
   ```

4. **Set up the database**
   
   Run the SQL migrations in `supabase/migrations/` in your Supabase SQL Editor, in order.

5. **Run the development server**
```bash
npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
shiftcali/
├── app/                    # Next.js app directory
│   ├── (app)/             # Main app routes
│   │   ├── dashboard/     # Dashboard pages
│   │   ├── sleep/         # Sleep tracking
│   │   ├── rota/          # Shift scheduling
│   │   ├── coach/         # AI Coach
│   │   └── ...
│   ├── api/               # API routes
│   └── auth/              # Authentication
├── components/            # React components
│   ├── dashboard/         # Dashboard components
│   ├── sleep/             # Sleep components
│   └── ...
├── lib/                   # Core libraries
│   ├── sleep/             # Sleep calculations
│   ├── nutrition/         # Nutrition calculations
│   ├── circadian/         # Circadian rhythm
│   ├── coach/             # AI Coach logic
│   └── ...
└── supabase/
    └── migrations/        # Database migrations
```

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-4
- **UI**: React 19, Framer Motion

## 🎨 Design Philosophy

Shift Coach is designed with shift workers in mind:

- **Non-Judgmental**: Never shames users for missed goals or irregular patterns
- **Adaptive**: Adjusts recommendations based on current state (RED/AMBER/GREEN)
- **Shift-Aware**: All features consider shift patterns, circadian rhythms, and recovery needs
- **Practical**: Focuses on actionable, realistic advice for shift work challenges
- **Empathetic**: Understands that shift work is hard and celebrates small wins

## 📚 Key Concepts

### Body Clock Score (Shift Rhythm Score)
A 0-100 score measuring how well you're adapting to your shift schedule. Factors include:
- Sleep quality and consistency
- Shift pattern regularity
- Recovery between shifts
- Circadian alignment

### Shift Lag
A measure of circadian misalignment caused by shift changes. Higher scores indicate more disruption.

### Biological Night
Your body's natural sleep window (typically 11 PM - 7 AM). Eating or being active during this time can disrupt circadian rhythms.

### Shift-Adjusted Nutrition
Calorie and macro targets that adapt based on:
- Shift type (day/night/off)
- Activity level during shift
- Sleep quality and recovery status
- Personal goals (lose/maintain/gain weight)

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

- TypeScript strict mode enabled
- ESLint with Next.js config
- Prefer functional components with hooks
- Mobile-first responsive design

## 📝 Documentation

- `SETTINGS_REDESIGN_PLAN.md` - Settings page implementation plan
- `SHIFT_WORKER_SLEEP_SYSTEM.md` - Sleep tracking system documentation
- `GOAL_CHANGE_PLAN.md` - Nutrition goal change implementation
- `FOOD_DATABASE_SETUP.md` - Food database setup (legacy, not used)

## 🤝 Contributing

This is a private project, but contributions are welcome. Please ensure all changes maintain the shift worker-focused, empathetic approach.

## 📄 License

Private - All rights reserved

## 🙏 Acknowledgments

Built with empathy for shift workers everywhere. Your health matters, even when your schedule doesn't.
