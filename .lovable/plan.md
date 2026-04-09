

# SkillNova AI — Premium Career OS Upgrade Plan

## Current State
The app has: cinematic scroll intro (10 sections), auth system, dashboard with 7 tabs (Overview, Analyze, Mentor, Resume ATS, Simulator, History, Compare), Supabase backend with profiles + analysis_history tables, 4 edge functions.

## What This Plan Delivers
A phased visual and feature upgrade that transforms the existing app into a premium, startup-grade product — without removing anything.

---

## Phase 1: Visual Foundation & Hero Redesign

**Goal**: Upgrade the design system and hero to match the premium spec.

### 1A. Design System Update
- Update CSS variables: background to `#050507`, add cyan `#22D3EE` as a new accent
- Add new keyframes: `shimmer`, `glow-pulse`, `grid-move` for background grid animation
- Add utility classes: `.card-shine` (hover shine effect), `.hover-lift` (translateY + shadow on hover)
- Update `tailwind.config.ts` with new animations and color tokens

### 1B. Hero Section Overhaul
- Replace centered text layout with **left-aligned text + right floating UI preview**
- Left side: Sequenced reveal — "Your career is not random." → pause → "It's just unoptimized." → "SkillNova AI" title → "Your Personal Career OS" subtitle → "Enter System" CTA button with neon pulse
- Right side: Three floating glassmorphism preview cards (circular progress 72%, mini chat bubble, stat card) with `animate-float` at staggered delays
- Background: Animated gradient blobs (CSS) + enhanced ParticleField with connection lines between nearby particles
- Fixed top nav: glass blur background strip

### 1C. Background System
- Create `AnimatedBackground` component: subtle CSS grid overlay + moving gradient glow orbs (2-3 radial gradients with slow CSS animation)
- Apply to dashboard and intro sections

---

## Phase 2: Dashboard Transformation

**Goal**: Turn the dashboard into a premium SaaS control panel.

### 2A. Sidebar Upgrade
- Replace emoji icons with Lucide React icons (Home, Brain, Bot, FileText, Telescope, Clock, GitCompare, Gamepad2, TrendingUp, Code2, Mic)
- Add glowing active indicator bar (left border glow)
- Add XP bar + level display at the top of sidebar
- Add streak counter with fire icon
- Mobile: hamburger menu trigger that slides sidebar in from left

### 2B. Top Bar
- Add a persistent top bar in dashboard showing: user avatar/initials, display name, XP progress, streak count
- Banner: "Optimized for YOU using AI" — subtle gradient text, dismissible

### 2C. Overview Panel Upgrade
- Add animated circular progress ring (SVG-based) for readiness score instead of flat progress bar
- Count-up animation for numbers (total analyses, roles explored)
- Add "Your Next Best Step" card pulling from latest analysis
- Add motivational insight: "You're ahead of X% of learners"

---

## Phase 3: New Features (3 panels)

### 3A. Mock Interview Panel
- New dashboard tab "Interview"
- UI: Question card (glass style) → text input for answer → Submit
- Edge function `mock-interview`: sends question + answer to Gemini, returns confidence score (0-100), clarity score, feedback, improvement tips
- Display: animated score meters, feedback cards with severity badges
- Pre-loaded question bank by role category

### 3B. Project Generator Panel
- New dashboard tab "Projects"
- UI: Domain selector (AI/ML, Web Dev, Data Science, Mobile, DevOps) → "Generate Project" button
- Edge function `generate-project`: returns project idea, tech stack, difficulty, 5-step plan, estimated time
- Display: expandable glass cards, "Regenerate" button with spin animation

### 3C. Gamification System
- Create `gamification` DB table: `user_id`, `xp`, `level`, `streak_days`, `last_active`, `badges` (jsonb)
- XP rules: +50 for analysis, +30 for comparison, +20 for simulator run, +10 for mentor chat
- Levels: Beginner (0-200), Intermediate (200-500), Pro (500-1000), Expert (1000+)
- Migration trigger: auto-create gamification row on profile creation
- Update each panel to call an `add_xp` RPC after successful AI operations
- Gamification widget in sidebar showing XP bar + level badge
- Toast: "You gained +50 XP!"

---

## Phase 4: Micro-Interactions & Polish

### 4A. Interaction Upgrades
- All glass cards: add `hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(124,58,237,0.15)]` transition
- Buttons: add ripple effect via a small motion wrapper
- Score numbers: implement count-up animation using `useEffect` + `requestAnimationFrame`
- Loading states: replace simple dots with branded skeleton pulses

### 4B. Scroll Animations
- Wrap all dashboard section entries with `motion.div` using `whileInView` for staggered fade-in
- Add intersection observer-based reveals for intro page sections (already partially done, enhance timing)

---

## Technical Summary

| Item | Type | Files |
|------|------|-------|
| Design system | CSS + Tailwind | `src/index.css`, `tailwind.config.ts` |
| Hero redesign | Component | `HeroSection.tsx`, `ParticleField.tsx` |
| Background system | New component | `AnimatedBackground.tsx` |
| Sidebar upgrade | Component edit | `DashboardSidebar.tsx` |
| Top bar | New component | `DashboardTopBar.tsx` |
| Overview upgrade | Component edit | `OverviewPanel.tsx` |
| Mock Interview | New panel + edge fn | `InterviewPanel.tsx`, `mock-interview/index.ts` |
| Project Generator | New panel + edge fn | `ProjectPanel.tsx`, `generate-project/index.ts` |
| Gamification | DB + component | Migration, `GamificationWidget.tsx`, RPC function |
| Dashboard routing | Edit | `Dashboard.tsx` |
| Micro-interactions | Cross-cutting | Multiple component edits |

### Database Changes
1. New `gamification` table with RLS (user can read/update own row)
2. New `add_xp` database function (security definer)
3. Trigger on profiles to auto-create gamification row

### New Edge Functions
- `mock-interview` — AI interview feedback
- `generate-project` — AI project idea generation

### Implementation Order
Phase 1 → Phase 2 → Phase 3 → Phase 4 (each phase builds on the previous)

This plan preserves all existing features and enhances them. No rebuilds, only upgrades.

