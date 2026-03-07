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
    "opportunity_confidence" TEXT NOT NULL DEFAULT 'low',
    "evidence_confidence" TEXT NOT NULL DEFAULT 'low',
    -- Signal strength
    "signal_count" INTEGER NOT NULL DEFAULT 1,
    "source_type_count" INTEGER NOT NULL DEFAULT 1,
    "source_lane_count" INTEGER NOT NULL DEFAULT 1,
    "source_cluster" JSONB NOT NULL DEFAULT '[]',
    -- Legacy / metadata
    "summary" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "sources" JSONB NOT NULL DEFAULT '[]',
    "keywords" TEXT[] NOT NULL DEFAULT '{}',
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "canonical_tags" TEXT[] NOT NULL DEFAULT '{}',
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
    "priority" INTEGER NOT NULL DEFAULT 3,
    "decision_notes" TEXT NOT NULL DEFAULT '',
    "approved_at" TIMESTAMPTZ,
    "killed_at" TIMESTAMPTZ,
    "build_started_at" TIMESTAMPTZ,
    "build_finished_at" TIMESTAMPTZ,
    "last_build_error" TEXT NOT NULL DEFAULT '',
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
CREATE INDEX "projects_status_priority_idx" ON "projects"("status", "priority", "created_at");
CREATE INDEX "projects_approved_at_idx" ON "projects"("approved_at");
CREATE INDEX "projects_killed_at_idx" ON "projects"("killed_at");

-- Dashboard review queue view
CREATE OR REPLACE VIEW "project_review_queue" AS
SELECT
    p."id" AS "project_id",
    p."idea_id",
    p."slug",
    p."project_type",
    p."status",
    p."priority",
    p."decision_notes",
    p."approved_at",
    p."killed_at",
    p."build_started_at",
    p."build_finished_at",
    p."last_build_error",
    p."plan",
    p."created_at" AS "project_created_at",
    i."title" AS "idea_title",
    i."summary" AS "idea_summary",
    i."audience" AS "idea_audience",
    i."pain" AS "idea_pain",
    i."workaround" AS "idea_workaround",
    i."frequency" AS "idea_frequency",
    i."why_now" AS "idea_why_now",
    i."source_excerpt" AS "idea_source_excerpt",
    i."sources" AS "idea_sources",
    i."asset_type_hint",
    e."id" AS "evaluation_id",
    e."score_total" AS "evaluation_score_total",
    e."recommendation" AS "evaluation_recommendation",
    e."notes" AS "evaluation_notes",
    e."created_at" AS "evaluation_created_at"
FROM "projects" p
JOIN "ideas" i ON i."id" = p."idea_id"
LEFT JOIN LATERAL (
    SELECT ev."id", ev."score_total", ev."recommendation", ev."notes", ev."created_at"
    FROM "evaluations" ev
    WHERE ev."idea_id" = p."idea_id"
    ORDER BY ev."created_at" DESC
    LIMIT 1
) e ON true;

-- ── MIGRATION: run these in Supabase SQL editor if tables already exist ────────
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "frequency" TEXT NOT NULL DEFAULT 'unknown';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "mvp_idea" TEXT NOT NULL DEFAULT '';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "distribution_paths" JSONB NOT NULL DEFAULT '[]';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "founder_fit_reason" JSONB NOT NULL DEFAULT '[]';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "expansion_paths" JSONB NOT NULL DEFAULT '[]';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "why_now" TEXT NOT NULL DEFAULT '';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "source_excerpt" TEXT NOT NULL DEFAULT '';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "founder_fit_score" INTEGER NOT NULL DEFAULT 5;
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "opportunity_confidence" TEXT NOT NULL DEFAULT 'low';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "evidence_confidence" TEXT NOT NULL DEFAULT 'low';
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "source_type_count" INTEGER NOT NULL DEFAULT 1;
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "source_lane_count" INTEGER NOT NULL DEFAULT 1;
-- ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "canonical_tags" TEXT[] NOT NULL DEFAULT '{}';
-- ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 3;
-- ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "decision_notes" TEXT NOT NULL DEFAULT '';
-- ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ;
-- ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "killed_at" TIMESTAMPTZ;
-- ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "build_started_at" TIMESTAMPTZ;
-- ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "build_finished_at" TIMESTAMPTZ;
-- ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "last_build_error" TEXT NOT NULL DEFAULT '';
-- CREATE OR REPLACE VIEW "project_review_queue" AS ... ;
