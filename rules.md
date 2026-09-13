# Professional Test Portal — Engineering & Design Rules (`rules.md`)

This document serves as the single source of truth for architectural standards, design guidelines, code quality practices, and engineering workflows throughout the development of the Test Portal. All contributors and agents must adhere strictly to these rules.

---

## 1. Core Vision & Product Principles

1. **Distraction-Free Focus**: The primary user is an examinee. The interface during an assessment must maximize focus, minimize cognitive friction, and prevent accidental loss of progress.
2. **Deterministic & Resilient State**: Candidate responses must never be lost due to network flickers, tab switching, or accidental refreshes. Local state persistence and autosave are non-negotiable.
3. **Simplicity over Flashiness**: Clear typography, high contrast, predictable controls, and instant feedback beat heavy animations or extraneous embellishments.
4. **Butter-Smooth Scrolling & Zero Latency**: Every page and interactive view must feature silky-smooth, fluid momentum scrolling powered by Lenis inertia physics (`duration: 1.25s`, exponential ease-out curve, GPU-accelerated transforms, zero layout shifts, zero frame drops) across desktop mouse wheel, trackpad gestures, and touch devices.
5. **True Multi-Device Parity**: The candidate experience must be seamless and fully functional across mobile devices (smartphones), tablets, laptops, and ultra-wide desktop screens.

---

## 2. UI / UX Design Rules

### 2.1 Visual Hierarchy & Design System
- **Color System**:
  - **Neutral / Canvas**: Deep slate or crisp light backgrounds (`#F8FAFC` to `#0F172A`).
  - **Primary Brand**: Trustworthy blue/indigo (`#2563EB` / `#3B82F6`) for primary actions, active questions, and focus rings.
  - **Status Colors (Exam Palette)**:
    - *Answered*: Emerald green (`#10B981` / `#059669`)
    - *Unanswered / Skipped*: Slate gray (`#64748B` / `#CBD5E1`)
    - *Marked for Review*: Amber / Purple (`#8B5CF6` or `#F59E0B`)
    - *Answered & Marked for Review*: Violet badge with green dot / indicator
    - *Current Question*: Strong blue border / accent ring (`#2563EB`)
  - **Critical / Alerts**: Rose red (`#EF4444`) strictly reserved for time exhaustion warnings, submission confirmations, or errors.
- **Typography**:
  - Primary font: High legibility sans-serif (`Inter`, `Geist Sans`, or system sans fallback).
  - Minimum font size for question text: `16px` (1rem) on mobile to prevent automatic browser zoom on inputs; `18px` on desktop for relaxed reading.
  - Line height: Generous line-height (`1.6` to `1.75`) for question stems and passage readings.
  - Monospace font: Used for question numbers, timers, code snippets, and candidate roll numbers.
- **Landing Page Responsive Layout & Form Placement**:
  - **Desktop (`lg:`)**: 2-column split layout with exclusively the scaled black greeting words on the left (`col-span-7`), and the interactive Login Form (`[ Student ]` / `[ Admin ]`) immediately visible on the right (`col-span-5`). No extraneous bullet points or filler text.
  - **Mobile (`< lg`)**: Pure minimal vertical flow with the scaled black greeting on top, immediately followed by the Login Form without dead gaps.

### 2.2 Exam Portal UX Paradigms
- **Header / Top Bar**:
  - Displays: Test Title, Current Section Name, Candidate Info/Avatar, and Persistent Countdown Timer.
  - Timer alerts: Neutral until 5 minutes remaining (transitions to subtle amber), and pulsing red alert when under 1 minute.
  - Quick action: "Submit Test" button placed prominently but guarded by a two-step confirmation modal.
- **Main Exam Layout**:
  - **Desktop**: 2-column or 3-column split view:
    - Left/Center (70%): Question stem, options/inputs, clear response button, and Mark for Review toggle.
    - Right (30%): Question palette grid, section navigation tabs, question legend, and test summary.
    - Bottom Action Bar: "Previous", "Next", "Save & Next", "Mark for Review & Next".
  - **Mobile**:
    - Sticky top bar with Timer, Question Index (`Q 4 of 30`), and drawer toggle for the Question Palette.
    - Full-width question stem and large touch targets (`min-h-[48px]`) for option buttons.
    - Sticky bottom control bar with easily thumb-reachable "Previous" and "Save & Next" buttons.
- **Interactive States & Touch Targets**:
  - Minimum touch target size: `44x44px` on mobile, preferably `48px`.
  - Radio/Checkbox items: The entire card area must be clickable, not just the tiny circle/square.
  - Clear visual feedback on tap/hover with subtle spring or immediate state change (`0.15s transition`).

### 2.3 Accessibility (a11y)
- WCAG 2.1 AA compliance across all views.
- Contrast ratio of at least 4.5:1 for normal text and 3:1 for large headings and active UI borders.
- Keyboard navigation: Full exam flow must be operable via keyboard (`Tab`, `Enter`, `Space`, and standard shortcuts like `Alt+N` for Next, `Alt+P` for Prev, `1-4` for MCQ options).
- Screen-reader friendly ARIA attributes on timers, progress bars, and modal dialogues (`aria-live="polite"` for non-disruptive announcements).

---

## 3. Frontend Architecture Rules

### 3.1 Tech Stack & Tools
- **Framework**: Next.js (App Router, Server Components by default, Client Components where interactivity is needed).
- **Language**: TypeScript (Strict mode enabled, zero `any` policy).
- **Styling**: Tailwind CSS with clear utility layering and CSS variables for consistent theming.
- **Icons**: Lucide React for consistent, lightweight vector iconography.

### 3.2 Component Architecture & State Management
- **Server vs. Client Boundary**:
  - Pages, layouts, and static content (rules, test catalogs, results metadata) must remain React Server Components (RSC).
  - Interactive components (`ExamEngine`, `QuestionCard`, `Timer`, `QuestionPalette`, `SubmitModal`) must be isolated into `'use client'` leaf or subtree modules.
- **State Store & Synchronization**:
  - Test session state (current question index, responses map, review flags, time remaining, visited status) must reside in a dedicated state machine/context hook.
  - **Autosave & Persistence**:
    - Every response modification must synchronize synchronously to `localStorage` (or `IndexedDB` for rich offline state).
    - Provide an automatic debounce mechanism to push state to server/API endpoints.
    - If the user reloads or crashes, the session must hydrate from local storage without loss of answered questions or remaining time.
- **Navigation Guard**:
  - Prevent accidental back navigation (`beforeunload` event handler and Next.js router interceptors during active exam).

### 3.3 Performance & Bundle Discipline
- Core Web Vitals targets: LCP < 1.5s, CLS = 0, INP < 100ms.
- Code-split heavy components (e.g., Code Editors, Formula Renderers, or Analytics Charts) using dynamic imports (`next/dynamic`).
- Optimize images using Next.js `<Image>` component with explicit dimensions and modern formats (AVIF/WebP).

---

## 4. Backend & API Rules

### 4.1 API Design & Endpoints
- RESTful JSON endpoints standard under `/api/...`:
  - `GET /api/tests`: Fetch available test catalog and instructions.
  - `GET /api/tests/[testId]`: Fetch test schema, sections, and questions (without answers for candidate security).
  - `POST /api/sessions/start`: Initialize or resume an exam session for a candidate.
  - `POST /api/sessions/heartbeat`: Periodic sync of candidate timer and incremental answer snapshots.
  - `POST /api/sessions/submit`: Final evaluation and submission of response payload.
  - `GET /api/sessions/[sessionId]/result`: Fetch candidate score, section-wise breakdown, and question solutions.
- **Idempotency**: All submission and state-sync endpoints must support idempotency keys to avoid duplicate grading or session corruptions.

### 4.2 Data Validation & Security
- All incoming payloads must be strictly validated using schema validators (e.g. `zod`).
- **Anti-Cheating & Integrity Guardrails**:
  - Question correct answers and scoring weights must **never** be transmitted to the client during an ongoing test.
  - Server-side timer validation: Verify submission timestamp against session start time + allowed duration (+ realistic jitter allowance).
  - Log focus-loss / tab-switch events sent from the client.

### 4.3 Data Structures & Type Definitions
- Shared TypeScript interfaces between client and server for:
  - `Question`: `id`, `sectionId`, `type` (`'single-choice'` | `'multiple-choice'` | `'numerical'` | `'text'`), `prompt`, `options`, `difficulty`, `marks`, `negativeMarks`, `explanation`.
  - `CandidateResponse`: `questionId`, `selectedOptionIds`, `textAnswer`, `status` (`'answered'` | `'unanswered'` | `'marked_review'` | `'answered_marked_review'`), `timeSpentSeconds`.
  - `ExamSession`: `sessionId`, `testId`, `candidateId`, `startTime`, `endTime`, `durationSeconds`, `remainingSeconds`, `status` (`'in_progress'` | `'completed'` | `'expired'`).
  - `TestResult`: `totalScore`, `maxScore`, `accuracy`, `percentile`, `sectionBreakdown`, `questionAnalysis`.

---

## 5. Code Quality & Engineering Best Practices

### 5.1 Code Cleanliness & Conventions
- **Naming Conventions**:
  - Components: PascalCase (`QuestionPalette.tsx`, `TimerDisplay.tsx`).
  - Hooks: camelCase starting with `use` (`useExamSession.ts`, `useCountdown.ts`).
  - Utilities & Helpers: camelCase (`calculateScore.ts`, `formatTime.ts`).
  - Types/Interfaces: PascalCase (`ExamConfig`, `QuestionItem`).
  - Constants: UPPER_SNAKE_CASE (`DEFAULT_EXAM_DURATION_MINUTES`).
- **File Structure**:
  ```text
  app/
    ├── (portal)/
    │     ├── tests/
    │     │     └── [testId]/
    │     │           ├── page.tsx           # Test overview / instruction page
    │     │           ├── exam/page.tsx      # Active full-screen test engine
    │     │           └── result/page.tsx    # Result & score analysis
    │     └── page.tsx                       # Catalog / Dashboard
    ├── api/                                 # API route handlers
    ├── components/
    │     ├── ui/                            # Atomic reusable UI components (Button, Modal, Badge, Card)
    │     ├── exam/                          # Domain-specific exam widgets (Palette, Timer, Navigator)
    │     └── analytics/                     # Performance charts and result widgets
    ├── lib/                                 # Shared utilities, constants, mock data, storage helpers
    └── types/                               # Core TypeScript definitions
  ```
- **Error Handling**:
  - No uncaught Promise rejections.
  - Always render defensive UI with Error Boundaries and fallback empty states.
- **Zero Console Warnings**: Code submitted must be clean of lint warnings, unused variables, and console debug logs.

---

## 6. Review & Testing Checkpoints

- **Responsive verification**: Always test on mobile (`375px`), tablet (`768px`), and desktop (`1280px+`).
- **Offline & Refresh resilience**: Validate that refreshing mid-exam does not wipe responses or break session timer.
- **Cross-browser check**: Validate smoothly across Chromium, Safari/WebKit, and Firefox rendering engines.
