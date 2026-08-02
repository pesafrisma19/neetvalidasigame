export interface GameCatalog {
  id: string;
  code: string;
  name: string;
  iconUrl?: string;
  userIdRegex?: string;
  zoneIdRegex?: string;
}

export interface FirstTopupTier {
  diamonds: number;
  bonus: number;
  price: number;
  available: boolean;
  statusText: string;
}

export interface ValidationResponse {
  gameCode: string;
  userId: string;
  zoneId?: string;
  capabilities: {
    nickname?: string;
    region?: string;
    firstTopupAvailable?: boolean;
    firstTopupTiers?: FirstTopupTier[];
  };
  meta: {
    providersUsed: string[];
    responseTimeMs: number;
  };
}

export interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T | null;
  meta: Record<string, any> | null;
  error: {
    code: string;
    details?: any;
  } | null;
}
