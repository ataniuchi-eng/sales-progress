import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getUserByEmail } from "./db";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret-change-me"
);

const ADMIN_EMAIL = "ites@cellpromote.biz";

// パスワードを簡易ハッシュ（SHA-256）で比較
export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isAdmin(email: string): boolean {
  return email === ADMIN_EMAIL;
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<boolean> {
  // 管理者アカウント
  if (email === ADMIN_EMAIL) {
    const validHash = process.env.AUTH_PASSWORD_HASH
      || "c6b2811efacfe1ca5f64387d5d77b0f49abb1bff4c2a31e0c6a16435648c3b15";
    const inputHash = await sha256(password);
    return inputHash === validHash;
  }

  // 一般ユーザー（DBから検証）
  const user = await getUserByEmail(email);
  if (!user) return false;
  const inputHash = await sha256(password);
  return inputHash === user.password_hash;
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
