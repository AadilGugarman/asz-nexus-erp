import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enBilling from './locales/en/billing.json';
import enNavbar from './locales/en/navbar.json';
import enSettings from './locales/en/settings.json';
import guCommon from './locales/gu/common.json';
import guDashboard from './locales/gu/dashboard.json';
import guBilling from './locales/gu/billing.json';
import guNavbar from './locales/gu/navbar.json';
import guSettings from './locales/gu/settings.json';

export const namespaces = ['common', 'settings', 'navbar', 'dashboard', 'billing'] as const;

export type AppNamespace = (typeof namespaces)[number];

export const resources = {
  en: {
    common: enCommon,
    settings: enSettings,
    navbar: enNavbar,
    dashboard: enDashboard,
    billing: enBilling,
  },
  gu: {
    common: guCommon,
    settings: guSettings,
    navbar: guNavbar,
    dashboard: guDashboard,
    billing: guBilling,
  },
} as const;
