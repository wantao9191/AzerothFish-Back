CREATE TABLE "ai_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"skill" text NOT NULL,
	"duration" integer NOT NULL,
	"tokens" integer,
	"model" text,
	"success" integer DEFAULT 1,
	"error" text,
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
