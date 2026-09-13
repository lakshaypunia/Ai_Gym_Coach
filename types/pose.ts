export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number; // 0..1 confidence — used to detect occlusion
}

export interface PoseFrame {
  landmarks: Landmark[]; // 33 entries, MediaPipe Pose indexing
  timestampMs: number;
}
