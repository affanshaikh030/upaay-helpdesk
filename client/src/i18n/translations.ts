import type { TicketPriority, TicketSentiment } from '@helpdesk/core'
import { BRAND_TAGLINE } from '@/lib/brand'

export type Language = 'en' | 'hi' | 'gu'

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'gu', label: 'ગુજરાતી' },
]

export interface Dictionary {
  // Login
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

  // Navigation
  navTickets: string
  navUsers: string
  signOut: string
  switchToLightMode: string
  switchToDarkMode: string
  switchToDesktopSite: string
  switchToMobileSite: string

  // Dashboard
  dashboardTitle: string
  dashboardSubtitle: string
  statsLoadFailed: string
  statsLoading: string
  statTotal: string
  statOpen: string
  statResolvedByAi: string
  statResolvedByAiPercent: string
  statAvgResolution: string
  ticketsPerDayTitle: string
  ticketsPerDayDescription: string
  chartAriaLabel: string
  ticketOne: string
  ticketMany: string
  viewAsTable: string
  columnDay: string
  columnTickets: string

  // Tickets list
  ticketsTitle: string
  ticketCount: (count: number) => string
  ticketsSubtitle: string
  ticketsLoadFailed: string
  ticketsLoading: string
  noTicketsMatch: string
  noTicketsYet: string
  search: string
  searchPlaceholder: string
  filterStatus: string
  filterCategory: string
  allStatuses: string
  allCategories: string
  uncategorized: string
  unassigned: string
  columnSubject: string
  columnFrom: string
  columnStatus: string
  columnCategory: string
  columnAssignedTo: string
  columnCreated: string

  // Pagination
  paginationLabel: string
  showing: (from: number, to: number, total: number) => string
  previous: string
  next: string
  pageOf: (page: number, pageCount: number) => string

  // Priority and sentiment (set by AI, editable by agents)
  priorities: Record<TicketPriority, string>
  sentiments: Record<TicketSentiment, string>
  columnPriority: string
  columnSentiment: string
  filterPriority: string
  filterSentiment: string
  allPriorities: string
  allSentiments: string
  notSet: string
  analyse: string
  analysing: string
  analyseUntagged: string
  analysisQueued: (count: number) => string
  analysisNone: string
  analysisFailed: string
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

    navTickets: 'Tickets',
    navUsers: 'Users',
    signOut: 'Sign out',
    switchToLightMode: 'Switch to light mode',
    switchToDarkMode: 'Switch to dark mode',
    switchToDesktopSite: 'Switch to desktop site',
    switchToMobileSite: 'Switch to mobile site',

    dashboardTitle: 'Dashboard',
    dashboardSubtitle: 'Ticket overview, including tickets resolved by AI.',
    statsLoadFailed: 'Failed to load stats',
    statsLoading: 'Loading stats',
    statTotal: 'Total tickets',
    statOpen: 'Open tickets',
    statResolvedByAi: 'Resolved by AI',
    statResolvedByAiPercent: '% resolved by AI',
    statAvgResolution: 'Average resolution time',
    ticketsPerDayTitle: 'Tickets per day',
    ticketsPerDayDescription: 'New tickets received over the last 30 days (UTC)',
    chartAriaLabel: 'Bar chart of tickets received per day over the last 30 days',
    ticketOne: 'ticket',
    ticketMany: 'tickets',
    viewAsTable: 'View as table',
    columnDay: 'Day',
    columnTickets: 'Tickets',

    ticketsTitle: 'Tickets',
    ticketCount: (count) => `${count} ${count === 1 ? 'ticket' : 'tickets'}`,
    ticketsSubtitle: 'Support requests received by email',
    ticketsLoadFailed: 'Failed to load tickets',
    ticketsLoading: 'Loading tickets',
    noTicketsMatch: 'No tickets match your filters.',
    noTicketsYet: 'No tickets yet.',
    search: 'Search',
    searchPlaceholder: 'Subject, name or email',
    filterStatus: 'Status',
    filterCategory: 'Category',
    allStatuses: 'All statuses',
    allCategories: 'All categories',
    uncategorized: 'Uncategorized',
    unassigned: 'Unassigned',
    columnSubject: 'Subject',
    columnFrom: 'From',
    columnStatus: 'Status',
    columnCategory: 'Category',
    columnAssignedTo: 'Assigned to',
    columnCreated: 'Created',

    paginationLabel: 'Pagination',
    showing: (from, to, total) => `Showing ${from}–${to} of ${total}`,
    previous: 'Previous',
    next: 'Next',
    pageOf: (page, pageCount) => `Page ${page} of ${pageCount}`,

    priorities: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' },
    sentiments: { POSITIVE: 'Positive', NEUTRAL: 'Neutral', NEGATIVE: 'Negative' },
    columnPriority: 'Priority',
    columnSentiment: 'Sentiment',
    filterPriority: 'Priority',
    filterSentiment: 'Sentiment',
    allPriorities: 'All priorities',
    allSentiments: 'All sentiments',
    notSet: 'Not set',
    analyse: 'Analyse with AI',
    analysing: 'Starting analysis…',
    analyseUntagged: 'Analyse untagged tickets',
    analysisQueued: (count) => `Analysis queued for ${count} ${count === 1 ? 'ticket' : 'tickets'}`,
    analysisNone: 'Nothing to analyse right now',
    analysisFailed: 'Could not start the analysis',
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

    navTickets: 'टिकट',
    navUsers: 'उपयोगकर्ता',
    signOut: 'साइन आउट',
    switchToLightMode: 'लाइट मोड पर जाएँ',
    switchToDarkMode: 'डार्क मोड पर जाएँ',
    switchToDesktopSite: 'डेस्कटॉप साइट पर जाएँ',
    switchToMobileSite: 'मोबाइल साइट पर जाएँ',

    dashboardTitle: 'डैशबोर्ड',
    dashboardSubtitle: 'टिकटों का अवलोकन, जिसमें AI द्वारा हल किए गए टिकट भी शामिल हैं।',
    statsLoadFailed: 'आँकड़े लोड नहीं हो सके',
    statsLoading: 'आँकड़े लोड हो रहे हैं',
    statTotal: 'कुल टिकट',
    statOpen: 'खुले टिकट',
    statResolvedByAi: 'AI द्वारा हल किए गए',
    statResolvedByAiPercent: 'AI द्वारा हल किए गए (%)',
    statAvgResolution: 'औसत समाधान समय',
    ticketsPerDayTitle: 'प्रति दिन टिकट',
    ticketsPerDayDescription: 'पिछले 30 दिनों में प्राप्त नए टिकट (UTC)',
    chartAriaLabel: 'पिछले 30 दिनों में प्रति दिन प्राप्त टिकटों का बार चार्ट',
    ticketOne: 'टिकट',
    ticketMany: 'टिकट',
    viewAsTable: 'तालिका के रूप में देखें',
    columnDay: 'दिन',
    columnTickets: 'टिकट',

    ticketsTitle: 'टिकट',
    ticketCount: (count) => `${count} टिकट`,
    ticketsSubtitle: 'ईमेल से प्राप्त सहायता अनुरोध',
    ticketsLoadFailed: 'टिकट लोड नहीं हो सके',
    ticketsLoading: 'टिकट लोड हो रहे हैं',
    noTicketsMatch: 'आपके फ़िल्टर से कोई टिकट मेल नहीं खाता।',
    noTicketsYet: 'अभी कोई टिकट नहीं है।',
    search: 'खोजें',
    searchPlaceholder: 'विषय, नाम या ईमेल',
    filterStatus: 'स्थिति',
    filterCategory: 'श्रेणी',
    allStatuses: 'सभी स्थितियाँ',
    allCategories: 'सभी श्रेणियाँ',
    uncategorized: 'अवर्गीकृत',
    unassigned: 'कोई नहीं',
    columnSubject: 'विषय',
    columnFrom: 'प्रेषक',
    columnStatus: 'स्थिति',
    columnCategory: 'श्रेणी',
    columnAssignedTo: 'सौंपा गया',
    columnCreated: 'बनाया गया',

    paginationLabel: 'पृष्ठ संख्या',
    showing: (from, to, total) => `${total} में से ${from}–${to} दिखा रहे हैं`,
    previous: 'पिछला',
    next: 'अगला',
    pageOf: (page, pageCount) => `पृष्ठ ${page} / ${pageCount}`,

    priorities: { LOW: 'कम', MEDIUM: 'मध्यम', HIGH: 'उच्च', URGENT: 'अत्यावश्यक' },
    sentiments: { POSITIVE: 'सकारात्मक', NEUTRAL: 'तटस्थ', NEGATIVE: 'नकारात्मक' },
    columnPriority: 'प्राथमिकता',
    columnSentiment: 'भावना',
    filterPriority: 'प्राथमिकता',
    filterSentiment: 'भावना',
    allPriorities: 'सभी प्राथमिकताएँ',
    allSentiments: 'सभी भावनाएँ',
    notSet: 'तय नहीं',
    analyse: 'AI से विश्लेषण करें',
    analysing: 'विश्लेषण शुरू हो रहा है…',
    analyseUntagged: 'बिना टैग वाले टिकटों का विश्लेषण करें',
    analysisQueued: (count) => `${count} टिकट का विश्लेषण कतार में है`,
    analysisNone: 'अभी विश्लेषण के लिए कुछ नहीं है',
    analysisFailed: 'विश्लेषण शुरू नहीं हो सका',
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

    navTickets: 'ટિકિટ',
    navUsers: 'વપરાશકર્તાઓ',
    signOut: 'સાઇન આઉટ',
    switchToLightMode: 'લાઇટ મોડ પર જાઓ',
    switchToDarkMode: 'ડાર્ક મોડ પર જાઓ',
    switchToDesktopSite: 'ડેસ્કટોપ સાઇટ પર જાઓ',
    switchToMobileSite: 'મોબાઇલ સાઇટ પર જાઓ',

    dashboardTitle: 'ડેશબોર્ડ',
    dashboardSubtitle: 'ટિકિટોની ઝાંખી, જેમાં AI દ્વારા ઉકેલાયેલી ટિકિટો પણ સામેલ છે.',
    statsLoadFailed: 'આંકડા લોડ થઈ શક્યા નથી',
    statsLoading: 'આંકડા લોડ થઈ રહ્યા છે',
    statTotal: 'કુલ ટિકિટ',
    statOpen: 'ખુલ્લી ટિકિટ',
    statResolvedByAi: 'AI દ્વારા ઉકેલાયેલી',
    statResolvedByAiPercent: 'AI દ્વારા ઉકેલાયેલી (%)',
    statAvgResolution: 'સરેરાશ ઉકેલ સમય',
    ticketsPerDayTitle: 'દરરોજ ટિકિટ',
    ticketsPerDayDescription: 'છેલ્લા 30 દિવસમાં મળેલી નવી ટિકિટ (UTC)',
    chartAriaLabel: 'છેલ્લા 30 દિવસમાં દરરોજ મળેલી ટિકિટનો બાર ચાર્ટ',
    ticketOne: 'ટિકિટ',
    ticketMany: 'ટિકિટ',
    viewAsTable: 'કોષ્ટક તરીકે જુઓ',
    columnDay: 'દિવસ',
    columnTickets: 'ટિકિટ',

    ticketsTitle: 'ટિકિટ',
    ticketCount: (count) => `${count} ટિકિટ`,
    ticketsSubtitle: 'ઇમેઇલથી મળેલી સહાય વિનંતીઓ',
    ticketsLoadFailed: 'ટિકિટ લોડ થઈ શકી નથી',
    ticketsLoading: 'ટિકિટ લોડ થઈ રહી છે',
    noTicketsMatch: 'તમારા ફિલ્ટર સાથે કોઈ ટિકિટ મેળ ખાતી નથી.',
    noTicketsYet: 'હજી કોઈ ટિકિટ નથી.',
    search: 'શોધો',
    searchPlaceholder: 'વિષય, નામ અથવા ઇમેઇલ',
    filterStatus: 'સ્થિતિ',
    filterCategory: 'શ્રેણી',
    allStatuses: 'બધી સ્થિતિઓ',
    allCategories: 'બધી શ્રેણીઓ',
    uncategorized: 'અવર્ગીકૃત',
    unassigned: 'કોઈ નહીં',
    columnSubject: 'વિષય',
    columnFrom: 'મોકલનાર',
    columnStatus: 'સ્થિતિ',
    columnCategory: 'શ્રેણી',
    columnAssignedTo: 'સોંપાયેલ',
    columnCreated: 'બનાવ્યું',

    paginationLabel: 'પૃષ્ઠ ક્રમાંક',
    showing: (from, to, total) => `${total} માંથી ${from}–${to} બતાવી રહ્યા છીએ`,
    previous: 'પાછળ',
    next: 'આગળ',
    pageOf: (page, pageCount) => `પૃષ્ઠ ${page} / ${pageCount}`,

    priorities: { LOW: 'ઓછી', MEDIUM: 'મધ્યમ', HIGH: 'ઊંચી', URGENT: 'તાત્કાલિક' },
    sentiments: { POSITIVE: 'સકારાત્મક', NEUTRAL: 'તટસ્થ', NEGATIVE: 'નકારાત્મક' },
    columnPriority: 'અગ્રતા',
    columnSentiment: 'ભાવના',
    filterPriority: 'અગ્રતા',
    filterSentiment: 'ભાવના',
    allPriorities: 'બધી અગ્રતાઓ',
    allSentiments: 'બધી ભાવનાઓ',
    notSet: 'નક્કી નથી',
    analyse: 'AI થી વિશ્લેષણ કરો',
    analysing: 'વિશ્લેષણ શરૂ થઈ રહ્યું છે…',
    analyseUntagged: 'ટેગ વગરની ટિકિટનું વિશ્લેષણ કરો',
    analysisQueued: (count) => `${count} ટિકિટનું વિશ્લેષણ કતારમાં છે`,
    analysisNone: 'હાલમાં વિશ્લેષણ માટે કંઈ નથી',
    analysisFailed: 'વિશ્લેષણ શરૂ થઈ શક્યું નથી',
  },
}
