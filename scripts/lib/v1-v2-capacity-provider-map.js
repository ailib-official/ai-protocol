/**
 * Shared v1 provider id → v2-alpha dist filename for capacity migrate/verify.
 * [GOV-007] Single source — do not duplicate in migrate/verify scripts.
 */
export const PROVIDER_MAP = {
  openai: 'openai.json',
  anthropic: 'anthropic.json',
  google: 'gemini.json',
  gemini: 'gemini.json',
};
