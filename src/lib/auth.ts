import { SignJWT, jwtVerify } from 'jose';

// 请在 .env 文件中设置 JWT_SECRET_KEY
const SECRET_KEY = process.env.JWT_SECRET_KEY || 'default-secret-key-change-it-in-production';
const key = new TextEncoder().encode(SECRET_KEY);

export async function signToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Token 有效期 24 小时
    .sign(key);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (error) {
    return null;
  }
}
