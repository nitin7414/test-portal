import { create } from 'zustand';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline';

interface ExamStoreState {
  currentQuestionIndex: number;
  answers: Record<string, string>; // questionId -> selectedOptionId
  markedForReview: string[]; // questionId array (for clean serialization)
  isOffline: boolean;
  syncStatus: SyncStatus;
  tabSwitchCount: number;
  showTabSwitchWarning: boolean;
  lastTabSwitchTime: number | null;
  showSubmitModal: boolean;
  showResumeBanner: boolean;

  // Actions
  setCurrentIndex: (index: number) => void;
  setAnswerOptimistic: (questionId: string, optionId: string) => void;
  clearAnswerOptimistic: (questionId: string) => void;
  toggleMarkForReview: (questionId: string) => void;
  hydrateAnswers: (serverAnswers: Array<{ questionId: string; selectedOptionId: string }>) => void;
  setOffline: (offline: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  recordTabSwitch: () => void;
  dismissTabSwitchWarning: () => void;
  setShowSubmitModal: (show: boolean) => void;
  dismissResumeBanner: () => void;
  hydrateUiState: (state: { currentQuestionIndex?: number; markedForReview?: string[]; tabSwitchCount?: number }) => void;
  resetExamStore: () => void;
}

export const useExamStore = create<ExamStoreState>((set) => ({
  currentQuestionIndex: 0,
  answers: {},
  markedForReview: [],
  isOffline: false,
  syncStatus: 'idle',
  tabSwitchCount: 0,
  showTabSwitchWarning: false,
  lastTabSwitchTime: null,
  showSubmitModal: false,
  showResumeBanner: false,

  setCurrentIndex: (index) => set({ currentQuestionIndex: index }),

  setAnswerOptimistic: (questionId, optionId) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: optionId },
      syncStatus: state.isOffline ? 'offline' : 'saving',
    })),

  clearAnswerOptimistic: (questionId) =>
    set((state) => {
      const copy = { ...state.answers };
      delete copy[questionId];
      return {
        answers: copy,
        syncStatus: state.isOffline ? 'offline' : 'saving',
      };
    }),

  toggleMarkForReview: (questionId) =>
    set((state) => {
      const exists = state.markedForReview.includes(questionId);
      return {
        markedForReview: exists
          ? state.markedForReview.filter((id) => id !== questionId)
          : [...state.markedForReview, questionId],
      };
    }),

  hydrateAnswers: (serverAnswers) =>
    set((state) => {
      const merged = { ...state.answers };
      serverAnswers.forEach((ans) => {
        // Only hydrate if not already set by optimistic user interaction
        if (!merged[ans.questionId]) {
          merged[ans.questionId] = ans.selectedOptionId;
        }
      });
      return { answers: merged, syncStatus: 'saved' };
    }),

  setOffline: (offline) =>
    set((state) => ({
      isOffline: offline,
      syncStatus: offline ? 'offline' : state.syncStatus === 'offline' ? 'saved' : state.syncStatus,
    })),

  setSyncStatus: (status) => set({ syncStatus: status }),

  recordTabSwitch: () =>
    set((state) => ({
      tabSwitchCount: state.tabSwitchCount + 1,
      showTabSwitchWarning: true,
      lastTabSwitchTime: Date.now(),
    })),

  dismissTabSwitchWarning: () => set({ showTabSwitchWarning: false }),

  setShowSubmitModal: (show) => set({ showSubmitModal: show }),

  dismissResumeBanner: () => set({ showResumeBanner: false }),

  hydrateUiState: (uiState) =>
    set((state) => ({
      currentQuestionIndex:
        typeof uiState.currentQuestionIndex === 'number'
          ? uiState.currentQuestionIndex
          : state.currentQuestionIndex,
      markedForReview: Array.isArray(uiState.markedForReview)
        ? uiState.markedForReview
        : state.markedForReview,
      tabSwitchCount:
        typeof uiState.tabSwitchCount === 'number'
          ? uiState.tabSwitchCount
          : state.tabSwitchCount,
    })),

  resetExamStore: () =>
    set({
      currentQuestionIndex: 0,
      answers: {},
      markedForReview: [],
      isOffline: false,
      syncStatus: 'idle',
      tabSwitchCount: 0,
      showTabSwitchWarning: false,
      lastTabSwitchTime: null,
      showSubmitModal: false,
      showResumeBanner: false,
    }),
}));
