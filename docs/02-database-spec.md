# Product Specification: 02. Database Specification

## 1. Aturan Utama Database & Security

> [!IMPORTANT]
> 1. **Phase 1 Credential Management:** Secrets & API Tokens disimpan di `.env`. Database menyimpan konfigurasi non-sensitif (Base URL, Slugs, Timeout, Retry, Costs, Quotas, Regex, Weights).
> 2. **Immutable Audit Trail:** Tabel `admin_activity_logs` bersifat **Append-Only** (Dilarang ada aksi UPDATE atau DELETE).
> 3. **Backward Compatibility:** Perubahan skema data capability wajib mendaftarkan `version` baru di tabel `capabilities`.

---

## 2. Prisma Database Schema & ERD

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ------------------------------------------------------
// 1. ADMIN USER & AUTHENTICATION
// ------------------------------------------------------
model AdminUser {
  id           String             @id @default(uuid())
  email        String             @unique
  password     String             // Hashed with bcrypt
  name         String
  role         String             @default("ADMIN") // ADMIN, SUPERADMIN
  createdAt    DateTime           @default(now()) @map("created_at")
  updatedAt    DateTime           @updatedAt @map("updated_at")

  activityLogs AdminActivityLog[]
  configSnapshots ConfigVersion[]

  @@map("admin_users")
}

// ------------------------------------------------------
// 2. GAME CATALOG
// ------------------------------------------------------
model Game {
  id           String   @id @default(uuid())
  code         String   @unique // e.g. "mobile-legends", "free-fire"
  name         String   // e.g. "Mobile Legends: Bang Bang"
  iconUrl      String?  @map("icon_url")
  userIdRegex  String?  @map("user_id_regex")
  zoneIdRegex  String?  @map("zone_id_regex")
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  mappings           GameValidationMapping[]
  testAccounts       TestAccount[]
  logs               ValidationLog[]
  playgroundHistories PlaygroundHistory[]

  @@map("games")
}

// ------------------------------------------------------
// 3. PROVIDER CATALOG & COST MANAGEMENT
// ------------------------------------------------------
model Provider {
  id          String   @id @default(uuid())
  code        String   @unique // e.g. "melpa", "mobapay", "digiflazz"
  name        String
  description String?
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  endpoints   ProviderEndpoint[]
  mappings    GameValidationMapping[]
  logs        ValidationLog[]

  @@map("providers")
}

// ------------------------------------------------------
// 4. PROVIDER ENDPOINT
// ------------------------------------------------------
enum EndpointEnvironment {
  DEVELOPMENT
  SANDBOX
  STAGING
  PRODUCTION
}

enum CircuitState {
  CLOSED
  OPEN
  HALF_OPEN
}

model ProviderEndpoint {
  id                String              @id @default(uuid())
  providerId        String              @map("provider_id")
  name              String              // e.g. "Melpa MLBB Primary Prod"
  baseUrl           String              @map("base_url")
  environment       EndpointEnvironment @default(PRODUCTION)
  priority          Int                 @default(1)
  timeoutMs         Int                 @default(3000) @map("timeout_ms")
  maxRetries        Int                 @default(2) @map("max_retries")
  
  costPerRequest    Int                 @default(0) @map("cost_per_request")
  dailyLimit        Int                 @default(0) @map("daily_limit")
  monthlyLimit      Int                 @default(0) @map("monthly_limit")
  currentDailyCount Int                 @default(0) @map("current_daily_count")
  
  circuitState      CircuitState        @default(CLOSED) @map("circuit_state")
  consecutiveErrors Int                 @default(0) @map("consecutive_errors")
  circuitOpenUntil  DateTime?           @map("circuit_open_until")
  isActive          Boolean             @default(true) @map("is_active")
  createdAt         DateTime            @default(now()) @map("created_at")
  updatedAt         DateTime            @updatedAt @map("updated_at")

  provider          Provider            @relation(fields: [providerId], references: [id], onDelete: Cascade)
  mappings          GameValidationMapping[]
  logs              ValidationLog[]

  @@map("provider_endpoints")
}

// ------------------------------------------------------
// 5. CAPABILITY DEFINITION & VERSIONING
// ------------------------------------------------------
model Capability {
  id          String   @id @default(uuid())
  code        String   // e.g. "NICKNAME", "REGION", "FIRST_TOPUP"
  version     String   @default("v1") // e.g. "v1", "v2"
  name        String   // e.g. "Account Nickname Verification v1"
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  mappings    GameValidationMapping[]

  @@unique([code, version])
  @@map("capabilities")
}

// ------------------------------------------------------
// 6. GAME VALIDATION MAPPING
// ------------------------------------------------------
model GameValidationMapping {
  id                   String   @id @default(uuid())
  gameId               String   @map("game_id")
  capabilityId         String   @map("capability_id")
  providerId           String   @map("provider_id")
  endpointId           String   @map("endpoint_id")
  slug                 String   
  priority             Int      @default(1)
  weight               Int      @default(100)
  isActive             Boolean  @default(true) @map("is_active")
  adapterKey           String   @map("adapter_key")
  
  requestParamMapping  Json     @map("request_param_mapping")
  responseFieldMapping Json     @map("response_field_mapping")
  
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")

  game                 Game             @relation(fields: [gameId], references: [id], onDelete: Cascade)
  capability           Capability       @relation(fields: [capabilityId], references: [id], onDelete: Cascade)
  provider             Provider         @relation(fields: [providerId], references: [id], onDelete: Cascade)
  endpoint             ProviderEndpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@unique([gameId, capabilityId, providerId])
  @@map("game_validation_mappings")
}

// ------------------------------------------------------
// 7. GENERIC FEATURE FLAGS ENGINE
// ------------------------------------------------------
enum FeatureFlagTarget {
  ALL
  ADMIN_ONLY
  PLAYGROUND_ONLY
  PUBLIC_API_ONLY
  PERCENTAGE_ROLLOUT
}

model FeatureFlag {
  id                 String            @id @default(uuid())
  code               String            @unique // e.g. "validation.smart-scoring", "provider.melpa"
  name               String
  description        String?
  target             FeatureFlagTarget @default(ALL)
  rolloutPercentage  Int               @default(100) @map("rollout_percentage")
  isEnabled          Boolean           @default(false) @map("is_enabled")
  createdAt          DateTime          @default(now()) @map("created_at")
  updatedAt          DateTime          @updatedAt @map("updated_at")

  @@map("feature_flags")
}

// ------------------------------------------------------
// 8. CONFIG VERSIONING
// ------------------------------------------------------
model ConfigVersion {
  id          String    @id @default(uuid())
  versionNum  Int       @map("version_num")
  description String    
  snapshotJson Json     @map("snapshot_json")
  createdBy   String    @map("created_by")
  createdAt   DateTime  @default(now()) @map("created_at")

  admin       AdminUser @relation(fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([versionNum])
  @@map("config_versions")
}

// ------------------------------------------------------
// 9. TEST ACCOUNT & PLAYGROUND HISTORY
// ------------------------------------------------------
model TestAccount {
  id                  String   @id @default(uuid())
  gameId              String   @map("game_id")
  label               String   
  userId              String   @map("user_id")
  zoneId              String?  @map("zone_id")
  region              String?
  firstTopupAvailable Boolean  @default(false) @map("first_topup_available")
  extraData           Json?    @map("extra_data")
  isActive            Boolean  @default(true) @map("is_active")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  game                Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)

  @@map("test_accounts")
}

model PlaygroundHistory {
  id                 String   @id @default(uuid())
  gameId             String   @map("game_id")
  inputUserId        String   @map("input_user_id")
  inputZoneId        String?  @map("input_zone_id")
  status             String   
  responseTimeMs     Int      @map("response_time_ms")
  resultSummary      Json     @map("result_summary")
  createdAt          DateTime @default(now()) @map("created_at")

  game               Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)

  @@index([createdAt])
  @@map("playground_histories")
}

// ------------------------------------------------------
// 10. LOGGING, SNAPSHOTS & IMMUTABLE AUDIT TRAIL
// ------------------------------------------------------
enum ValidationStatus {
  SUCCESS
  FAILED
  TIMEOUT
  FALLBACK
  CIRCUIT_BROKEN
}

model ValidationLog {
  id                 String           @id @default(uuid())
  gameId             String?          @map("game_id")
  providerId         String?          @map("provider_id")
  endpointId         String?          @map("endpoint_id")
  inputUserId        String           @map("input_user_id")
  inputZoneId        String?          @map("input_zone_id")
  status             ValidationStatus
  responseTimeMs     Int              @map("response_time_ms")
  requestJson        Json             @map("request_json")
  rawResponse        Json             @map("raw_response")
  normalizedResponse Json             @map("normalized_response")
  errorMessage       String?          @map("error_message")
  clientIp           String?          @map("client_ip")
  createdAt          DateTime         @default(now()) @map("created_at")

  game               Game?            @relation(fields: [gameId], references: [id], onDelete: SetNull)
  provider           Provider?        @relation(fields: [providerId], references: [id], onDelete: SetNull)
  endpoint           ProviderEndpoint? @relation(fields: [endpointId], references: [id], onDelete: SetNull)
  snapshot           ValidationSnapshot?

  @@index([createdAt])
  @@index([gameId])
  @@index([status])
  @@map("validation_logs")
}

model ValidationSnapshot {
  id                 String        @id @default(uuid())
  logId              String        @unique @map("log_id")
  rawRequestHeaders  Json          @map("raw_request_headers")
  rawRequestBody     Json          @map("raw_request_body")
  rawResponseHeaders Json          @map("raw_response_headers")
  rawResponseBody    Json          @map("raw_response_body")
  durationMs         Int           @map("duration_ms")
  createdAt          DateTime      @default(now()) @map("created_at")

  log                ValidationLog @relation(fields: [logId], references: [id], onDelete: Cascade)

  @@map("validation_snapshots")
}

model AdminActivityLog {
  id           String   @id @default(uuid())
  adminId      String   @map("admin_id")
  action       String   
  targetEntity String   @map("target_entity")
  targetId     String   @map("target_id")
  oldValue     Json?    @map("old_value")
  newValue     Json?    @map("new_value")
  ipAddress    String?  @map("ip_address")
  userAgent    String?  @map("user_agent")
  createdAt    DateTime @default(now()) @map("created_at")

  admin        AdminUser @relation(fields: [adminId], references: [id], onDelete: Cascade)

  @@index([createdAt])
  @@index([adminId])
  @@map("admin_activity_logs")
}

model SystemLog {
  id        String         @id @default(uuid())
  level     SystemLogLevel @default(INFO)
  event     String         
  details   Json
  createdAt DateTime       @default(now()) @map("created_at")

  @@index([createdAt])
  @@map("system_logs")
}

model ApiKey {
  id          String   @id @default(uuid())
  clientName  String   @map("client_name")
  keyHash     String   @unique @map("key_hash")
  keyPrefix   String   @map("key_prefix")
  rateLimit   Int      @default(100) @map("rate_limit")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("api_keys")
}
```
