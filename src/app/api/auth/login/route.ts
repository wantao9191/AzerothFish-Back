import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error as errorResponse, ResultCode } from "@/lib/response";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return errorResponse("Code is required", ResultCode.BAD_REQUEST, 400);
    }

    const appId = process.env.WX_APP_ID;
    const appSecret = process.env.WX_APP_SECRET;

    if (!appId || !appSecret) {
      return errorResponse("Server configuration error", ResultCode.ERROR, 500);
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.errcode) {
      return errorResponse(data.errmsg, ResultCode.BAD_REQUEST, 400);
    }

    const { openid, session_key } = data;

    // Upsert user
    const existingUser = await db.query.users.findFirst({
      where: eq(users.openid, openid),
    });

    let user;

    if (existingUser) {
      [user] = await db.update(users)
        .set({ sessionKey: session_key, updatedAt: new Date() })
        .where(eq(users.openid, openid))
        .returning();
    } else {
      [user] = await db.insert(users)
        .values({ openid, sessionKey: session_key })
        .returning();
    }

    // 生成 Token
    const token = await signToken({ openid });

    return success({
      token,
      userInfo: {
        openid,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    return errorResponse("Internal server error", ResultCode.ERROR, 500);
  }
}
