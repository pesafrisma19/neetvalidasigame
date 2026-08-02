export interface ValidationContext {
  gameCode: string;
  userId: string;
  zoneId?: string;
  slug: string;
  baseUrl: string;
  requestParamMapping: Record<string, string>;
  responseFieldMapping: Record<string, string>;
  timeoutMs: number;
}

export interface NormalizedResult {
  nickname?: string;
  region?: string;
  firstTopupAvailable?: boolean;
  rawResponse: unknown;
  responseTimeMs: number;
}

export interface BaseProviderAdapter {
  adapterKey: string;
  execute(ctx: ValidationContext): Promise<NormalizedResult>;
}

// Utility function to extract nested values from JSON using dot-notation (e.g. "data.role_name")
export function extractNestedField(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}
