import { BRAND_TAGLINE } from '@/lib/brand'

export type Language = 'en' | 'hi' | 'gu'

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'gu', label: 'ગુજરાતી' },
]

export interface Dictionary {
  signInTo: (brand: string) => string
  tagline: string
  subtitle: string
  email: string
  password: string
  signIn: string
  signingIn: string
  showPassword: string
  hidePassword: string
  capsLockOn: string
  emailRequired: string
  emailInvalid: string
  passwordRequired: string
  language: string
}

export const translations: Record<Language, Dictionary> = {
  en: {
    signInTo: (brand) => `Sign in to ${brand}`,
    tagline: BRAND_TAGLINE.en,
    subtitle: 'Enter your email and password to continue.',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    capsLockOn: 'Caps Lock is on',
    emailRequired: 'Email is required',
    emailInvalid: 'Enter a valid email address',
    passwordRequired: 'Password is required',
    language: 'Language',
  },
  hi: {
    signInTo: (brand) => `${brand} में साइन इन करें`,
    tagline: BRAND_TAGLINE.hi,
    subtitle: 'जारी रखने के लिए अपना ईमेल और पासवर्ड दर्ज करें।',
    email: 'ईमेल',
    password: 'पासवर्ड',
    signIn: 'साइन इन करें',
    signingIn: 'साइन इन हो रहा है…',
    showPassword: 'पासवर्ड दिखाएँ',
    hidePassword: 'पासवर्ड छिपाएँ',
    capsLockOn: 'Caps Lock चालू है',
    emailRequired: 'ईमेल आवश्यक है',
    emailInvalid: 'मान्य ईमेल पता दर्ज करें',
    passwordRequired: 'पासवर्ड आवश्यक है',
    language: 'भाषा',
  },
  gu: {
    signInTo: (brand) => `${brand} માં સાઇન ઇન કરો`,
    tagline: BRAND_TAGLINE.gu,
    subtitle: 'ચાલુ રાખવા માટે તમારો ઇમેઇલ અને પાસવર્ડ દાખલ કરો.',
    email: 'ઇમેઇલ',
    password: 'પાસવર્ડ',
    signIn: 'સાઇન ઇન કરો',
    signingIn: 'સાઇન ઇન થઈ રહ્યું છે…',
    showPassword: 'પાસવર્ડ બતાવો',
    hidePassword: 'પાસવર્ડ છુપાવો',
    capsLockOn: 'Caps Lock ચાલુ છે',
    emailRequired: 'ઇમેઇલ જરૂરી છે',
    emailInvalid: 'માન્ય ઇમેઇલ સરનામું દાખલ કરો',
    passwordRequired: 'પાસવર્ડ જરૂરી છે',
    language: 'ભાષા',
  },
}
