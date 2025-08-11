import { Link } from "react-router-dom";
import { Globe, Users, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

interface HeaderProps {
  teamId?: string;
}

export function Header({ teamId }: HeaderProps) {
  const { t, i18n, ready } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [isRtl, i18n.language]);

  // Don't render until i18n is ready
  if (!ready) {
    return (
      <header className="pixel-panel p-4 mb-4 crt-effect">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-lg">🎮 Loading...</span>
          </div>
        </div>
      </header>
    );
  }
  return (
    <header className="pixel-panel p-4 mb-4 crt-effect">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="font-pixel text-lg hover:text-primary transition-colors"
          >
            {t('header.storyTwister')}
          </Link>

          {teamId && (
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <Users size={16} />
              <span className="font-pixel">{t('header.team')}: {teamId}</span>
            </div>
          )}
        </div>

        <nav className="flex items-center gap-4">
          <Link
            to="/leaderboard"
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            <Trophy size={16} />
            <span className="hidden sm:inline font-pixel text-sm">
              {t('header.leaderboard')}
            </span>
          </Link>

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 hover:text-primary transition-colors"
            aria-label="Toggle Language"
          >
            <Globe size={16} />
            <span className="hidden sm:inline font-pixel text-sm">
              {t('header.toggleLanguage')}
            </span>
          </button>
        </nav>
      </div>

      {teamId && (
        <div className="sm:hidden mt-2 flex items-center gap-2 text-sm">
          <Users size={16} />
          <span className="font-pixel">{t('header.team')}: {teamId}</span>
        </div>
      )}
    </header>
  );
}
