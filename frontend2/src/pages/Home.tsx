import React from "react";
import { Link } from "react-router-dom";
import {
  PixelButton,
  PixelCard,
  PixelCardHeader,
  PixelCardTitle,
  PixelCardContent,
  PageContent,
} from "@/ui";
import { Sparkles, Users, Zap, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

const Home = () => {
  const { t, ready } = useTranslation();
  
  // Don't render until i18n is ready
  if (!ready) {
    return (
      <PageContent className="py-8">
        <div className="text-center">
          <h1 className="font-pixel text-2xl mb-4">🎮 Loading...</h1>
        </div>
      </PageContent>
    );
  }
  
  return (
    <PageContent className="py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        {/* Pixel clouds backdrop */}
        <div className="relative mb-8">
          <div className="absolute inset-0 -top-4 opacity-20">
            <div className="flex justify-center items-start space-x-8">
              <div className="w-16 h-8 bg-white rounded-full transform -rotate-12"></div>
              <div className="w-12 h-6 bg-white rounded-full transform rotate-6"></div>
              <div className="w-20 h-10 bg-white rounded-full transform -rotate-6"></div>
            </div>
          </div>

          {/* Hero Title */}
          <h1 className="font-pixel text-2xl sm:text-3xl md:text-4xl leading-tight mb-4 relative z-10">
            {t('home.title')}
          </h1>

          {/* Tagline */}
          <p className="font-mono text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            {t('home.subtitle')}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link to="/team-select">
            <PixelButton size="lg" className="w-full sm:w-auto">
              <Users className="w-4 h-4 mr-2" />
              {t('home.joinTeam')}
            </PixelButton>
          </Link>
          <Link to="/leaderboard">
            <PixelButton
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t('header.leaderboard')}
            </PixelButton>
          </Link>
        </div>
      </div>

      {/* Quick How to Play Instructions */}
      <div className="pixel-panel p-4 text-sm font-mono space-y-2 max-w-md mx-auto mb-8 border-2 border-primary/20 bg-background/80">
        <p className="text-primary">
          {t('home.howToPlay')}
        </p>
        <p>{t('home.step1')}</p>
        <p>{t('home.step2')}</p>
        <p>{t('home.step3')}</p>
        <p>{t('home.step4')}</p>
      </div>

      {/* How to Play Card */}
      <PixelCard className="max-w-2xl mx-auto">
        <PixelCardHeader>
          <PixelCardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            How to Play
          </PixelCardTitle>
        </PixelCardHeader>
        <PixelCardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded font-pixel text-xs flex items-center justify-center">
                1
              </div>
              <div>
                <h4 className="font-pixel text-sm mb-1">
                  Join or Create a Team
                </h4>
                <p className="text-xs text-muted-foreground font-mono">
                  Enter a team code to join friends, or create your own team to
                  start fresh.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded font-pixel text-xs flex items-center justify-center">
                2
              </div>
              <div>
                <h4 className="font-pixel text-sm mb-1">Take Turns Writing</h4>
                <p className="text-xs text-muted-foreground font-mono">
                  Add sentences to build your story collaboratively. Each player
                  contributes to the narrative.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-secondary text-secondary-foreground rounded font-pixel text-xs flex items-center justify-center">
                <Zap className="w-3 h-3" />
              </div>
              <div>
                <h4 className="font-pixel text-sm mb-1">AI Adds Twists</h4>
                <p className="text-xs text-muted-foreground font-mono">
                  Our StoryBot will inject surprise plot twists to keep things
                  exciting and unpredictable!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded font-pixel text-xs flex items-center justify-center">
                4
              </div>
              <div>
                <h4 className="font-pixel text-sm mb-1">Create Epic Tales</h4>
                <p className="text-xs text-muted-foreground font-mono">
                  Work together to craft amazing stories that none of you could
                  have imagined alone!
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Link to="/team-select">
              <PixelButton className="w-full">
                Ready to Start? Join a Team!
              </PixelButton>
            </Link>
          </div>
        </PixelCardContent>
      </PixelCard>
    </PageContent>
  );
};

export default Home;
