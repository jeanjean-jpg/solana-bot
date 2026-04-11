import { describe, it, expect } from "vitest";
import { encryptKey, decryptKey } from "../../src/core/wallet.js";

describe("wallet encryption", () => {
  const encryptionKey = "12345678901234567890123456789012"; // exactly 32 chars

  it("round-trips a private key through encrypt/decrypt", () => {
    const original = "5KJvsngHeMpm884wtkJNzQGaCErckhHJBGFsvd3VyK5qMZXj3hS";
    const encrypted = encryptKey(original, encryptionKey);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(":"); // format: iv:ciphertext
    const decrypted = decryptKey(encrypted, encryptionKey);
    expect(decrypted).toBe(original);
  });

  it("different encryption keys produce different ciphertext", () => {
    const text = "test-private-key-string-here-xxx";
    const enc1 = encryptKey(text, "11111111111111111111111111111111");
    const enc2 = encryptKey(text, "22222222222222222222222222222222");
    expect(enc1).not.toBe(enc2);
  });

  it("encrypted value is not the same as plaintext", () => {
    const key = encryptKey("my-secret-key-here-testing-12345", encryptionKey);
    expect(key).not.toBe("my-secret-key-here-testing-12345");
  });
});
