# Professional Test Portal — Phase Completion Roadmap (`phase.md`)

This document outlines the systematic implementation roadmap for building the modern, mobile-and-desktop-friendly Test Portal. Each phase contains clear deliverables, technical milestones, and completion checkboxes `[ ]` / `[x]` to maintain transparent project tracking.

---

## Progress Overview Dashboard

| Phase | Description | Status | Progress |
| :--- | :--- | :---: | :---: |
| **Phase 1** | Foundations, Types, Design System & Storage Engine | Completed | 100% |
| **Phase 2** | Portal Landing & Role Authentication (Centered Hero, Bcrypt) | Completed | 100% |
| **Phase 3** | Assessment Catalog & Test Briefing / Instructions View | Pending | 0% |
| **Phase 4** | Interactive Exam Engine (Palette, Timer, Autosave) | Pending | 0% |
| **Phase 5** | Submission Evaluation, Scorecards & Detailed Analytics | Pending | 0% |
| **Phase 6** | Polish, Accessibility, Mobile UX & Production Audit | Pending | 0% |

---

## Phase 1: Foundations, Architecture & Design System

> **Objective**: Establish the core architectural types, theme variables, robust mock database, local persistence engine, and atomic UI components required across the entire platform.

- [x] **1.1 Standards & Protocols Formulation**
  - [x] Create comprehensive `rules.md` governing UI, UX, Frontend, Backend, butter-smooth scrolling, and Clean Code conventions.
  - [x] Create `phase.md` roadmap with granular tracking deliverables.
- [x] **1.2 Core Data Models & TypeScript Contracts**
  - [x] Define `types/auth.ts` for User roles, credentials, sessions, and bcrypt token models.
  - [x] Define `types/exam.ts` with schemas for `Test`, `Section`, `Question`, `Option`, `CandidateResponse`, `ExamSessionState`, and `TestResult`.
- [x] **1.3 Design System & Theme Foundation**
  - [x] Set up color palette tokens in `globals.css` (butter-smooth scrolling, design tokens, slate canvas).
  - [x] Build reusable UI primitives in `components/ui/`:
    - [x] `Button.tsx` (accessible, multi-variant, 48px touch targets).
    - [x] `Badge.tsx` (dot indicators and status colors).
    - [x] `Input.tsx` (labeled, error state, icon slots, show/hide password).
    - [x] `Card.tsx` (bordered, elevated, interactive variants).
    - [x] `Icons.tsx` (zero-dependency SVG icon system).
- [x] **1.4 Persistence & Authentication Engine**
  - [x] Build `lib/auth.ts` providing real bcrypt password hashing, credential validation, pseudo-JWT session tokens, localStorage persistence, and admin student provisioning.

---

## Phase 2: Portal Landing, Student Dashboard & Performance Engine

> **Objective**: Deliver a clean, professional landing experience and an animated Student Performance Dashboard where authenticated candidates can track mastery, view tests taken, inspect question solutions, and launch retakes.

- [x] **2.1 Portal Header & Navigation Bar**
  - [x] Responsive floating navigation with portal branding, candidate badge, role indicator, and view toggling (`Landing View` / `My Dashboard`).
  - [x] Bcrypt token authentication and automatic session transition.
- [x] **2.2 Student Performance Dashboard**
  - [x] Animated aggregate score radial ring (with gradient fill, circular percentage gauge, and distinction ratings).
  - [x] 4 Key performance cards with vibrant top borders: Tests Taken count, Marks Scored vs Total, Precision Accuracy %, and Total Time Spent.
  - [x] Topic Proficiency Spectrum with animated progress bars (Algorithms, Systems, Architecture, General Reasoning).
- [x] **2.3 Structured Tests Taken List & Stacked Actions**
  - [x] Structured test cards showing Topic, Assessment Title, Marks Scored vs Total, Percentage badge, Duration of test, and Date taken.
  - [x] Stacked format action buttons on the right: `Retake` (top) and `Show my response` (bottom).
  - [x] `View All` toggle button to expand complete history or collapse to preview.
  - [x] Category dropdown filter and live search query input.
- [x] **2.4 Interactive Response Review Modal (`StudentResponseModal`)**
  - [x] Question-by-question breakdown showing candidate choices vs correct answers.
  - [x] Colored status badges (Correct `+4`, Incorrect `-1`, Skipped `0`).
  - [x] Filter tabs: All Questions, Correct, Incorrect / Skipped.
  - [x] Step-by-step solution explanations with code snippets.
- [x] **2.5 Test Briefing & Retake Engine (`TestBriefingModal`)**
  - [x] Test parameters summary (Duration, MCQs, Total Marks, Passing Marks).
  - [x] Marking scheme rules (+4/-1) and tab-switching proctoring policy notice.
  - [x] Mandatory confirmation checkbox before launching exam session.
- [x] **2.6 Modern Design System & Typography**
  - [x] Upgraded typography to Google Fonts `Plus Jakarta Sans` (body and display) and `JetBrains Mono` (code, scores, tags).

---

## Phase 3: Interactive Exam Engine & Convex Backend (Core Candidate Experience)

> **Objective**: Deliver a secure, time-bound online test-taking environment in Next.js 15, powered by Convex as the reactive database, Zustand for local UI state, Tailwind for styling, server-authoritative timing, debounced autosave, and proctoring safeguards.

- [x] **3.1 Distraction-Free Exam Shell Layout**
  - [x] Full-screen exam shell without portal headers or distracting links.
  - [x] Top persistent bar: Test title, candidate identifier, server-synchronized countdown timer, autosave sync badge, and "Submit Test" button.
  - [x] Timer alert transitions:
    - [x] Normal state (> 5 mins remaining).
    - [x] Warning state (< 5 mins, subtle amber highlight).
    - [x] Critical state (< 1 min, pulsing red highlight).
- [x] **3.2 Server-Authoritative Timing via Convex Reactivity**
  - [x] Immutable `startedAt` and `durationSeconds` on Attempt document.
  - [x] Client-side derived timer updating every second without redundant DB queries.
  - [x] Convex scheduled function (`ctx.scheduler.runAfter`) firing at `durationSeconds` for true background auto-submit.
  - [x] Reactive freeze: UI locks immediately when attempt flips to `SUBMITTED`.
- [x] **3.3 Anti-Refresh & Navigation Guards**
  - [x] Native `beforeunload` confirmation prompt on window close, refresh, or back navigation.
  - [x] Tab switch / window blur detection: Non-blocking on-screen warning toast with audit logging via Convex `logTabSwitch` mutation.
  - [x] Resume safety net: Seamlessly rehydrates session, elapsed time, and answers upon refresh/reopen with "Welcome back" alert.
- [x] **3.4 Answer Persistence & Debounced Autosave**
  - [x] Instant optimistic update in Zustand store for zero-latency option selection.
  - [x] Debounced (600ms) Convex mutation `saveAnswer` with compound index `by_attempt_question` upsert.
  - [x] Automatic rehydration on mount via `getAttemptAnswers`.
- [x] **3.5 Offline & Flaky Connection Handling**
  - [x] Network connection event listeners exposing online/offline status.
  - [x] Persistent amber warning banner: "You're offline — answers are safely recorded and will sync once connection resumes."
  - [x] Non-blocking offline answering leaning on Convex mutation queuing.
- [x] **3.6 Question Navigation & Palette Grid**
  - [x] Sidebar Question Palette with status indicators (Answered, Unanswered, Marked for Review, Current).
  - [x] Question actions: Previous, Next, Clear Response, Mark for Review.
  - [x] Pre-submission modal summarizing answered, unanswered, and flagged question counts.

---

## Phase 4: Submission Evaluation, Scorecards & Detailed Analytics

> **Objective**: Provide a safe submission workflow and immediate or detailed score analysis, performance metrics, and question-by-question review.

- [ ] **4.1 Pre-Submission Confirmation Dialog**
  - [ ] Summary table displaying count of Answered, Unanswered, and Marked questions across all sections.
  - [ ] Warning if unattempted questions remain.
  - [ ] Two-step final confirmation to prevent accidental submission.
- [ ] **4.2 Scoring & Evaluation Engine**
  - [ ] Client/Server scoring logic calculating:
    - [ ] Total Score & Max Marks.
    - [ ] Accuracy percentage (`(Correct / Attempted) * 100`).
    - [ ] Negative marks penalty deduction.
    - [ ] Sectional performance breakdown.
    - [ ] Time spent per question analysis.
- [ ] **4.3 Comprehensive Result & Review Dashboard (`/tests/[testId]/result`)**
  - [ ] Top hero scorecard: Pass/Fail status, Total Score, Accuracy, Time Taken.
  - [ ] Section-wise performance comparison bars.
  - [ ] Interactive Question Solution Review:
    - [ ] Filter by: All, Correct, Incorrect, Unattempted.
    - [ ] Display candidate's selected choice vs. actual correct answer.
    - [ ] Step-by-step solution explanation card.
  - [ ] Retake test and return to catalog actions.

---

## Phase 5: Test Administration / Custom Test Creator

> **Objective**: Provide an administrative or self-service interface to inspect, configure, and switch test scenarios.

- [ ] **5.1 Test Preset Switcher**
  - [ ] Ability to instantly switch between different mock test setups (e.g. 5-minute Speed Test, 30-minute Full Assessment, 15-minute Diagnostic Quiz).
- [ ] **5.2 Custom Test Configuration Modal / Page**
  - [ ] Allow setting custom test duration, negative marking toggle, and randomized question order.
  - [ ] Reset session history tool for administrative testing and maintenance.

---

## Phase 6: Polish, Accessibility, Mobile Ergonomics & Production Audit

> **Objective**: Ensure the application feels production-grade, fast, accessible, and responsive across all screens.

- [ ] **6.1 Mobile Ergonomics Audit**
  - [ ] Verify touch targets `>= 48px` on all buttons and options.
  - [ ] Ensure sticky top/bottom bars do not obstruct content on small screens (iPhone SE / 375px viewport).
  - [ ] Smooth scrolling and drawer interactions.
- [ ] **6.2 Keyboard Shortcuts & a11y Support**
  - [ ] Implement keyboard navigation: `Alt+N` (Next), `Alt+P` (Prev), `1-4` (Select option), `Alt+S` (Save & Next).
  - [ ] High contrast verification and screen reader attributes.
- [x] **6.3 Production Build & Performance Verification**
  - [x] Run `npm run build` to guarantee zero TypeScript or Next.js build errors.
    - [x] Test end-to-end user flow: Catalog -> Instructions -> Exam -> Autosave/Reload -> Submission -> Result Review.
