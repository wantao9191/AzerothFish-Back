import { db } from "@/db";
import { books } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { success, error as errorResponse, ResultCode } from "@/lib/response";

export const dynamic = "force-dynamic";
/**
 * @description 获取用户书籍列表
 * @param request
 * @returns {Promise<Response>}
 */
export async function GET(request: Request) {
  try {
    const openid = request.headers.get("x-user-openid");
    if (!openid) {
      return success([]);
    }

    const userBooks = await db.query.books.findMany({
      where: and(eq(books.user_openid, openid), eq(books.status, 1)),
      orderBy: [desc(books.createdAt)],
    });

    return success(userBooks);
  } catch (err) {
    console.error("Get books error:", err);
    return errorResponse("获取书籍列表失败", ResultCode.ERROR, 500);
  }
}
/**
 * @description 删除书籍
 * @param request
 * @param {params} { params: { id: string } }
 * @returns {Promise<Response>}
 */
export async function DELETE(request: Request) {
  try {
    const openid = request.headers.get("x-user-openid");
    const body = await request.json();
    const { ids } = body;
    if (!ids.length) {
      return errorResponse("书籍ID列表缺失", ResultCode.BAD_REQUEST, 400);
    }
    await db.update(books).set({ status: 0, deletedAt: new Date() }).where(and(eq(books.user_openid, openid as string), inArray(books.id, ids as number[])));
    return success({ message: "书籍删除成功" });
  } catch (err) {
    console.error("Delete book error:", err);
    return errorResponse("删除书籍失败", ResultCode.ERROR, 500);
  }
}
