import { beforeEach, describe, expect, it } from "vitest";

import {
  MAX_JSON_BYTES,
  atomicLoad,
  atomicSave,
  checksumOf,
  safeJsonParse,
} from "@/lib/security-shield";

describe("safeJsonParse — anti-pollution intake", () => {
  it("strips __proto__, constructor and prototype keys", () => {
    const raw =
      '{"__proto__":{"polluted":123},"constructor":{"bad":1},"prototype":{"bad":2},"safe":"ok"}';
    const out = safeJsonParse<Record<string, unknown>>(raw, {});
    expect(Object.keys(out)).toEqual(["safe"]);
    expect(out.safe).toBe("ok");

    const target: Record<string, unknown> = {};
    Object.assign(target, out);
    expect(Object.getOwnPropertyNames(target)).not.toContain("__proto__");
    expect((target as { polluted?: number }).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("sanitizes <script> tags and inline on*= handlers from strings", () => {
    const raw =
      '{"name":"<script>alert(1)</script>","note":"<img src=x onerror=alert(2)>","keep":"touch on = line"}';
    const out = safeJsonParse<{ name: string; note: string; keep: string }>(raw, {
      name: "",
      note: "",
      keep: "",
    });
    expect(out.name).not.toMatch(/<script/i);
    expect(out.note).not.toContain("onerror=");
    expect(out.keep).toBe("touch on = line");
  });

  it("rejects payloads above 512 KB and invalid JSON with the fallback", () => {
    const big = `{"pad":"${"x".repeat(MAX_JSON_BYTES + 32)}"}`;
    expect(safeJsonParse(big, "fb")).toBe("fb");
    expect(safeJsonParse("not json {", "fb")).toBe("fb");
  });

  it("keeps nested structures and arrays intact", () => {
    const raw = '{"list":[{"a":1,"__proto__":{"x":1}}],"n":2}';
    const out = safeJsonParse<{ list: Array<Record<string, unknown>>; n: number }>(raw, {
      list: [],
      n: 0,
    });
    expect(out.n).toBe(2);
    expect(Object.keys(out.list[0] ?? {})).toEqual(["a"]);
  });
});

describe("atomicSave / atomicLoad — dual-slot WAL", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips state through both slots", () => {
    const state = { scoreA: 14, team: "Tiburones" };
    expect(atomicSave("volleyos.testWal", state)).toBe(true);
    expect(window.localStorage.getItem("volleyos.testWal")).toBeTruthy();
    expect(window.localStorage.getItem("volleyos.testWal__backup")).toBeTruthy();
    expect(atomicLoad("volleyos.testWal", null)).toEqual(state);
  });

  it("recovers from Slot B when Slot A is corrupted mid-write", () => {
    const state = { scoreA: 24, setsA: 1 };
    atomicSave("volleyos.testWal", state);
    window.localStorage.setItem("volleyos.testWal", "{corrupt-json");
    expect(atomicLoad("volleyos.testWal", null)).toEqual(state);
  });

  it("rejects a tampered Slot A whose checksum no longer matches", () => {
    atomicSave("volleyos.testWal", { scoreA: 20 });
    const raw = window.localStorage.getItem("volleyos.testWal");
    const record = JSON.parse(raw ?? "{}") as { data?: { scoreA?: number } };
    if (record.data) record.data.scoreA = 99;
    window.localStorage.setItem("volleyos.testWal", JSON.stringify(record));
    expect(atomicLoad("volleyos.testWal", null)).toEqual({ scoreA: 20 });
  });

  it("returns the fallback when nothing was ever saved", () => {
    expect(atomicLoad("volleyos.never", "fb")).toBe("fb");
  });

  it("checksumOf is deterministic", () => {
    expect(checksumOf('{"a":1}')).toBe(checksumOf('{"a":1}'));
    expect(checksumOf('{"a":1}')).not.toBe(checksumOf('{"a":2}'));
  });
});
