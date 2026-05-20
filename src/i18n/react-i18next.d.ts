import 'i18next';

import type billing from './locales/en/billing.json';
import type common from './locales/en/common.json';
import type dashboard from './locales/en/dashboard.json';
import type navbar from './locales/en/navbar.json';
import type settings from './locales/en/settings.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      settings: typeof settings;
      navbar: typeof navbar;
      dashboard: typeof dashboard;
      billing: typeof billing;
    };
  }
}
