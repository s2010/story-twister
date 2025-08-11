import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  isRtl: boolean;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    'header.storyTwister': '🎮 Story Twister',
    'header.team': 'Team',
    'header.leaderboard': 'Leaderboard',
    'header.toggleLanguage': 'عربي',
    
    // Home page
    'home.title': 'AI Storytelling Game',
    'home.subtitle': 'Join your team and create epic stories together with AI assistance!',
    'home.enterUsername': 'Enter User Name',
    'home.usernamePlaceholder': 'Enter your username...',
    'home.teamId': 'Team ID',
    'home.teamIdPlaceholder': 'Enter your team ID...',
    'home.joinTeam': '🚀 Join Team',
    'home.howToPlay': '🎯 How to play:',
    'home.step1': '1. Join or create a team',
    'home.step2': '2. Take turns adding sentences to your story',
    'home.step3': '3. AI will inject surprise twists',
    'home.step4': '4. Collaborate to create epic tales!',
    
    // Story Room
    'story.typeMessage': 'Type your message...',
    'story.send': 'Send',
    'story.timeRemaining': 'Time Remaining',
    'story.sessionEnded': 'Session Ended',
    'story.storyBot': 'StoryBot',
    
    // Leaderboard
    'leaderboard.title': 'Team Leaderboard',
    'leaderboard.team': 'Team',
    'leaderboard.members': 'Members',
    'leaderboard.status': 'Status',
    'leaderboard.action': 'Action',
    'leaderboard.join': 'Join',
    'leaderboard.see': 'See',
    'leaderboard.active': 'Active',
    'leaderboard.completed': 'Completed',
    
    // Story Summary
    'summary.title': 'Story Complete!',
    'summary.stats': 'Story Stats',
    'summary.turns': 'Turns',
    'summary.twists': 'Twists',
    'summary.words': 'Words',
    'summary.contributors': 'Contributors',
    'summary.backToHome': 'Back to Home',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.retry': 'Retry',
  },
  ar: {
    // Header
    'header.storyTwister': '🎮 حبكه',
    'header.team': 'الفريق',
    'header.leaderboard': 'لوحة المتصدرين',
    'header.toggleLanguage': 'ENG',
    
    // Home page
    'home.title': 'لعبة سرد القصص بالذكاء الاصطناعي',
    'home.subtitle': 'انضم إلى فريقك وأنشئ قصصاً ملحمية معاً بمساعدة الذكاء الاصطناعي!',
    'home.enterUsername': 'أدخل اسم المستخدم',
    'home.usernamePlaceholder': 'أدخل اسم المستخدم...',
    'home.teamId': 'معرف الفريق',
    'home.teamIdPlaceholder': 'أدخل معرف الفريق...',
    'home.joinTeam': '🚀 انضم للفريق',
    'home.howToPlay': '🎯 كيفية اللعب:',
    'home.step1': '١. انضم أو أنشئ فريقاً',
    'home.step2': '٢. تناوبوا في إضافة جمل لقصتكم',
    'home.step3': '٣. سيضيف الذكاء الاصطناعي منعطفات مفاجئة',
    'home.step4': '٤. تعاونوا لإنشاء حكايات ملحمية!',
    
    // Story Room
    'story.typeMessage': 'اكتب رسالتك...',
    'story.send': 'إرسال',
    'story.timeRemaining': 'الوقت المتبقي',
    'story.sessionEnded': 'انتهت الجلسة',
    'story.storyBot': 'روبوت القصص',
    
    // Leaderboard
    'leaderboard.title': 'لوحة متصدري الفرق',
    'leaderboard.team': 'الفريق',
    'leaderboard.members': 'الأعضاء',
    'leaderboard.status': 'الحالة',
    'leaderboard.action': 'الإجراء',
    'leaderboard.join': 'انضم',
    'leaderboard.see': 'عرض',
    'leaderboard.active': 'نشط',
    'leaderboard.completed': 'مكتمل',
    
    // Story Summary
    'summary.title': 'اكتملت القصة!',
    'summary.stats': 'إحصائيات القصة',
    'summary.turns': 'الأدوار',
    'summary.twists': 'المنعطفات',
    'summary.words': 'الكلمات',
    'summary.contributors': 'المساهمون',
    'summary.backToHome': 'العودة للرئيسية',
    
    // Common
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.retry': 'إعادة المحاولة',
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  const isRtl = language === 'ar';

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRtl]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, isRtl, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
