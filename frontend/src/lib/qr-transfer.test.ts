import { describe, expect, it } from "vitest";

import { createQrFrames, emptyIngest, ingestQrFrame } from "./qr-transfer";

const payload = {
  kind: "match",
  state: { teamA: "Tiburones", teamB: "Cóndores", scoreA: 24, scoreB: 22, lineupA: [1, 2, 3, 4, 5, 6] },
};

describe("multi-frame QR transfer", () => {
  it("splits a match into numbered frames and reassembles it out of order", async () => {
    const frames = await createQrFrames(payload);
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]?.text.startsWith("VOSQ1|")).toBe(true);
    let state = emptyIngest();
    for (const frame of [...frames].reverse()) {
      state = await ingestQrFrame(state, frame.text);
    }
    expect(state.complete).toBe(true);
    expect(state.error).toBeNull();
    expect(state.payload).toEqual(payload);
  });

  it("rejects a frame whose payload no longer matches the checksum", async () => {
    const frames = await createQrFrames(payload);
    const last = frames[frames.length - 1]!;
    const flipped = last.chunk.slice(0, 5) + (last.chunk[5] === "A" ? "B" : "A") + last.chunk.slice(6);
    const tampered = last.text.replace(last.chunk, flipped);
    let state = emptyIngest();
    for (const frame of frames.slice(0, -1)) state = await ingestQrFrame(state, frame.text);
    state = await ingestQrFrame(state, tampered);
    expect(state.complete).toBe(false);
    expect(state.error).toBe("checksum mismatch");
  });

  it("ignores foreign QR codes", async () => {
    const state = await ingestQrFrame(emptyIngest(), "https://example.com");
    expect(state.frames.size).toBe(0);
    expect(state.error).toBe("not a VolleyOS frame");
  });
});
