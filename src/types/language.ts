export const SUPPORTED_LANGUAGES = ['en', 'gu'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

export function isSupportedLanguage(value: string): value is AppLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function normalizeLanguage(value: string | null | undefined): AppLanguage {
  if (!value) return DEFAULT_LANGUAGE;
  const normalized = value.toLowerCase();
  const base = normalized.split('-')[0];
  return base === 'gu' ? 'gu' : 'en';
}
