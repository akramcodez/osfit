// Full UI Translations for OSFIT
// Supports all 12 languages from the language selector

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'hi' | 'zh' | 'ja' | 'ko' | 'pt' | 'ru' | 'ar' | 'bn';

export interface TranslationStrings {
  // Sidebar
  newChat: string;
  recent: string;
  upgradePlan: string;
  logOut: string;
  newChatLoading: string;
  
  // Message Input
  messagePlaceholder: string;
  
  // Mode Selector
  issueSolver: string;
  fileExplainer: string;
  openSourceMentor: string;
  
  // Language Selector
  language: string;
  
  // General
  osfit: string;
  disclaimer: string;
  
  // Welcome Screen
  howCanIHelp: string;
  solveGitHubIssue: string;
  solveGitHubIssueDesc: string;
  explainCodeFile: string;
  explainCodeFileDesc: string;
  getGuidance: string;
}

export const TRANSLATIONS: Record<LanguageCode, TranslationStrings> = {
  en: {
    newChat: 'New chat',
    recent: 'Recent',
    upgradePlan: 'Upgrade plan',
    logOut: 'Log out',
    newChatLoading: 'New chat...',
    messagePlaceholder: 'Message OSFIT...',
    issueSolver: 'Issue Solver',
    fileExplainer: 'File Explainer',
    openSourceMentor: 'Open Source Mentor',
    language: 'Language',
    osfit: 'OSFIT',
    disclaimer: 'OSFIT can make mistakes. Consider checking important information.',
    howCanIHelp: 'How can I help you today?',
    solveGitHubIssue: 'Solve a GitHub Issue',
    solveGitHubIssueDesc: 'Analyze bugs, plan solutions, and generate PR code instantly.',
    explainCodeFile: 'Explain Code File',
    explainCodeFileDesc: 'Understand complex logic',
    getGuidance: 'Get guidance on contributing',
  },
  es: {
    newChat: 'Nuevo chat',
    recent: 'Reciente',
    upgradePlan: 'Mejorar plan',
    logOut: 'Cerrar sesión',
    newChatLoading: 'Nuevo chat...',
    messagePlaceholder: 'Mensaje a OSFIT...',
    issueSolver: 'Solucionador de problemas',
    fileExplainer: 'Explicador de archivos',
    openSourceMentor: 'Mentor de código abierto',
    language: 'Idioma',
    osfit: 'OSFIT',
    disclaimer: 'OSFIT puede cometer errores. Considera verificar información importante.',
    howCanIHelp: '¿Cómo puedo ayudarte hoy?',
    solveGitHubIssue: 'Resolver un problema de GitHub',
    solveGitHubIssueDesc: 'Analiza errores, planifica soluciones y genera código PR.',
    explainCodeFile: 'Explicar archivo de código',
    explainCodeFileDesc: 'Entender lógica compleja',
    getGuidance: 'Obtener orientación para contribuir',
  },
  fr: {
    newChat: 'Nouveau chat',
    recent: 'Récent',
    upgradePlan: 'Améliorer le plan',
    logOut: 'Déconnexion',
    newChatLoading: 'Nouveau chat...',
    messagePlaceholder: 'Message à OSFIT...',
    issueSolver: 'Résolveur de problèmes',
    fileExplainer: 'Explicateur de fichiers',
    openSourceMentor: 'Mentor open source',
    language: 'Langue',
    osfit: 'OSFIT',
    disclaimer: 'OSFIT peut faire des erreurs. Pensez à vérifier les informations importantes.',
    howCanIHelp: 'Comment puis-je vous aider aujourd\'hui?',
    solveGitHubIssue: 'Résoudre un problème GitHub',
    solveGitHubIssueDesc: 'Analysez les bugs, planifiez des solutions, générez du code PR.',
    explainCodeFile: 'Expliquer un fichier de code',
    explainCodeFileDesc: 'Comprendre la logique complexe',
    getGuidance: 'Obtenir des conseils pour contribuer',
  },
  de: {
    newChat: 'Neuer Chat',
    recent: 'Kürzlich',
    upgradePlan: 'Plan upgraden',
    logOut: 'Abmelden',
    newChatLoading: 'Neuer Chat...',
    messagePlaceholder: 'Nachricht an OSFIT...',
    issueSolver: 'Problemlöser',
    fileExplainer: 'Datei-Erklärer',
    openSourceMentor: 'Open-Source-Mentor',
    language: 'Sprache',
    osfit: 'OSFIT',
    disclaimer: 'OSFIT kann Fehler machen. Überprüfen Sie wichtige Informationen.',
    howCanIHelp: 'Wie kann ich Ihnen heute helfen?',
    solveGitHubIssue: 'GitHub-Problem lösen',
    solveGitHubIssueDesc: 'Analysieren Sie Bugs, planen Sie Lösungen, generieren Sie PR-Code.',
    explainCodeFile: 'Code-Datei erklären',
    explainCodeFileDesc: 'Komplexe Logik verstehen',
    getGuidance: 'Orientierung zum Beitragen erhalten',
  },
  hi: {
    newChat: 'नई चैट',
    recent: 'हाल का',
    upgradePlan: 'प्लान अपग्रेड करें',
    logOut: 'लॉग आउट',
    newChatLoading: 'नई चैट...',
    messagePlaceholder: 'OSFIT को संदेश...',
    issueSolver: 'समस्या समाधानकर्ता',
    fileExplainer: 'फ़ाइल व्याख्याकार',
    openSourceMentor: 'ओपन सोर्स मेंटर',
    language: 'भाषा',
    osfit: 'OSFIT',
    disclaimer: 'OSFIT गलतियाँ कर सकता है। महत्वपूर्ण जानकारी की जाँच करें।',
    howCanIHelp: 'आज मैं आपकी कैसे मदद कर सकता हूँ?',
    solveGitHubIssue: 'GitHub समस्या हल करें',
    solveGitHubIssueDesc: 'बग का विश्लेषण करें, समाधान की योजना बनाएं, PR कोड जेनरेट करें।',
    explainCodeFile: 'कोड फ़ाइल समझाएं',
    explainCodeFileDesc: 'जटिल तर्क समझें',
    getGuidance: 'योगदान के लिए मार्गदर्शन प्राप्त करें',
  },
  zh: {
    newChat: '新对话',
    recent: '最近',
    upgradePlan: '升级计划',
    logOut: '退出登录',
    newChatLoading: '新对话...',
    messagePlaceholder: '向 OSFIT 发送消息...',
    issueSolver: '问题解决者',
    fileExplainer: '文件解释器',
    openSourceMentor: '开源导师',
    language: '语言',
    osfit: 'OSFIT',
    disclaimer: 'OSFIT 可能会出错。请核实重要信息。',
    howCanIHelp: '今天我能帮您什么?',
    solveGitHubIssue: '解决 GitHub 问题',
    solveGitHubIssueDesc: '分析错误、规划解决方案、生成 PR 代码。',
    explainCodeFile: '解释代码文件',
    explainCodeFileDesc: '理解复杂逻辑',
    getGuidance: '获取贡献指导',
  },
  ja: {
    newChat: '新しいチャット',
    recent: '最近',
    upgradePlan: 'プランをアップグレード',
    logOut: 'ログアウト',
    newChatLoading: '新しいチャット...',
    messagePlaceholder: 'OSFITにメッセージ...',
    issueSolver: '問題解決者',
    fileExplainer: 'ファイル説明者',
    openSourceMentor: 'オープンソースメンター',
    language: '言語',
    osfit: 'OSFIT',
    disclaimer: 'OSFITは間違える可能性があります。重要な情報は確認してください。',
    howCanIHelp: '今日はどのようにお手伝いしましょうか?',
    solveGitHubIssue: 'GitHub の問題を解決',
    solveGitHubIssueDesc: 'バグを分析し、解決策を計画し、PRコードを生成。',
    explainCodeFile: 'コードファイルを説明',
    explainCodeFileDesc: '複雑なロジックを理解',
    getGuidance: '貢献のガイダンスを取得',
  },
  ko: {
    newChat: '새 대화',
    recent: '최근',
    upgradePlan: '플랜 업그레이드',
    logOut: '로그아웃',
    newChatLoading: '새 대화...',
    messagePlaceholder: 'OSFIT에 메시지...',
    issueSolver: '문제 해결사',
    fileExplainer: '파일 설명자',
    openSourceMentor: '오픈소스 멘토',
    language: '언어',
    osfit: 'OSFIT',
    disclaimer: 'OSFIT은 실수할 수 있습니다. 중요한 정보는 확인하세요.',
    howCanIHelp: '오늘 무엇을 도와드릴까요?',
    solveGitHubIssue: 'GitHub 이슈 해결',
    solveGitHubIssueDesc: '버그 분석, 솔루션 계획, PR 코드 생성.',
    explainCodeFile: '코드 파일 설명',
    explainCodeFileDesc: '복잡한 로직 이해',
    getGuidance: '기여 가이드 받기',
  },
  pt: {
    newChat: 'Novo chat',
    recent: 'Recente',
    upgradePlan: 'Atualizar plano',
    logOut: 'Sair',
    newChatLoading: 'Novo chat...',
    messagePlaceholder: 'Mensagem para OSFIT...',
    issueSolver: 'Solucionador de problemas',
    fileExplainer: 'Explicador de arquivos',
    openSourceMentor: 'Mentor de código aberto',
    language: 'Idioma',
    osfit: 'OSFIT',
    disclaimer: 'OSFIT pode cometer erros. Considere verificar informações importantes.',
    howCanIHelp: 'Como posso ajudar você hoje?',
    solveGitHubIssue: 'Resolver problema do GitHub',
    solveGitHubIssueDesc: 'Analise bugs, planeje soluções, gere código PR.',
    explainCodeFile: 'Explicar arquivo de código',
    explainCodeFileDesc: 'Entender lógica complexa',
    getGuidance: 'Obter orientação para contribuir',
  },
  ru: {
    newChat: 'Новый чат',
    recent: 'Недавние',
    upgradePlan: 'Улучшить план',
    logOut: 'Выйти',
    newChatLoading: 'Новый чат...',
    messagePlaceholder: 'Сообщение OSFIT...',
    issueSolver: 'Решатель проблем',
    fileExplainer: 'Объяснитель файлов',
    openSourceMentor: 'Наставник по open source',
    language: 'Язык',
    osfit: 'OSFIT',
    disclaimer: 'OSFIT может ошибаться. Проверяйте важную информацию.',
    howCanIHelp: 'Как я могу помочь вам сегодня?',
    solveGitHubIssue: 'Решить проблему GitHub',
    solveGitHubIssueDesc: 'Анализируйте ошибки, планируйте решения, генерируйте PR-код.',
    explainCodeFile: 'Объяснить файл кода',
    explainCodeFileDesc: 'Понять сложную логику',
    getGuidance: 'Получить руководство по вкладу',
  },
  ar: {
    newChat: 'محادثة جديدة',
    recent: 'الأخيرة',
    upgradePlan: 'ترقية الخطة',
    logOut: 'تسجيل الخروج',
    newChatLoading: 'محادثة جديدة...',
    messagePlaceholder: 'رسالة إلى OSFIT...',
    issueSolver: 'حلال المشاكل',
    fileExplainer: 'شارح الملفات',
    openSourceMentor: 'مرشد مفتوح المصدر',
    language: 'اللغة',
    osfit: 'OSFIT',
    disclaimer: 'OSFIT قد يرتكب أخطاء. يرجى التحقق من المعلومات المهمة.',
    howCanIHelp: 'كيف يمكنني مساعدتك اليوم؟',
    solveGitHubIssue: 'حل مشكلة GitHub',
    solveGitHubIssueDesc: 'تحليل الأخطاء، تخطيط الحلول، إنشاء كود PR.',
    explainCodeFile: 'شرح ملف الكود',
    explainCodeFileDesc: 'فهم المنطق المعقد',
    getGuidance: 'الحصول على إرشادات للمساهمة',
  },
  bn: {
    newChat: 'নতুন চ্যাট',
    recent: 'সাম্প্রতিক',
    upgradePlan: 'প্ল্যান আপগ্রেড করুন',
    logOut: 'লগ আউট',
    newChatLoading: 'নতুন চ্যাট...',
    messagePlaceholder: 'OSFIT এ বার্তা...',
    issueSolver: 'সমস্যা সমাধানকারী',
    fileExplainer: 'ফাইল ব্যাখ্যাকারী',
    openSourceMentor: 'ওপেন সোর্স পরামর্শদাতা',
    language: 'ভাষা',
    osfit: 'OSFIT',
    disclaimer: 'OSFIT ভুল করতে পারে। গুরুত্বপূর্ণ তথ্য যাচাই করুন।',
    howCanIHelp: 'আজ আমি কীভাবে আপনাকে সাহায্য করতে পারি?',
    solveGitHubIssue: 'GitHub সমস্যা সমাধান করুন',
    solveGitHubIssueDesc: 'বাগ বিশ্লেষণ করুন, সমাধান পরিকল্পনা করুন, PR কোড তৈরি করুন।',
    explainCodeFile: 'কোড ফাইল ব্যাখ্যা করুন',
    explainCodeFileDesc: 'জটিল যুক্তি বুঝুন',
    getGuidance: 'অবদানের জন্য নির্দেশনা নিন',
  },
};

// Helper function to get a translation
export function t(key: keyof TranslationStrings, lang: LanguageCode = 'en'): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key];
}

// Speech Recognition Language Codes
export const SPEECH_LANG_CODES: Record<LanguageCode, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  hi: 'hi-IN',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  pt: 'pt-BR',
  ru: 'ru-RU',
  ar: 'ar-SA',
  bn: 'bn-BD',
};
