import { db } from "@/db";
import { books, chapters } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { success, error as errorResponse, ResultCode } from "@/lib/response";
/**
 * @description 获取书籍详情
 * @deprecated
 * @param request
 * @param {params} { params: { id: string } }
 * @returns {Promise<Response>}
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const openid = request.headers.get("x-user-openid");
    if (!openid) {
      return success([]);
    }
    const bookId = parseInt(params.id);

    if (isNaN(bookId)) {
      return errorResponse("无效的书籍ID", ResultCode.BAD_REQUEST, 400);
    }

    // 1. Get book details
    const book = await db.query.books.findFirst({
      where: and(
        eq(books.id, bookId),
        eq(books.user_openid, openid) // Ensure ownership
      ),
    });

    if (!book) {
      return errorResponse("Book not found", ResultCode.NOT_FOUND, 404);
    }

    // 2. Get chapters (without content)
    const bookChapters = await db.query.chapters.findMany({
      where: eq(chapters.bookId, bookId),
      orderBy: [asc(chapters.orderIndex)],
      columns: {
        id: true,
        title: true,
        orderIndex: true,
        wordCount: true,
      },
    });

    return success({
      ...book,
      chapters: bookChapters,
    });
  } catch (err) {
    console.error("Get book details error:", err);
    return errorResponse("Internal server error", ResultCode.ERROR, 500);
  }
}

/**
 * @description 更新书籍详情
 * @param request
 * @param {params} { params: { id: string } }
 * @returns {Promise<Response>}
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const openid = request.headers.get("x-user-openid");
    if (!openid) {
      return errorResponse("User OpenID missing", ResultCode.UNAUTHORIZED, 401);
    }
    const bookId = parseInt(params.id);

    if (isNaN(bookId)) {
      return errorResponse("无效的书籍ID", ResultCode.BAD_REQUEST, 400);
    }

    const { title, coverUrl } = await request.json();

    if (!title || !coverUrl) {
      return errorResponse("缺少标题或封面URL", ResultCode.BAD_REQUEST, 400);
    }

    const book = await db.query.books.findFirst({
      where: and(eq(books.id, bookId), eq(books.user_openid, openid)),
    });

    if (!book) {
      return errorResponse("书籍不存在", ResultCode.NOT_FOUND, 404);
    }

    const updatedBook = await db.update(books).set({ title, coverUrl }).where(eq(books.id, bookId)).returning();

    return success(updatedBook[0]);
  } catch (err) {
    console.error("Update book details error:", err);
    return errorResponse("更新书籍详情失败", ResultCode.ERROR, 500);
  }
}

/**
 * @description 删除书籍
 * @param request
 * @param {params} { params: { id: string } }
 * @returns {Promise<Response>}
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const openid = request.headers.get("x-user-openid");
    if (!openid) {
      return errorResponse("User OpenID missing", ResultCode.UNAUTHORIZED, 401);
    }
    const bookId = parseInt(params.id);

    if (isNaN(bookId)) {
      return errorResponse("无效的书籍ID", ResultCode.BAD_REQUEST, 400);
    }
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, bookId), eq(books.user_openid, openid)),
    });
    if (!book) {
      return errorResponse("书籍不存在", ResultCode.NOT_FOUND, 404);
    }
    await db.update(books).set({ status: 0, deletedAt: new Date() }).where(eq(books.id, bookId));
    return success({ message: "书籍删除成功" });
  } catch (err) {
    console.error("Delete book error:", err);
    return errorResponse("删除书籍失败", ResultCode.ERROR, 500);
  }
}