// パスワードハッシュ生成ユーティリティ
// 使い方: node lib/setup-db.mjs
const password = "@884884@";
const buf = await crypto.subtle.digest(
  "SHA-256",
  new TextEncoder().encode(password)
);
const hash = Array.from(new Uint8Array(buf))
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");

console.log("=== パスワードハッシュ生成 ===");
console.log(`パスワード: ${password}`);
console.log(`SHA-256ハッシュ: ${hash}`);
console.log("");
console.log(".env.local に以下を設定してください:");
console.log(`AUTH_PASSWORD_HASH=${hash}`);
