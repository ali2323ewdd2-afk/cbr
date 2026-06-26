/**
 * Internationalization config (next-intl).
 * Languages: Dutch (default), English, Arabic (RTL).
 */
export const locales = ['nl', 'en', 'ar'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'nl'

export const localeNames: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
  ar: 'العربية',
}

export const localeFlags: Record<Locale, string> = {
  nl: '🇳🇱',
  en: '🇬🇧',
  ar: '🇸🇦',
}

export const isRTL = (locale: string): boolean => locale === 'ar'

// Translation dictionaries (key examples — used in app)
export const translations: Record<Locale, Record<string, string>> = {
  nl: {
    'nav.dashboard': 'Dashboard',
    'nav.lessons': 'Lessen',
    'nav.exams': 'Examens',
    'nav.tutor': 'AI Tutor',
    'nav.planner': 'Planner',
    'nav.challenges': 'Challenges',
    'nav.mysteryBox': 'Mystery Box',
    'nav.referral': 'Referral',
    'nav.support': 'Support',
    'nav.profile': 'Profiel',
    'nav.logout': 'Uitloggen',
    'common.startFree': 'Start gratis',
    'common.login': 'Inloggen',
    'common.register': 'Registreren',
    'common.search': 'Zoeken',
    'common.loading': 'Laden...',
    'common.save': 'Opslaan',
    'common.cancel': 'Annuleren',
    'common.delete': 'Verwijderen',
    'common.confirm': 'Bevestigen',
    'landing.hero.title1': 'Leer slimmer.',
    'landing.hero.title2': 'Slaag sneller.',
    'landing.hero.subtitle': 'Meer dan 2.000 oefenvragen, CBR-stijl examens en AI-uitleg bij elke fout. Alles om in één keer te slagen.',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.lessons': 'Lessons',
    'nav.exams': 'Exams',
    'nav.tutor': 'AI Tutor',
    'nav.planner': 'Planner',
    'nav.challenges': 'Challenges',
    'nav.mysteryBox': 'Mystery Box',
    'nav.referral': 'Referral',
    'nav.support': 'Support',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    'common.startFree': 'Start free',
    'common.login': 'Login',
    'common.register': 'Register',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'landing.hero.title1': 'Learn smarter.',
    'landing.hero.title2': 'Pass faster.',
    'landing.hero.subtitle': 'Over 2,000 practice questions, CBR-style exams and AI explanations for every mistake. Everything to pass on your first try.',
  },
  ar: {
    'nav.dashboard': 'لوحة التحكم',
    'nav.lessons': 'الدروس',
    'nav.exams': 'الامتحانات',
    'nav.tutor': 'المعلم الذكي',
    'nav.planner': 'المخطط',
    'nav.challenges': 'التحديات',
    'nav.mysteryBox': 'صندوق الألغاز',
    'nav.referral': 'الإحالة',
    'nav.support': 'الدعم',
    'nav.profile': 'الملف الشخصي',
    'nav.logout': 'تسجيل الخروج',
    'common.startFree': 'ابدأ مجاناً',
    'common.login': 'تسجيل الدخول',
    'common.register': 'إنشاء حساب',
    'common.search': 'بحث',
    'common.loading': 'جار التحميل...',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.confirm': 'تأكيد',
    'landing.hero.title1': 'تعلم بذكاء.',
    'landing.hero.title2': 'انجح أسرع.',
    'landing.hero.subtitle': 'أكثر من 2000 سؤال تدريبي، امتحانات بأسلوب CBR وشروحات بالذكاء الاصطناعي لكل خطأ. كل ما تحتاجه للنجاح من المرة الأولى.',
  },
}

export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key] ?? translations[defaultLocale]?.[key] ?? key
}
