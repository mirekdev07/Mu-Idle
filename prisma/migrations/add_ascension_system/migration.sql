-- Add Ascension System fields to player_characters
ALTER TABLE "player_characters" ADD COLUMN IF NOT EXISTS "ascension_points" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "player_characters" ADD COLUMN IF NOT EXISTS "asc_damage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "player_characters" ADD COLUMN IF NOT EXISTS "asc_critical" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "player_characters" ADD COLUMN IF NOT EXISTS "asc_health" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "player_characters" ADD COLUMN IF NOT EXISTS "asc_life_steal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "player_characters" ADD COLUMN IF NOT EXISTS "asc_zen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "player_characters" ADD COLUMN IF NOT EXISTS "asc_exp" INTEGER NOT NULL DEFAULT 0;

-- Grant 1 ascension point for each existing reset
UPDATE "player_characters" SET "ascension_points" = "reset_count" WHERE "reset_count" > 0;
