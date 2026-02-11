import { db } from "@/db";
import { chapters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error as errorResponse, ResultCode } from "@/lib/response";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const openid = request.headers.get("x-user-openid");
    if (!openid) {
      return errorResponse("User OpenID missing", ResultCode.UNAUTHORIZED, 401);
    }
    const chapterId = parseInt(params.id);

    if (isNaN(chapterId)) {
      return errorResponse("Invalid chapter ID", ResultCode.BAD_REQUEST, 400);
    }

    const chapter = await db.query.chapters.findFirst({
      where: eq(chapters.id, chapterId),
      with: {
        book: true,
      },
    });

    if (!chapter || !chapter.book) {
      return errorResponse("Chapter not found", ResultCode.NOT_FOUND, 404);
    }

    // Check ownership via book relation
    if (chapter.book.user_openid !== openid) {
      return errorResponse("无权限", ResultCode.UNAUTHORIZED, 403);
    }

    // Return content (and maybe sibling IDs for navigation if needed later, but frontend can manage list)
    return success(chapter);
  } catch (err) {
    console.error("Get chapter error:", err);
    return errorResponse("Internal server error", ResultCode.ERROR, 500);
  }
}
