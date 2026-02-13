ALTER TABLE "books" RENAME COLUMN "user_id" TO "user_openid";--> statement-breakpoint
ALTER TABLE "reading_progress" RENAME COLUMN "user_id" TO "user_openid";--> statement-breakpoint
ALTER TABLE "books" DROP CONSTRAINT "books_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reading_progress" DROP CONSTRAINT "reading_progress_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "user_book_progress_idx";--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_openid_users_openid_fk" FOREIGN KEY ("user_openid") REFERENCES "public"."users"("openid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_openid_users_openid_fk" FOREIGN KEY ("user_openid") REFERENCES "public"."users"("openid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_book_progress_idx" ON "reading_progress" USING btree ("user_openid","book_id");