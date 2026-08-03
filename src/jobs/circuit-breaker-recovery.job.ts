import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

let recoveryTimer: NodeJS.Timeout | null = null;

/**
 * Periodically audits provider endpoints in OPEN state whose cooldown (circuitOpenUntil) has expired
 * and transitions them to HALF_OPEN to enable controlled single-probe verification.
 */
export async function recoverCircuitBreakers(): Promise<number> {
  try {
    const now = new Date();
    const result = await prisma.providerEndpoint.updateMany({
      where: {
        circuitState: 'OPEN',
        circuitOpenUntil: {
          lte: now,
        },
      },
      data: {
        circuitState: 'HALF_OPEN',
      },
    });

    if (result.count > 0) {
      logger.info(
        { recoveredCount: result.count },
        `✅ Circuit Breaker Recovery: Transitioned ${result.count} endpoint(s) from OPEN to HALF_OPEN for probing`
      );
    }

    return result.count;
  } catch (err: any) {
    logger.error({ err: err.message }, '❌ Error running Circuit Breaker recovery job');
    return 0;
  }
}

/**
 * Starts the background Circuit Breaker Auto-Recovery worker.
 * Includes PM2 Cluster instance guard (only runs on instance 0 or single fork instance).
 */
export function startCircuitBreakerJob(intervalMs = 30000): void {
  const instanceId = process.env.NODE_APP_INSTANCE || process.env.INSTANCE_ID || '0';

  if (instanceId !== '0') {
    logger.info({ instanceId }, 'Skipping Circuit Breaker cron job initialization on non-primary PM2 cluster instance');
    return;
  }

  if (recoveryTimer) {
    clearInterval(recoveryTimer);
  }

  logger.info({ intervalMs }, '⚡ Initializing Circuit Breaker Auto-Recovery Background Job');

  // Run immediate initial check on startup
  recoverCircuitBreakers().catch((err) =>
    logger.error({ err }, 'Failed initial circuit breaker recovery execution')
  );

  // Schedule recurring interval
  recoveryTimer = setInterval(() => {
    recoverCircuitBreakers().catch((err) =>
      logger.error({ err }, 'Failed scheduled circuit breaker recovery execution')
    );
  }, intervalMs);
}

export function stopCircuitBreakerJob(): void {
  if (recoveryTimer) {
    clearInterval(recoveryTimer);
    recoveryTimer = null;
  }
}
