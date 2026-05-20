import { useTranslation } from 'react-i18next';

import type { AppNamespace } from '@/i18n/resources';

export function useAppTranslation(namespace: AppNamespace = 'common') {
  return useTranslation(namespace);
}
