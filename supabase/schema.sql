-- ============================================================
-- API Watcher - Supabase Schema
-- Supabase 대시보드 > SQL Editor 에서 실행
-- ============================================================

-- ============================================================
-- [기존 DB 마이그레이션] Prisma에서 Supabase Auth로 전환 시
-- ============================================================

-- 1. 기존 users 테이블 FK 제거 (Supabase Auth가 users 관리)
ALTER TABLE IF EXISTS "projects" DROP CONSTRAINT IF EXISTS "projects_userId_fkey";

-- 2. 기존 users 테이블 제거
DROP TABLE IF EXISTS "users" CASCADE;


-- ============================================================
-- [신규 Supabase 프로젝트] 처음 설정 시 아래 테이블 생성
-- (이미 테이블이 있다면 이 부분은 건너뜀)
-- ============================================================

CREATE TABLE IF NOT EXISTS "projects" (
    "id"            TEXT        NOT NULL,
    "name"          TEXT        NOT NULL,
    "swaggerUrl"    TEXT        NOT NULL,
    "apiKey"        TEXT,
    "apiKeyHeader"  TEXT,
    "userId"        TEXT,                    -- Supabase auth.users.id (UUID)
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "lastCheckedAt" TIMESTAMPTZ,
    "isActive"      BOOLEAN     NOT NULL DEFAULT true,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "snapshots" (
    "id"        TEXT        NOT NULL,
    "projectId" TEXT        NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "data"      TEXT        NOT NULL,
    "version"   TEXT        NOT NULL,
    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "diff_results" (
    "id"                 TEXT        NOT NULL,
    "projectId"          TEXT        NOT NULL,
    "previousSnapshotId" TEXT        NOT NULL,
    "currentSnapshotId"  TEXT        NOT NULL,
    "comparedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "endpointDiffs"      JSONB       NOT NULL,
    "summary"            JSONB       NOT NULL,
    CONSTRAINT "diff_results_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "snapshots"
    ADD CONSTRAINT "snapshots_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "diff_results"
    ADD CONSTRAINT "diff_results_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "diff_results"
    ADD CONSTRAINT "diff_results_previousSnapshotId_fkey"
    FOREIGN KEY ("previousSnapshotId") REFERENCES "snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "diff_results"
    ADD CONSTRAINT "diff_results_currentSnapshotId_fkey"
    FOREIGN KEY ("currentSnapshotId") REFERENCES "snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "snapshots_projectId_idx"          ON "snapshots"("projectId");
CREATE INDEX IF NOT EXISTS "snapshots_projectId_createdAt_idx" ON "snapshots"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "diff_results_projectId_idx"        ON "diff_results"("projectId");
CREATE INDEX IF NOT EXISTS "diff_results_projectId_comparedAt_idx" ON "diff_results"("projectId", "comparedAt");


-- ============================================================
-- updatedAt 자동 갱신 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at ON "projects";
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON "projects"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- RLS (Row Level Security)
-- 프론트에서 anon 키로 직접 Supabase 쿼리 시 필수
-- ============================================================

ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "diff_results" ENABLE ROW LEVEL SECURITY;

-- projects: 본인 데이터만 접근
CREATE POLICY "projects_owner_only" ON "projects"
    FOR ALL USING (auth.uid()::text = "userId");

-- snapshots: 본인 프로젝트의 스냅샷만 접근
CREATE POLICY "snapshots_owner_only" ON "snapshots"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "projects"
            WHERE "projects"."id" = "snapshots"."projectId"
            AND "projects"."userId" = auth.uid()::text
        )
    );

-- diff_results: 본인 프로젝트의 diff만 접근
CREATE POLICY "diff_results_owner_only" ON "diff_results"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "projects"
            WHERE "projects"."id" = "diff_results"."projectId"
            AND "projects"."userId" = auth.uid()::text
        )
    );
