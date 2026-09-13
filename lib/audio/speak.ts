let lastSpokenAt = 0;

/**
 * Speaks `text` via the Web Speech API, debounced so overlapping/rapid
 * triggers (multiple form violations in one frame, a fast string of reps)
 * don't queue up and spam speech. Client-side only, zero network latency —
 * required for cues that fire mid-set. No-ops on the server or in browsers
 * without speech synthesis support.
 */
export function speak(text: string, { minGapMs = 1500 }: { minGapMs?: number } = {}): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const now = Date.now();
  if (now - lastSpokenAt < minGapMs) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1;
  window.speechSynthesis.speak(utterance);
  lastSpokenAt = now;
}
