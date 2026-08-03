import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'testing', 'staging', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET is required and cannot be empty',
  }).min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_REFRESH_SECRET: z.string({
    required_error: 'JWT_REFRESH_SECRET is required and cannot be empty',
  }).min(16, 'JWT_REFRESH_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  MELPA_TOKEN: z.string().optional().default(''),
  MOBAPAY_TOKEN: z.string().optional().default(''),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const formattedErrors = parsedEnv.error.flatten().fieldErrors;
  console.error('\n❌ FATAL STARTUP ERROR: Invalid environment variables configuration!');
  console.error(JSON.stringify(formattedErrors, null, 2));
  console.error('\nServer boot aborted. Please provide required environment variables in .env file.\n');
  throw new Error('FATAL: Invalid environment variables configuration. Server startup aborted.');
}

export const env = parsedEnv.data;
