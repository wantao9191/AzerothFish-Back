import { pgTable, serial, text, timestamp, integer, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. 用户表
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openid: text("openid").notNull().unique(),
  sessionKey: text("session_key"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  status: integer("status").default(1), // 1: 正常, 0: 删除
  deletedAt: timestamp("deleted_at"),
  avatarUrl: text("avatar_url"),
  nickName: text("nick_name"),
  gender: integer("gender").default(0), // 0: 未知, 1: 男, 2: 女
});

// 2. 电子书表 (存储书籍元数据)
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  user_openid: text("user_openid").references(() => users.openid).notNull(), // 上传者
  title: text("title").notNull(),
  author: text("author"),
  coverUrl: text("cover_url"), // 封面图片路径
  fileUrl: text("file_url"),   // 原始文件路径
  format: text("format").notNull(), // txt, epub, pdf
  size: integer("size").notNull(),  // 文件大小 (bytes)
  createdAt: timestamp("created_at").defaultNow(),
  status: integer("status").default(1), // 1: 正常, 0: 删除
  deletedAt: timestamp("deleted_at"),
});

// 3. 章节表 (存储解析后的内容)
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),   // 章节标题
  content: text("content").notNull(), // 章节内容
  orderIndex: integer("order_index").notNull(), // 排序索引
  wordCount: integer("word_count"), // 字数统计
}, (t) => ({
  bookIdx: index("chapter_book_idx").on(t.bookId),
}));

// 4. 阅读进度表 (关联用户和书)
export const readingProgress = pgTable("reading_progress", {
  id: serial("id").primaryKey(),
  openid: text("user_openid").references(() => users.openid, { onDelete: 'cascade' }).notNull(),
  bookId: integer("book_id").references(() => books.id, { onDelete: 'cascade' }),
  currentChapterId: integer("current_chapter_id").references(() => chapters.id), // 当前读到的章节ID
  progress: integer("progress").default(0), // 章节内的进度 (例如百分比或滚动位置)
  lastReadAt: timestamp("last_read_at").defaultNow(), // 最后阅读时间
}, (t) => ({
  // 确保一个用户对一本书只有一条进度记录
  unq: uniqueIndex("user_book_progress_idx").on(t.openid, t.bookId),
}));

// 5. AI Metrics 表
export const aiMetrics = pgTable("ai_metrics", {
  id: serial("id").primaryKey(),
  skill: text("skill").notNull(),
  duration: integer("duration").notNull(), // 毫秒
  tokens: integer("tokens"), // token 消耗 (可选)
  model: text("model"), // 模型名称 (可选)
  success: integer("success").default(1), // 1: 成功, 0: 失败
  error: text("error"), // 错误信息
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"), // JSON
});

// 定义关系 (Relations)
export const booksRelations = relations(books, ({ many }) => ({
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one }) => ({
  book: one(books, {
    fields: [chapters.bookId],
    references: [books.id],
  }),
}));
