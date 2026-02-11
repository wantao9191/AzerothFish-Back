ALTER TABLE "books" ADD COLUMN "status" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nick_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX "chapter_book_idx" ON "chapters" USING btree ("book_id");