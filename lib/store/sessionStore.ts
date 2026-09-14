import { create } from "zustand";

export type SessionStatus = "idle" | "requesting-camera" | "camera-ready" | "camera-error";

export interface ViolationCount {
  ruleId: string;
  message: string;
  count: number;
}

interface SessionState {
  status: SessionStatus;
  cameraError: string | null;
  exerciseId: string | null;
  repCount: number;
  feedbackMessage: string | null;
  sessionStartedAt: number | null;
  violationCounts: Record<string, ViolationCount>;

  setStatus: (status: SessionStatus) => void;
  setCameraError: (message: string | null) => void;
  setExerciseId: (exerciseId: string | null) => void;
  incrementRep: () => void;
  setFeedbackMessage: (message: string | null) => void;
  markSessionStarted: () => void;
  recordViolation: (ruleId: string, message: string) => void;
  reset: () => void;
}

const initialState = {
  status: "idle" as SessionStatus,
  cameraError: null,
  exerciseId: null,
  repCount: 0,
  feedbackMessage: null,
  sessionStartedAt: null,
  violationCounts: {},
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setCameraError: (cameraError) => set({ cameraError, status: cameraError ? "camera-error" : "idle" }),
  setExerciseId: (exerciseId) => set({ exerciseId }),
  incrementRep: () => set((state) => ({ repCount: state.repCount + 1 })),
  setFeedbackMessage: (feedbackMessage) => set({ feedbackMessage }),
  markSessionStarted: () =>
    set((state) => (state.sessionStartedAt ? state : { sessionStartedAt: Date.now() })),
  recordViolation: (ruleId, message) =>
    set((state) => {
      const existing = state.violationCounts[ruleId];
      return {
        violationCounts: {
          ...state.violationCounts,
          [ruleId]: { ruleId, message, count: (existing?.count ?? 0) + 1 },
        },
      };
    }),
  reset: () => set(initialState),
}));
