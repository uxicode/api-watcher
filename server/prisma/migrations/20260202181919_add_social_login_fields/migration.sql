-- AlterTable: passwordHash를 nullable로 변경
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable: provider 컬럼 추가 (기본값 'email')
ALTER TABLE "users" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'email';

-- AlterTable: providerId 컬럼 추가
ALTER TABLE "users" ADD COLUMN "providerId" TEXT;

-- CreateIndex: provider와 providerId의 복합 unique 제약조건
CREATE UNIQUE INDEX "users_provider_providerId_key" ON "users"("provider", "providerId");
