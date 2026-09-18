# Graph Report - F:\projects\tes-portal  (2026-09-18)

## Corpus Check
- 38 files · ~48,252 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 127 nodes · 143 edges · 36 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 12 edges
2. `getAllTests()` - 7 edges
3. `getPortalStats()` - 7 edges
4. `getAllUsers()` - 7 edges
5. `handleToggleStatus()` - 4 edges
6. `handleDeleteStudent()` - 4 edges
7. `handleSaveSchedule()` - 4 edges
8. `handleSystemAction()` - 4 edges
9. `handleFileChange()` - 4 edges
10. `processExtractedText()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `showToast()` --calls--> `handleFileChange()`  [INFERRED]
  F:\projects\tes-portal\components\dashboard\AdminDashboard.tsx → F:\projects\tes-portal\components\dashboard\GenerateTestView.tsx
- `showToast()` --calls--> `handleLoadSample()`  [INFERRED]
  F:\projects\tes-portal\components\dashboard\AdminDashboard.tsx → F:\projects\tes-portal\components\dashboard\GenerateTestView.tsx
- `showToast()` --calls--> `handleDeleteQuestion()`  [INFERRED]
  F:\projects\tes-portal\components\dashboard\AdminDashboard.tsx → F:\projects\tes-portal\components\dashboard\GenerateTestView.tsx
- `showToast()` --calls--> `handleUploadPaper()`  [INFERRED]
  F:\projects\tes-portal\components\dashboard\AdminDashboard.tsx → F:\projects\tes-portal\components\dashboard\GenerateTestView.tsx
- `handleDeleteStudent()` --calls--> `deleteStudent()`  [INFERRED]
  F:\projects\tes-portal\components\dashboard\AdminDashboard.tsx → F:\projects\tes-portal\lib\admin-utils.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (8): handleFileChange(), handleLoadSample(), processExtractedText(), extractAnswerKeyMap(), extractTextFromPdfFile(), loadPdfJs(), normalizeText(), parseQuestionsFromRawText()

### Community 1 - "Community 1"
Cohesion: 0.19
Nodes (14): clearAllExamSessions(), clearAllResults(), createNewTest(), cycleTestStatus(), deleteTest(), getAllTests(), resetAllPortalData(), saveTestOverride() (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (10): clearStudentResults(), getPortalStats(), resetTestConfigs(), toggleStudentStatus(), handleClearStudentHistory(), handleDeleteStudent(), handleSystemAction(), handleToggleStatus() (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.19
Nodes (10): deleteStudent(), authenticateUser(), clearActiveSession(), createStudentAccount(), generateSessionToken(), getActiveSession(), getAllUsers(), saveUsers() (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (0): 

### Community 5 - "Community 5"
Cohesion: 0.4
Nodes (0): 

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (0): 

### Community 7 - "Community 7"
Cohesion: 0.67
Nodes (0): 

### Community 8 - "Community 8"
Cohesion: 0.67
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 9`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (2 nodes): `page.tsx`, `Home()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (2 nodes): `TestBriefingModal.tsx`, `TestBriefingModal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (2 nodes): `SmoothScrollProvider.tsx`, `SmoothScrollProvider()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (2 nodes): `Badge()`, `Badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (2 nodes): `Button()`, `Button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `Card()`, `Card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `StudentResponseModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `Icons.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `Input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `answers.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `attempts.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `schema.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `tests.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `dataModel.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `mock-tests.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `examStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `auth.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `exam.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showToast()` connect `Community 2` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `getAllUsers()` connect `Community 3` to `Community 2`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `getPortalStats()` connect `Community 2` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `showToast()` (e.g. with `handleFileChange()` and `handleLoadSample()`) actually correct?**
  _`showToast()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `getPortalStats()` (e.g. with `handleToggleStatus()` and `handleDeleteStudent()`) actually correct?**
  _`getPortalStats()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `getAllUsers()` (e.g. with `handleProvisionStudent()` and `toggleStudentStatus()`) actually correct?**
  _`getAllUsers()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `handleToggleStatus()` (e.g. with `toggleStudentStatus()` and `getPortalStats()`) actually correct?**
  _`handleToggleStatus()` has 2 INFERRED edges - model-reasoned connections that need verification._