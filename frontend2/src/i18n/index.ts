import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Define translations inline to avoid import issues
const resources = {
  en: {
    translation: {
      "header": {
        "storyTwister": "🎮 Story Twister",
        "team": "Team",
        "leaderboard": "Leaderboard",
        "toggleLanguage": "عربي"
      },
      "home": {
        "title": "AI Storytelling Game",
        "subtitle": "Join your team and create epic stories together with AI assistance!",
        "enterUsername": "Enter User Name",
        "usernamePlaceholder": "Enter your username...",
        "teamId": "Team ID",
        "teamIdPlaceholder": "Enter your team ID...",
        "joinTeam": "🚀 Join Team",
        "howToPlay": "🎯 How to play:",
        "step1": "1. Join or create a team",
        "step2": "2. Take turns adding sentences to your story",
        "step3": "3. AI will inject surprise twists",
        "step4": "4. Collaborate to create epic tales!"
      },
      "teamSelect": {
        "title": "Join Your Team",
        "enterUsername": "Enter User Name",
        "usernamePlaceholder": "Enter your username...",
        "teamId": "Team ID",
        "teamIdPlaceholder": "Enter your team ID...",
        "joinTeam": "🚀 Join Team",
        "joining": "Joining...",
        "missingInfo": "Missing Information",
        "missingInfoDesc": "Please enter both username and team ID.",
        "joinError": "Join Error",
        "joinSuccess": "Welcome to the team!",
        "howToPlay": "🎯 How to play:",
        "step1": "1. Join or create a team",
        "step2": "2. Take turns adding sentences to your story",
        "step3": "3. AI will inject surprise twists",
        "step4": "4. Collaborate to create epic tales!"
      },
      "storyRoom": {
        "typeMessage": "Type your message...",
        "send": "Send",
        "sending": "Sending...",
        "timeRemaining": "Time Remaining",
        "sessionEnded": "Session Ended",
        "storyBot": "StoryBot",
        "storyTwister": "🤖 StoryTwister",
        "sessionExpired": "Session has expired",
        "sessionExpiredDesc": "The storytelling session has ended.",
        "messageSent": "Message sent!",
        "messageError": "Failed to send message",
        "messageErrorDesc": "Please try again.",
        "systemMessage": "System",
        "userJoined": "{{username}} joined the session",
        "userLeft": "{{username}} left the session",
        "sessionStarted": "Session started! Begin your story...",
        "twistAdded": "Plot twist added by AI!"
      },
      "leaderboard": {
        "title": "Team Leaderboard",
        "team": "Team",
        "members": "Members",
        "status": "Status",
        "action": "Action",
        "join": "Join",
        "see": "See",
        "active": "Active",
        "completed": "Completed",
        "waiting": "Waiting",
        "loading": "Loading teams...",
        "noTeams": "No teams found",
        "timeRemaining": "Time: {{time}}",
        "frozenTime": "Ended: {{time}}"
      },
      "storySummary": {
        "title": "Story Complete!",
        "subtitle": "Your collaborative masterpiece",
        "stats": "Story Stats",
        "turns": "Turns",
        "twists": "Twists",
        "words": "Words",
        "contributors": "Contributors",
        "backToHome": "Back to Home",
        "loading": "Loading story...",
        "error": "Failed to load story",
        "storyContent": "Final Story",
        "teamName": "Team: {{team}}"
      },
      "common": {
        "loading": "Loading...",
        "error": "Error",
        "retry": "Retry",
        "cancel": "Cancel",
        "confirm": "Confirm",
        "save": "Save",
        "close": "Close",
        "yes": "Yes",
        "no": "No",
        "ok": "OK",
        "back": "Back",
        "next": "Next",
        "previous": "Previous",
        "submit": "Submit"
      },
      "errors": {
        "networkError": "Network error. Please check your connection.",
        "serverError": "Server error. Please try again later.",
        "notFound": "Page not found.",
        "unauthorized": "Unauthorized access.",
        "forbidden": "Access forbidden.",
        "validationError": "Please check your input.",
        "sessionExpired": "Your session has expired. Please refresh the page.",
        "unknownError": "An unexpected error occurred."
      }
    }
  },
  ar: {
    translation: {
      "header": {
        "storyTwister": "🎮 حبكه",
        "team": "الفريق",
        "leaderboard": "لوحة المتصدرين",
        "toggleLanguage": "ENG"
      },
      "home": {
        "title": "لعبة سرد القصص بالذكاء الاصطناعي",
        "subtitle": "انضم إلى فريقك وأنشئ قصصاً ملحمية معاً بمساعدة الذكاء الاصطناعي!",
        "enterUsername": "أدخل اسم المستخدم",
        "usernamePlaceholder": "أدخل اسم المستخدم...",
        "teamId": "معرف الفريق",
        "teamIdPlaceholder": "أدخل معرف الفريق...",
        "joinTeam": "🚀 انضم للفريق",
        "howToPlay": "🎯 كيفية اللعب:",
        "step1": "١. انضم أو أنشئ فريقاً",
        "step2": "٢. تناوبوا في إضافة جمل لقصتكم",
        "step3": "٣. سيضيف الذكاء الاصطناعي منعطفات مفاجئة",
        "step4": "٤. تعاونوا لإنشاء حكايات ملحمية!"
      },
      "teamSelect": {
        "title": "حبكه",
        "enterUsername": "أدخل اسم المستخدم",
        "usernamePlaceholder": "أدخل اسم المستخدم...",
        "teamId": "معرف الفريق",
        "teamIdPlaceholder": "أدخل معرف الفريق...",
        "joinTeam": "🚀 انضم للفريق",
        "joining": "جاري الانضمام...",
        "missingInfo": "معلومات مفقودة",
        "missingInfoDesc": "يرجى إدخال اسم المستخدم ومعرف الفريق.",
        "joinError": "خطأ في الانضمام",
        "joinSuccess": "مرحباً بك في الفريق!",
        "howToPlay": "🎯 كيفية اللعب:",
        "step1": "١. انضم أو أنشئ فريقاً",
        "step2": "٢. تناوبوا في إضافة جمل لقصتكم",
        "step3": "٣. سيضيف الذكاء الاصطناعي منعطفات مفاجئة",
        "step4": "٤. تعاونوا لإنشاء حكايات ملحمية!"
      },
      "storyRoom": {
        "typeMessage": "اكتب رسالتك...",
        "send": "إرسال",
        "sending": "جاري الإرسال...",
        "timeRemaining": "الوقت المتبقي",
        "sessionEnded": "انتهت الجلسة",
        "storyBot": "روبوت القصص",
        "storyTwister": "🤖 حبكه",
        "sessionExpired": "انتهت صلاحية الجلسة",
        "sessionExpiredDesc": "انتهت جلسة سرد القصص.",
        "messageSent": "تم إرسال الرسالة!",
        "messageError": "فشل في إرسال الرسالة",
        "messageErrorDesc": "يرجى المحاولة مرة أخرى.",
        "systemMessage": "النظام",
        "userJoined": "انضم {{username}} إلى الجلسة",
        "userLeft": "غادر {{username}} الجلسة",
        "sessionStarted": "بدأت الجلسة! ابدأ قصتك...",
        "twistAdded": "أضاف الذكاء الاصطناعي منعطفاً في القصة!"
      },
      "leaderboard": {
        "title": "لوحة متصدري الفرق",
        "team": "الفريق",
        "members": "الأعضاء",
        "status": "الحالة",
        "action": "الإجراء",
        "join": "انضم",
        "see": "عرض",
        "active": "نشط",
        "completed": "مكتمل",
        "waiting": "في الانتظار",
        "loading": "جاري تحميل الفرق...",
        "noTeams": "لم يتم العثور على فرق",
        "timeRemaining": "الوقت: {{time}}",
        "frozenTime": "انتهت: {{time}}"
      },
      "storySummary": {
        "title": "اكتملت القصة!",
        "subtitle": "تحفتكم التعاونية",
        "stats": "إحصائيات القصة",
        "turns": "الأدوار",
        "twists": "المنعطفات",
        "words": "الكلمات",
        "contributors": "المساهمون",
        "backToHome": "العودة للرئيسية",
        "loading": "جاري تحميل القصة...",
        "error": "فشل في تحميل القصة",
        "storyContent": "القصة النهائية",
        "teamName": "الفريق: {{team}}"
      },
      "common": {
        "loading": "جاري التحميل...",
        "error": "خطأ",
        "retry": "إعادة المحاولة",
        "cancel": "إلغاء",
        "confirm": "تأكيد",
        "save": "حفظ",
        "close": "إغلاق",
        "yes": "نعم",
        "no": "لا",
        "ok": "موافق",
        "back": "رجوع",
        "next": "التالي",
        "previous": "السابق",
        "submit": "إرسال"
      },
      "errors": {
        "networkError": "خطأ في الشبكة. يرجى التحقق من اتصالك.",
        "serverError": "خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.",
        "notFound": "الصفحة غير موجودة.",
        "unauthorized": "وصول غير مصرح به.",
        "forbidden": "الوصول محظور.",
        "validationError": "يرجى التحقق من المدخلات.",
        "sessionExpired": "انتهت صلاحية جلستك. يرجى تحديث الصفحة.",
        "unknownError": "حدث خطأ غير متوقع."
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;
