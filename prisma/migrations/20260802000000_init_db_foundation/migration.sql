-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('DEVELOPMENT', 'SANDBOX', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "CapabilityCode" AS ENUM ('NICKNAME', 'REGION', 'FIRST_TOPUP', 'EMAIL', 'ROLE', 'SERVER', 'CLAN', 'LEVEL');

-- CreateEnum
CREATE TYPE "CircuitState" AS ENUM ('CLOSED', 'OPEN', 'HALF_OPEN');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('SUCCESS', 'FAILED', 'TIMEOUT', 'FALLBACK', 'CIRCUIT_BROKEN');

-- CreateEnum
CREATE TYPE "FeatureFlagTarget" AS ENUM ('ALL', 'ADMIN_ONLY', 'PLAYGROUND_ONLY', 'PUBLIC_API_ONLY', 'PERCENTAGE_ROLLOUT');

-- CreateEnum
CREATE TYPE "SystemLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon_url" TEXT,
    "user_id_regex" TEXT,
    "zone_id_regex" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_endpoints" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "timeout_ms" INTEGER NOT NULL DEFAULT 3000,
    "max_retries" INTEGER NOT NULL DEFAULT 2,
    "cost_per_request" INTEGER NOT NULL DEFAULT 0,
    "daily_limit" INTEGER NOT NULL DEFAULT 0,
    "monthly_limit" INTEGER NOT NULL DEFAULT 0,
    "current_daily_count" INTEGER NOT NULL DEFAULT 0,
    "circuit_state" "CircuitState" NOT NULL DEFAULT 'CLOSED',
    "consecutive_errors" INTEGER NOT NULL DEFAULT 0,
    "circuit_open_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "provider_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capabilities" (
    "id" TEXT NOT NULL,
    "code" "CapabilityCode" NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_validation_mappings" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "endpoint_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "adapter_key" TEXT NOT NULL,
    "request_param_mapping" JSONB NOT NULL,
    "response_field_mapping" JSONB NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "game_validation_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target" "FeatureFlagTarget" NOT NULL DEFAULT 'ALL',
    "rollout_percentage" INTEGER NOT NULL DEFAULT 100,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_versions" (
    "id" TEXT NOT NULL,
    "version_num" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_accounts" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "zone_id" TEXT,
    "region" TEXT,
    "first_topup_available" BOOLEAN NOT NULL DEFAULT false,
    "extra_data" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "test_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playground_histories" (
    "id" TEXT NOT NULL,
    "game_id" TEXT,
    "input_user_id" TEXT NOT NULL,
    "input_zone_id" TEXT,
    "status" TEXT NOT NULL,
    "response_time_ms" INTEGER NOT NULL,
    "result_summary" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playground_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_logs" (
    "id" TEXT NOT NULL,
    "game_id" TEXT,
    "provider_id" TEXT,
    "endpoint_id" TEXT,
    "input_user_id" TEXT NOT NULL,
    "input_zone_id" TEXT,
    "status" "ValidationStatus" NOT NULL,
    "response_time_ms" INTEGER NOT NULL,
    "request_json" JSONB NOT NULL,
    "raw_response" JSONB NOT NULL,
    "normalized_response" JSONB NOT NULL,
    "error_message" TEXT,
    "client_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_snapshots" (
    "id" TEXT NOT NULL,
    "log_id" TEXT NOT NULL,
    "raw_request_headers" JSONB NOT NULL,
    "raw_request_body" JSONB NOT NULL,
    "raw_response_headers" JSONB NOT NULL,
    "raw_response_body" JSONB NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_activity_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "action" TEXT NOT NULL,
    "target_entity" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "level" "SystemLogLevel" NOT NULL DEFAULT 'INFO',
    "event" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "rate_limit" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "games_code_key" ON "games"("code");

-- CreateIndex
CREATE INDEX "games_code_idx" ON "games"("code");

-- CreateIndex
CREATE INDEX "games_is_active_idx" ON "games"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "providers_code_key" ON "providers"("code");

-- CreateIndex
CREATE INDEX "providers_code_idx" ON "providers"("code");

-- CreateIndex
CREATE INDEX "providers_status_idx" ON "providers"("status");

-- CreateIndex
CREATE INDEX "provider_endpoints_provider_id_idx" ON "provider_endpoints"("provider_id");

-- CreateIndex
CREATE INDEX "provider_endpoints_priority_idx" ON "provider_endpoints"("priority");

-- CreateIndex
CREATE INDEX "provider_endpoints_environment_idx" ON "provider_endpoints"("environment");

-- CreateIndex
CREATE UNIQUE INDEX "provider_endpoints_provider_id_environment_priority_key" ON "provider_endpoints"("provider_id", "environment", "priority");

-- CreateIndex
CREATE INDEX "capabilities_code_idx" ON "capabilities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "capabilities_code_version_key" ON "capabilities"("code", "version");

-- CreateIndex
CREATE INDEX "game_validation_mappings_game_id_capability_id_idx" ON "game_validation_mappings"("game_id", "capability_id");

-- CreateIndex
CREATE INDEX "game_validation_mappings_provider_id_endpoint_id_idx" ON "game_validation_mappings"("provider_id", "endpoint_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_validation_mappings_game_id_capability_id_provider_id_key" ON "game_validation_mappings"("game_id", "capability_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_code_key" ON "feature_flags"("code");

-- CreateIndex
CREATE INDEX "feature_flags_code_idx" ON "feature_flags"("code");

-- CreateIndex
CREATE INDEX "config_versions_version_num_idx" ON "config_versions"("version_num");

-- CreateIndex
CREATE INDEX "test_accounts_game_id_idx" ON "test_accounts"("game_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_accounts_game_id_user_id_zone_id_key" ON "test_accounts"("game_id", "user_id", "zone_id");

-- CreateIndex
CREATE INDEX "playground_histories_created_at_idx" ON "playground_histories"("created_at");

-- CreateIndex
CREATE INDEX "playground_histories_game_id_idx" ON "playground_histories"("game_id");

-- CreateIndex
CREATE INDEX "validation_logs_created_at_idx" ON "validation_logs"("created_at");

-- CreateIndex
CREATE INDEX "validation_logs_game_id_idx" ON "validation_logs"("game_id");

-- CreateIndex
CREATE INDEX "validation_logs_status_idx" ON "validation_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "validation_snapshots_log_id_key" ON "validation_snapshots"("log_id");

-- CreateIndex
CREATE INDEX "admin_activity_logs_created_at_idx" ON "admin_activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "admin_activity_logs_admin_id_idx" ON "admin_activity_logs"("admin_id");

-- CreateIndex
CREATE INDEX "system_logs_created_at_idx" ON "system_logs"("created_at");

-- CreateIndex
CREATE INDEX "system_logs_level_idx" ON "system_logs"("level");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- AddForeignKey
ALTER TABLE "provider_endpoints" ADD CONSTRAINT "provider_endpoints_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_validation_mappings" ADD CONSTRAINT "game_validation_mappings_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_validation_mappings" ADD CONSTRAINT "game_validation_mappings_capability_id_fkey" FOREIGN KEY ("capability_id") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_validation_mappings" ADD CONSTRAINT "game_validation_mappings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_validation_mappings" ADD CONSTRAINT "game_validation_mappings_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "provider_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_versions" ADD CONSTRAINT "config_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_accounts" ADD CONSTRAINT "test_accounts_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playground_histories" ADD CONSTRAINT "playground_histories_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_logs" ADD CONSTRAINT "validation_logs_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_logs" ADD CONSTRAINT "validation_logs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_logs" ADD CONSTRAINT "validation_logs_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "provider_endpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_snapshots" ADD CONSTRAINT "validation_snapshots_log_id_fkey" FOREIGN KEY ("log_id") REFERENCES "validation_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
