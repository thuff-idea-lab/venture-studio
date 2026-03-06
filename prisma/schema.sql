-- CreateTable
CREATE TABLE "ideas" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    -- Core opportunity brief (populated by Scout LLM extraction)
    "title" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT '',
    "pain" TEXT NOT NULL DEFAULT '',
    "workaround" TEXT NOT NULL DEFAULT '',
    "product_possibilities" JSONB NOT NULL DEFAULT '[]',
    "monetization" JSONB NOT NULL DEFAULT '[]',
    "confidence" TEXT NOT NULL DEFAULT 'low',  -- low | medium | high
    -- Signal strength
    "signal_count" INTEGER NOT NULL DEFAULT 1,
    "source_cluster" JSONB NOT NULL DEFAULT '[]',
    -- Legacy / metadata
    "summary" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "sources" JSONB NOT NULL DEFAULT '[]',
    "keywords" TEXT[] NOT NULL DEFAULT '{}',
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "asset_type_hint" TEXT NOT NULL DEFAULT 'unknown',
    -- V3 Scout fields (founder-fit extraction)
    "frequency" TEXT NOT NULL DEFAULT 'unknown',
    "mvp_idea" TEXT NOT NULL DEFAULT '',
    "distribution_paths" JSONB NOT NULL DEFAULT '[]',
    "founder_fit_reason" JSONB NOT NULL DEFAULT '[]',
    "expansion_paths" JSONB NOT NULL DEFAULT '[]',
    "why_now" TEXT NOT NULL DEFAULT '',
    "source_excerpt" TEXT NOT NULL DEFAULT '',
    "founder_fit_score" INTEGER NOT NULL DEFAULT 5,
    "evaluated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "idea_id" TEXT NOT NULL,
    "score_total" INTEGER NOT NULL,
    "score_breakdown" JSONB NOT NULL DEFAULT '{}',
    "recommendation" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "project_created_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "evaluations_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "idea_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "project_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "plan" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "projects_slug_key" UNIQUE ("slug"),
    CONSTRAINT "projects_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE
);

-- Index for fast lookups
CREATE INDEX "ideas_evaluated_at_idx" ON "ideas"("evaluated_at");
CREATE INDEX "evaluations_recommendation_idx" ON "evaluations"("recommendation");
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- ── MIGRATION: run these in Supabase SQL editor if tables already exist ────────
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "frequency" TEXT NOT NULL DEFAULT 'unknown';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "mvp_idea" TEXT NOT NULL DEFAULT '';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "distribution_paths" JSONB NOT NULL DEFAULT '[]';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "founder_fit_reason" JSONB NOT NULL DEFAULT '[]';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "expansion_paths" JSONB NOT NULL DEFAULT '[]';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "why_now" TEXT NOT NULL DEFAULT '';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "source_excerpt" TEXT NOT NULL DEFAULT '';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "founder_fit_score" INTEGER NOT NULL DEFAULT 5;
