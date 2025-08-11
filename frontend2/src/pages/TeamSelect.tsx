import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { apiClient, storage } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { Gamepad2, Users, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function TeamSelect() {
  const { t, ready } = useTranslation();
  const [teamId, setTeamId] = useState("");
  const [username, setUsername] = useLocalStorage("username", "");
  const [tempUsername, setTempUsername] = useState("");
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [, setStoredTeamId] = useLocalStorage("teamId", "");
  const [isRtl, setIsRtl] = useLocalStorage("isRtl", false);
  const [isJoining, setIsJoining] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Don't render until i18n is ready
  if (!ready) {
    return (
      <div>
        <Header />
        <div className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-300 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-pixel text-2xl mb-4">🎮 Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  // Handle URL parameters for prefill and focus
  useEffect(() => {
    const urlTeamCode = searchParams.get("teamCode");
    const shouldHighlight = searchParams.get("highlight") === "nickname";

    // Prefill team code from URL if provided
    if (urlTeamCode && urlTeamCode.trim()) {
      setTeamId(urlTeamCode.trim());
    }

    // Clear username on component mount to ensure dialog always shows
    setUsername("");
  }, [setUsername, searchParams]);

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId.trim() || !tempUsername.trim()) {
      toast({
        title: t("teamSelect.missingInfo"),
        description: t("teamSelect.missingInfoDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      const cleanTeamId = teamId.trim().toLowerCase().replace(/\s+/g, "_");
      const cleanUsername = tempUsername.trim();

      // Save to localStorage using storage utility (as strings, no JSON.parse)
      storage.setNickname(cleanUsername);
      storage.setTeamCode(cleanTeamId);
      localStorage.setItem("authMode", "event");

      // Join session via API
      const result = await apiClient.sessions.join();

      // Set legacy localStorage for compatibility
      setStoredTeamId(cleanTeamId);
      setUsername(cleanUsername);

      // Navigate to room
      const encodedTeamCode = encodeURIComponent(cleanTeamId);
      navigate(`/room/${encodedTeamCode}`);

      toast({
        title: t("teamSelect.joinSuccess"),
        description: `${t("teamSelect.joinSuccess")} ${cleanTeamId}`,
      });
    } catch (error) {
      console.error("❌ Join failed:", error);
      toast({
        title: t("teamSelect.joinError"),
        description:
          error instanceof Error ? error.message : t("teamSelect.joinError"),
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleQuickJoin = (team: string) => {
    setTeamId(team);
    setStoredTeamId(team);

    // Check if username exists, if not show dialog
    if (!username) {
      setShowUsernameDialog(true);
      return;
    }

    navigate(`/room/${team}`);
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
      setShowUsernameDialog(false);

      // Navigate to the room after setting username
      const currentTeamId = teamId || localStorage.getItem("teamId") || "";
      if (currentTeamId) {
        navigate(`/room/${currentTeamId}`);
      }
      setTempUsername("");
    }
  };

  const suggestedTeams = [
    "team_alpha",
    "team_beta",
    "team_gamma",
    "team_delta",
  ];

  return (
    <div
      className={`flex flex-col h-full animated-clouds grass-pattern ${isRtl ? "rtl" : "ltr"}`}
    >
      <Header isRtl={isRtl} onToggleRtl={() => setIsRtl(!isRtl)} />

      <main className="container mx-auto px-4 py-4 sm:py-8 content-container">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <Gamepad2 size={32} className="text-primary" />
              <h1 className="font-pixel text-2xl md:text-3xl animate-bounce hover:scale-105 transition-all duration-500 cursor-pointer select-none bg-gradient-to-r from-slate-700 via-gray-800 to-slate-900 bg-clip-text text-transparent animate-pulse">
                {t("teamSelect.title")}
              </h1>
              <Sparkles size={32} className="text-accent" />
            </div>

            <p className="font-mono text-lg text-muted-foreground mb-6 leading-relaxed relative">
              <span className="absolute inset-0 text-white opacity-50 blur-sm">
                {t("home.subtitle")}
              </span>
              <span className="relative z-10 font-bold">
                {t("home.subtitle")}
              </span>
            </p>
          </div>

          {/* Team Selection Form */}
          <div className="pixel-panel p-6 mb-6 crt-effect max-w-md mx-auto">
            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block font-pixel text-sm mb-2"
                >
                  {t("teamSelect.enterUsername")}
                </label>
                <input
                  id="username"
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  className="w-full pixel-input"
                  placeholder={t("teamSelect.usernamePlaceholder")}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="teamId"
                  className="block font-pixel text-sm mb-2"
                >
                  {t("teamSelect.teamId")}
                </label>
                <input
                  id="teamId"
                  type="text"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full pixel-input"
                  placeholder={t("teamSelect.teamIdPlaceholder")}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full pixel-button bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!teamId.trim() || !tempUsername.trim() || isJoining}
              >
                {isJoining ? `🔄 ${t("teamSelect.joining")}` : t("teamSelect.joinTeam")}
              </button>
            </form>
          </div>

          {/* Quick How to Play Instructions */}
          <div className="pixel-panel p-4 text-sm font-mono space-y-2 max-w-md mx-auto mb-6">
            <p>
              {t("teamSelect.howToPlay")}
            </p>
            <p>{t("teamSelect.step1")}</p>
            <p>{t("teamSelect.step2")}</p>
            <p>{t("teamSelect.step3")}</p>
            <p>{t("teamSelect.step4")}</p>
          </div>

          {/* Username Dialog */}
          {showUsernameDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="pixel-panel p-6 max-w-md w-full">
                <form onSubmit={handleUsernameSubmit} className="space-y-6">
                  <h2 className="font-pixel text-lg sm:text-xl mb-4 flex items-center gap-2">
                    <Users size={20} />
                    {t("teamSelect.enterUsername")}
                  </h2>
                  <input
                    type="text"
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    className="w-full pixel-input"
                    placeholder={t("teamSelect.usernamePlaceholder")}
                    maxLength={20}
                    required
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-full pixel-button bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={!tempUsername.trim()}
                  >
                    {t("teamSelect.joinTeam")}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
