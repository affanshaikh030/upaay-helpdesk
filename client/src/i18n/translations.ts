import type {
  AiResolvedMode,
  AutoResolveDecision,
  AutoResolveReason,
  KnowledgeLanguage,
  TicketPriority,
  TicketSentiment,
} from '@helpdesk/core'
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
  navKnowledge: string
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

  // AI-resolved tickets
  filterAiResolved: string
  aiResolvedOptions: Record<AiResolvedMode, string>
  basedOn: (title: string) => string
  suggestedReplyTitle: string
  aiDraftLabel: string
  useThisReply: string
  dismissSuggestion: string

  // Knowledge base (admin only)
  knowledgeTitle: string
  knowledgeSubtitle: string
  articleCount: (count: number) => string
  articlesLoading: string
  articlesLoadFailed: string
  noAccess: string
  noArticles: string
  newArticle: string
  editArticle: string
  deleteArticle: string
  newArticleDescription: string
  editArticleDescription: string
  editArticleLabel: (title: string) => string
  deleteArticleLabel: (title: string) => string
  columnTitle: string
  columnLanguage: string
  columnUpdated: string
  columnActions: string
  articleLanguages: Record<KnowledgeLanguage, string>
  fieldTitle: string
  fieldContent: string
  fieldLanguage: string
  contentCount: (count: number, max: number) => string
  titleRequired: string
  contentRequired: string
  titleTooLong: (max: number) => string
  contentTooLong: (max: number) => string
  createArticleButton: string
  creating: string
  saveChanges: string
  saving: string
  cancel: string
  deleteButton: string
  deleting: string
  createFailed: string
  saveFailed: string
  deleteFailed: string
  deleteArticleConfirm: (title: string) => string

  // AI auto-resolve results (admin only)
  attemptsTitle: string
  attemptsSubtitle: string
  attemptsLoading: string
  attemptsLoadFailed: string
  noAttempts: string
  columnTicket: string
  columnDecision: string
  columnReason: string
  columnTopRank: string
  columnConfidence: string
  columnDraftReply: string
  columnCitedArticle: string
  decisions: Record<AutoResolveDecision, string>
  autoResolveReasons: Record<AutoResolveReason, string>
  modeShadow: string
  modeLive: string
  deletedArticle: string
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
    navKnowledge: 'FAQs',
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

    filterAiResolved: 'AI-resolved',
    aiResolvedOptions: { exclude: 'Hide AI-resolved', only: 'Only AI-resolved', include: 'Include AI-resolved' },
    basedOn: (title) => `Based on: ${title}`,
    suggestedReplyTitle: 'Suggested reply',
    aiDraftLabel: 'AI-generated draft',
    useThisReply: 'Use this reply',
    dismissSuggestion: 'Dismiss',

    knowledgeTitle: 'FAQs',
    knowledgeSubtitle: 'Articles the AI answers customers from',
    articleCount: (count) => `${count} ${count === 1 ? 'article' : 'articles'}`,
    articlesLoading: 'Loading articles',
    articlesLoadFailed: 'Failed to load articles',
    noAccess: 'You do not have access to this page',
    noArticles: 'No articles yet. Add one for the AI to answer from.',
    newArticle: 'New article',
    editArticle: 'Edit article',
    deleteArticle: 'Delete article',
    newArticleDescription:
      'Write what the AI may use to answer customers. Only the best matching articles are sent with each ticket.',
    editArticleDescription: 'Update this article. Changes apply to the next ticket the AI answers.',
    editArticleLabel: (title) => `Edit ${title}`,
    deleteArticleLabel: (title) => `Delete ${title}`,
    columnTitle: 'Title',
    columnLanguage: 'Language',
    columnUpdated: 'Updated',
    columnActions: 'Actions',
    articleLanguages: { EN: 'English', HI: 'हिन्दी', GU: 'ગુજરાતી' },
    fieldTitle: 'Title',
    fieldContent: 'Content',
    fieldLanguage: 'Language',
    contentCount: (count, max) => `${count.toLocaleString()} / ${max.toLocaleString()} characters`,
    titleRequired: 'Title is required',
    contentRequired: 'Content is required',
    titleTooLong: (max) => `Title must be at most ${max} characters`,
    contentTooLong: (max) => `Content must be at most ${max.toLocaleString()} characters`,
    createArticleButton: 'Create article',
    creating: 'Creating…',
    saveChanges: 'Save changes',
    saving: 'Saving…',
    cancel: 'Cancel',
    deleteButton: 'Delete',
    deleting: 'Deleting…',
    createFailed: 'Failed to create article',
    saveFailed: 'Failed to save article',
    deleteFailed: 'Failed to delete article',
    deleteArticleConfirm: (title) =>
      `Delete "${title}"? The AI will stop using it. Replies it already wrote keep their text but lose the "Based on" line.`,

    attemptsTitle: 'AI auto-resolve results',
    attemptsSubtitle: 'What the AI did, or in shadow mode would have done, for each new ticket',
    attemptsLoading: 'Loading results',
    attemptsLoadFailed: 'Failed to load results',
    noAttempts: 'No results yet.',
    columnTicket: 'Ticket',
    columnDecision: 'Decision',
    columnReason: 'Reason',
    columnTopRank: 'Top rank',
    columnConfidence: 'Confidence',
    columnDraftReply: 'Draft reply',
    columnCitedArticle: 'Cited article',
    decisions: { RESOLVE: 'Resolve', ESCALATE: 'Escalate' },
    autoResolveReasons: {
      RESOLVED: 'Resolved',
      NOT_CLASSIFIED: 'Not classified yet',
      URGENT: 'Urgent priority',
      NEGATIVE_SENTIMENT: 'Negative sentiment',
      REFUND_REQUEST: 'Refund request',
      ESCALATION_WORDING: 'Legal, dispute or security wording',
      NO_RELEVANT_ARTICLE: 'No relevant article',
      MODEL_DECLINED: 'AI could not answer',
      LOW_CONFIDENCE: 'Low confidence',
      INVALID_CITATION: 'Invalid article citation',
      TICKET_CHANGED: 'Ticket changed first',
    },
    modeShadow: 'Shadow',
    modeLive: 'Live',
    deletedArticle: 'Deleted',
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
    navKnowledge: 'सामान्य प्रश्न',
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

    filterAiResolved: 'AI द्वारा हल किए गए',
    aiResolvedOptions: {
      exclude: 'AI द्वारा हल किए गए छिपाएँ',
      only: 'केवल AI द्वारा हल किए गए',
      include: 'AI द्वारा हल किए गए शामिल करें',
    },
    basedOn: (title) => `आधारित: ${title}`,
    suggestedReplyTitle: 'सुझाया गया उत्तर',
    aiDraftLabel: 'AI द्वारा बनाया गया ड्राफ़्ट',
    useThisReply: 'यह उत्तर उपयोग करें',
    dismissSuggestion: 'हटाएँ',

    knowledgeTitle: 'सामान्य प्रश्न',
    knowledgeSubtitle: 'वे लेख जिनसे AI ग्राहकों को जवाब देता है',
    articleCount: (count) => `${count} लेख`,
    articlesLoading: 'लेख लोड हो रहे हैं',
    articlesLoadFailed: 'लेख लोड नहीं हो सके',
    noAccess: 'आपके पास इस पृष्ठ का एक्सेस नहीं है',
    noArticles: 'अभी कोई लेख नहीं है। AI के जवाब देने के लिए एक जोड़ें।',
    newArticle: 'नया लेख',
    editArticle: 'लेख संपादित करें',
    deleteArticle: 'लेख हटाएँ',
    newArticleDescription:
      'वह लिखें जिसका उपयोग AI ग्राहकों को जवाब देने के लिए कर सकता है। हर टिकट के साथ केवल सबसे मेल खाने वाले लेख भेजे जाते हैं।',
    editArticleDescription: 'इस लेख को अपडेट करें। बदलाव अगले उस टिकट पर लागू होंगे जिसका AI जवाब देगा।',
    editArticleLabel: (title) => `${title} संपादित करें`,
    deleteArticleLabel: (title) => `${title} हटाएँ`,
    columnTitle: 'शीर्षक',
    columnLanguage: 'भाषा',
    columnUpdated: 'अपडेट किया गया',
    columnActions: 'कार्रवाई',
    articleLanguages: { EN: 'English', HI: 'हिन्दी', GU: 'ગુજરાતી' },
    fieldTitle: 'शीर्षक',
    fieldContent: 'सामग्री',
    fieldLanguage: 'भाषा',
    contentCount: (count, max) => `${count.toLocaleString()} / ${max.toLocaleString()} अक्षर`,
    titleRequired: 'शीर्षक आवश्यक है',
    contentRequired: 'सामग्री आवश्यक है',
    titleTooLong: (max) => `शीर्षक अधिकतम ${max} अक्षरों का होना चाहिए`,
    contentTooLong: (max) => `सामग्री अधिकतम ${max.toLocaleString()} अक्षरों की होनी चाहिए`,
    createArticleButton: 'लेख बनाएँ',
    creating: 'बनाया जा रहा है…',
    saveChanges: 'बदलाव सहेजें',
    saving: 'सहेजा जा रहा है…',
    cancel: 'रद्द करें',
    deleteButton: 'हटाएँ',
    deleting: 'हटाया जा रहा है…',
    createFailed: 'लेख नहीं बन सका',
    saveFailed: 'लेख सहेजा नहीं जा सका',
    deleteFailed: 'लेख हटाया नहीं जा सका',
    deleteArticleConfirm: (title) =>
      `"${title}" हटाएँ? AI इसका उपयोग बंद कर देगा। पहले लिखे जा चुके जवाबों का पाठ रहेगा, पर "आधारित" पंक्ति हट जाएगी।`,

    attemptsTitle: 'AI स्वतः-समाधान के परिणाम',
    attemptsSubtitle: 'हर नए टिकट पर AI ने क्या किया, या शैडो मोड में क्या करता',
    attemptsLoading: 'परिणाम लोड हो रहे हैं',
    attemptsLoadFailed: 'परिणाम लोड नहीं हो सके',
    noAttempts: 'अभी कोई परिणाम नहीं है।',
    columnTicket: 'टिकट',
    columnDecision: 'निर्णय',
    columnReason: 'कारण',
    columnTopRank: 'शीर्ष रैंक',
    columnConfidence: 'विश्वास',
    columnDraftReply: 'जवाब का मसौदा',
    columnCitedArticle: 'उद्धृत लेख',
    decisions: { RESOLVE: 'हल करें', ESCALATE: 'आगे भेजें' },
    autoResolveReasons: {
      RESOLVED: 'हल किया गया',
      NOT_CLASSIFIED: 'अभी वर्गीकृत नहीं',
      URGENT: 'अत्यावश्यक प्राथमिकता',
      NEGATIVE_SENTIMENT: 'नकारात्मक भावना',
      REFUND_REQUEST: 'रिफंड अनुरोध',
      ESCALATION_WORDING: 'कानूनी, विवाद या सुरक्षा संबंधी शब्द',
      NO_RELEVANT_ARTICLE: 'कोई प्रासंगिक लेख नहीं',
      MODEL_DECLINED: 'AI जवाब नहीं दे सका',
      LOW_CONFIDENCE: 'कम विश्वास',
      INVALID_CITATION: 'अमान्य लेख उद्धरण',
      TICKET_CHANGED: 'टिकट पहले बदल गया',
    },
    modeShadow: 'शैडो',
    modeLive: 'लाइव',
    deletedArticle: 'हटाया गया',
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
    navKnowledge: 'સામાન્ય પ્રશ્નો',
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

    filterAiResolved: 'AI દ્વારા ઉકેલાયેલી',
    aiResolvedOptions: {
      exclude: 'AI દ્વારા ઉકેલાયેલી છુપાવો',
      only: 'ફક્ત AI દ્વારા ઉકેલાયેલી',
      include: 'AI દ્વારા ઉકેલાયેલી સામેલ કરો',
    },
    basedOn: (title) => `આધારિત: ${title}`,
    suggestedReplyTitle: 'સૂચવેલ જવાબ',
    aiDraftLabel: 'AI દ્વારા બનાવેલ ડ્રાફ્ટ',
    useThisReply: 'આ જવાબ વાપરો',
    dismissSuggestion: 'છોડી દો',

    knowledgeTitle: 'સામાન્ય પ્રશ્નો',
    knowledgeSubtitle: 'લેખો જેમાંથી AI ગ્રાહકોને જવાબ આપે છે',
    articleCount: (count) => `${count} લેખ`,
    articlesLoading: 'લેખ લોડ થઈ રહ્યા છે',
    articlesLoadFailed: 'લેખ લોડ થઈ શક્યા નથી',
    noAccess: 'તમને આ પૃષ્ઠની ઍક્સેસ નથી',
    noArticles: 'હજી કોઈ લેખ નથી. AI ને જવાબ આપવા માટે એક ઉમેરો.',
    newArticle: 'નવો લેખ',
    editArticle: 'લેખ સંપાદિત કરો',
    deleteArticle: 'લેખ કાઢી નાખો',
    newArticleDescription:
      'AI ગ્રાહકોને જવાબ આપવા માટે જે વાપરી શકે તે લખો. દરેક ટિકિટ સાથે ફક્ત સૌથી વધુ મેળ ખાતા લેખ મોકલવામાં આવે છે.',
    editArticleDescription: 'આ લેખ અપડેટ કરો. ફેરફાર AI જે આગલી ટિકિટનો જવાબ આપશે તેને લાગુ પડશે.',
    editArticleLabel: (title) => `${title} સંપાદિત કરો`,
    deleteArticleLabel: (title) => `${title} કાઢી નાખો`,
    columnTitle: 'શીર્ષક',
    columnLanguage: 'ભાષા',
    columnUpdated: 'અપડેટ કર્યું',
    columnActions: 'ક્રિયાઓ',
    articleLanguages: { EN: 'English', HI: 'हिन्दी', GU: 'ગુજરાતી' },
    fieldTitle: 'શીર્ષક',
    fieldContent: 'સામગ્રી',
    fieldLanguage: 'ભાષા',
    contentCount: (count, max) => `${count.toLocaleString()} / ${max.toLocaleString()} અક્ષર`,
    titleRequired: 'શીર્ષક જરૂરી છે',
    contentRequired: 'સામગ્રી જરૂરી છે',
    titleTooLong: (max) => `શીર્ષક વધુમાં વધુ ${max} અક્ષરનું હોવું જોઈએ`,
    contentTooLong: (max) => `સામગ્રી વધુમાં વધુ ${max.toLocaleString()} અક્ષરની હોવી જોઈએ`,
    createArticleButton: 'લેખ બનાવો',
    creating: 'બનાવી રહ્યા છીએ…',
    saveChanges: 'ફેરફાર સાચવો',
    saving: 'સાચવી રહ્યા છીએ…',
    cancel: 'રદ કરો',
    deleteButton: 'કાઢી નાખો',
    deleting: 'કાઢી નાખી રહ્યા છીએ…',
    createFailed: 'લેખ બનાવી શકાયો નથી',
    saveFailed: 'લેખ સાચવી શકાયો નથી',
    deleteFailed: 'લેખ કાઢી શકાયો નથી',
    deleteArticleConfirm: (title) =>
      `"${title}" કાઢી નાખવો? AI તેનો ઉપયોગ બંધ કરશે. અગાઉ લખાઈ ચૂકેલા જવાબોનું લખાણ રહેશે, પણ "આધારિત" લીટી દૂર થશે.`,

    attemptsTitle: 'AI સ્વતઃ-ઉકેલના પરિણામો',
    attemptsSubtitle: 'દરેક નવી ટિકિટ પર AI એ શું કર્યું, અથવા શેડો મોડમાં શું કરત',
    attemptsLoading: 'પરિણામો લોડ થઈ રહ્યા છે',
    attemptsLoadFailed: 'પરિણામો લોડ થઈ શક્યા નથી',
    noAttempts: 'હજી કોઈ પરિણામ નથી.',
    columnTicket: 'ટિકિટ',
    columnDecision: 'નિર્ણય',
    columnReason: 'કારણ',
    columnTopRank: 'ટોચનો ક્રમ',
    columnConfidence: 'વિશ્વાસ',
    columnDraftReply: 'જવાબનો મુસદ્દો',
    columnCitedArticle: 'ટાંકેલ લેખ',
    decisions: { RESOLVE: 'ઉકેલો', ESCALATE: 'આગળ મોકલો' },
    autoResolveReasons: {
      RESOLVED: 'ઉકેલાયું',
      NOT_CLASSIFIED: 'હજી વર્ગીકૃત નથી',
      URGENT: 'તાત્કાલિક અગ્રતા',
      NEGATIVE_SENTIMENT: 'નકારાત્મક ભાવના',
      REFUND_REQUEST: 'રિફંડ વિનંતી',
      ESCALATION_WORDING: 'કાનૂની, વિવાદ અથવા સુરક્ષા સંબંધી શબ્દો',
      NO_RELEVANT_ARTICLE: 'કોઈ સંબંધિત લેખ નથી',
      MODEL_DECLINED: 'AI જવાબ આપી શક્યું નહીં',
      LOW_CONFIDENCE: 'ઓછો વિશ્વાસ',
      INVALID_CITATION: 'અમાન્ય લેખ ઉલ્લેખ',
      TICKET_CHANGED: 'ટિકિટ પહેલાં બદલાઈ',
    },
    modeShadow: 'શેડો',
    modeLive: 'લાઇવ',
    deletedArticle: 'કાઢી નાખેલ',
  },
}
