import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret-change-me"
);

// パスワードを簡易ハッシュ（SHA-256）で比較
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<boolean> {
  const validEmail = process.env.AUTH_EMAIL || "ites@cellpromote.biz";
  const validHash = process.env.AUTH_PASSWORD_HASH;

  if (email !== validEmail) return false;

  // ハッシュが未設定なら平文比較（初回セットアップ用）
  if (!validHash) {
    return password === "@884884@";
  }

  const inputHash = await sha256(password);
  return inputHash === validHash;
}

export async function createSession(email: string): Promise<string> {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRET);
  return token;
}

export async function verifySession(
  token: string
): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { email: payload.email as string };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<{ email: string } | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  return verifySession(token);
}
