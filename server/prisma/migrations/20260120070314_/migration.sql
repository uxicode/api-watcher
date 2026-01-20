-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "swaggerUrl" TEXT NOT NULL,
    "apiKey" TEXT,
    "apiKeyHeader" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastCheckedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshots" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" TEXT NOT NULL,
    "version" TEXT NOT NULL,

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diff_results" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "previousSnapshotId" TEXT NOT NULL,
    "currentSnapshotId" TEXT NOT NULL,
    "comparedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endpointDiffs" JSONB NOT NULL,
    "summary" JSONB NOT NULL,

    CONSTRAINT "diff_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "snapshots_projectId_idx" ON "snapshots"("projectId");

-- CreateIndex
CREATE INDEX "snapshots_projectId_createdAt_idx" ON "snapshots"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "diff_results_projectId_idx" ON "diff_results"("projectId");

-- CreateIndex
CREATE INDEX "diff_results_projectId_comparedAt_idx" ON "diff_results"("projectId", "comparedAt");

-- AddForeignKey
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diff_results" ADD CONSTRAINT "diff_results_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diff_results" ADD CONSTRAINT "diff_results_previousSnapshotId_fkey" FOREIGN KEY ("previousSnapshotId") REFERENCES "snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diff_results" ADD CONSTRAINT "diff_results_currentSnapshotId_fkey" FOREIGN KEY ("currentSnapshotId") REFERENCES "snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
