import { beforeEach, describe, expect, it } from "vitest";

import {
  applyVosBackup,
  buildVosBackup,
  serializeVosBackup,
  verifyVosBackup,
} from "@/lib/backup-vos";

describe(".vos signed backup vault", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips teams, directory, season and pins through export/import", () => {
    window.localStorage.setItem("volleyos.teams", '[{"id":"t1","name":"Tiburones"}]');
    window.localStorage.setItem("voleyos_player_directory_v1", '["Ana","Bruno"]');
    window.localStorage.setItem("voleyos_season_history_v1", '[{"matchId":"m1"}]');
    window.localStorage.setItem("volleyos.pins", '["scoreboard"]');

    const text = serializeVosBackup(1700000000000);
    const result = verifyVosBackup(text);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");

    window.localStorage.clear();
    expect(applyVosBackup(result.backup)).toBe(true);
    expect(window.localStorage.getItem("volleyos.teams")).toBe('[{"id":"t1","name":"Tiburones"}]');
    expect(window.localStorage.getItem("voleyos_player_directory_v1")).toBe('["Ana","Bruno"]');
    expect(window.localStorage.getItem("voleyos_season_history_v1")).toBe('[{"matchId":"m1"}]');
    expect(window.localStorage.getItem("volleyos.pins")).toBe('["scoreboard"]');
  });

  it("rejects tampered payloads via the checksum", () => {
    const backup = buildVosBackup(1700000000000);
    const tampered = JSON.stringify({
      ...backup,
      payload: { ...backup.payload, creatorToken: "stolen-token" },
    });
    const result = verifyVosBackup(tampered);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.reason).toBe("checksum");
  });

  it("rejects foreign formats and garbage", () => {
    expect(verifyVosBackup('{"format":"nope","version":1}')).toEqual({ ok: false, reason: "format" });
    expect(verifyVosBackup("garbage {").ok).toBe(false);
    expect(verifyVosBackup("").ok).toBe(false);
  });

  it("carries no-null slots as null and skips them on restore", () => {
    const backup = buildVosBackup(1700000000000);
    expect(backup.payload.creatorToken).toBeNull();
    window.localStorage.setItem("volleyos.creator.token", "keep-me");
    expect(applyVosBackup(backup)).toBe(true);
    expect(window.localStorage.getItem("volleyos.creator.token")).toBe("keep-me");
  });
});
