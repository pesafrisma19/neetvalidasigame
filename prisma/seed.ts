import { PrismaClient, CapabilityCode, FeatureFlagTarget } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...');

  // 1. Seed SuperAdmin User
  const adminEmail = 'admin@validation.platform';
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('AdminPass123!', 10);
    const superAdmin = await prisma.adminUser.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPERADMIN',
      },
    });
    console.log('✅ Created SuperAdmin user:', superAdmin.email);
  } else {
    console.log('ℹ️ SuperAdmin user already exists:', adminEmail);
  }

  // 2. Seed Default Capabilities
  const defaultCapabilities = [
    { code: CapabilityCode.NICKNAME, version: 'v1', name: 'Account Nickname Verification v1', description: 'Extract player username/nickname' },
    { code: CapabilityCode.REGION, version: 'v1', name: 'Account Region Check v1', description: 'Extract account country/region' },
    { code: CapabilityCode.FIRST_TOPUP, version: 'v1', name: 'First Topup Eligibility v1', description: 'Check if first topup bonus is available' },
    { code: CapabilityCode.EMAIL, version: 'v1', name: 'Account Email Verification v1', description: 'Extract linked account email' },
    { code: CapabilityCode.ROLE, version: 'v1', name: 'Account Role Check v1', description: 'Extract player role/character' },
    { code: CapabilityCode.SERVER, version: 'v1', name: 'Server Zone Verification v1', description: 'Verify zone ID & server status' },
    { code: CapabilityCode.CLAN, version: 'v1', name: 'Clan / Guild Verification v1', description: 'Extract clan info' },
    { code: CapabilityCode.LEVEL, version: 'v1', name: 'Account Level Check v1', description: 'Extract player level' },
  ];

  for (const cap of defaultCapabilities) {
    await prisma.capability.upsert({
      where: {
        code_version: {
          code: cap.code,
          version: cap.version,
        },
      },
      update: {
        name: cap.name,
        description: cap.description,
      },
      create: cap,
    });
  }
  console.log(`✅ Seeded ${defaultCapabilities.length} Capabilities.`);

  // 3. Seed Default Feature Flags
  const defaultFeatureFlags = [
    { code: 'validation.smart-scoring', name: 'Smart Weighted Scoring Engine', description: 'Enable dynamic score calculation for endpoints', isEnabled: false, target: FeatureFlagTarget.ALL },
    { code: 'validation.cache', name: 'Validation Caching Layer', description: 'Enable short TTL caching for nickname responses', isEnabled: false, target: FeatureFlagTarget.ALL },
    { code: 'provider.melpa', name: 'Melpa Provider Plugin', description: 'Enable Melpa provider integration', isEnabled: true, target: FeatureFlagTarget.ALL },
    { code: 'provider.mobapay', name: 'Mobapay Provider Plugin', description: 'Enable Mobapay provider integration', isEnabled: true, target: FeatureFlagTarget.ALL },
    { code: 'playground.history', name: 'Playground History Drawer', description: 'Auto-save playground validation runs', isEnabled: true, target: FeatureFlagTarget.ADMIN_ONLY },
    { code: 'playground.sandbox', name: 'Playground Sandbox Mode', description: 'Enable sandbox simulation toggle', isEnabled: true, target: FeatureFlagTarget.ADMIN_ONLY },
  ];

  for (const flag of defaultFeatureFlags) {
    await prisma.featureFlag.upsert({
      where: { code: flag.code },
      update: {
        name: flag.name,
        description: flag.description,
        isEnabled: flag.isEnabled,
      },
      create: flag,
    });
  }
  console.log(`✅ Seeded ${defaultFeatureFlags.length} Feature Flags.`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
