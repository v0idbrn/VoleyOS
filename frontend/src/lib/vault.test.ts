import { beforeEach, describe, expect, it } from "vitest";

import { addVaultEntry, destroyVault, loadVault } from "./vault";

describe("ephemeral vault", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores reports locally with a row count", () => {
    addVaultEntry("scouting", 12);
    const entries = addVaultEntry("acwr", 28);
    expect(entries).toHaveLength(2);
    expect(loadVault()[1]?.rows).toBe(28);
  });

  it("caps the vault at 24 entries", () => {
    for (let index = 0; index < 30; index += 1) addVaultEntry("tempo", index);
    expect(loadVault()).toHaveLength(24);
  });

  it("destroys everything and emits a receipt", () => {
    addVaultEntry("beach", 2);
    const receipt = destroyVault();
    expect(receipt.destroyed).toBe(1);
    expect(receipt.receipt).toMatch(/^vlt_[0-9a-f]+$/);
    expect(loadVault()).toHaveLength(0);
  });
});
