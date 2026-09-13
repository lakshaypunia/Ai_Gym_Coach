import { create } from "zustand";

export type SessionStatus = "idle" | "requesting-camera" | "camera-ready" | "camera-error";

interface SessionState {
  status: SessionStatus;
  cameraError: string | null;
  exerciseId: string | null;
  repCount: number;
  feedbackMessage: string | null;

  setStatus: (status: SessionStatus) => void;
  setCameraError: (message: string | null) => void;
  setExerciseId: (exerciseId: string | null) => void;
  incrementRep: () => void;
  setFeedbackMessage: (message: string | null) => void;
  reset: () => void;
}

const initialState = {
  status: "idle" as SessionStatus,
  cameraError: null,
  exerciseId: null,
  repCount: 0,
  feedbackMessage: null,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setCameraError: (cameraError) => set({ cameraError, status: cameraError ? "camera-error" : "idle" }),
  setExerciseId: (exerciseId) => set({ exerciseId }),
  incrementRep: () => set((state) => ({ repCount: state.repCount + 1 })),
  setFeedbackMessage: (feedbackMessage) => set({ feedbackMessage }),
  reset: () => set(initialState),
}));
