import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { apiClient, storage } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { Gamepad2, Users, Sparkles } from "lucide-react";

export default function TeamSelect() {
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
        title: "Missing Information",
        description: "Please enter both username and team ID.",
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
        title: "Joined Successfully!",
        description: `Welcome to team ${cleanTeamId}`,
      });
    } catch (error) {
      console.error("❌ Join failed:", error);
      toast({
        title: "Join Failed",
        description:
          error instanceof Error ? error.message : "Failed to join session",
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
                AI Storytelling Game
              </h1>
              <Sparkles size={32} className="text-accent" />
            </div>

            <p className="font-mono text-lg text-muted-foreground mb-6 leading-relaxed relative">
              <span className="absolute inset-0 text-white opacity-50 blur-sm">
                Join your team and create epic stories together with AI
                assistance!
              </span>
              <span className="relative z-10">
                Join your team and create epic stories together with AI
                assistance!
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
                  Enter User Name
                </label>
                <input
                  id="username"
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  className="w-full pixel-input"
                  placeholder="Enter your username..."
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="teamId"
                  className="block font-pixel text-sm mb-2"
                >
                  Team ID
                </label>
                <input
                  id="teamId"
                  type="text"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full pixel-input"
                  placeholder="Enter your team ID..."
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full pixel-button bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!teamId.trim() || !tempUsername.trim() || isJoining}
              >
                {isJoining ? "🔄 Joining..." : "🚀 Join Team"}
              </button>
            </form>
          </div>

          {/* Quick How to Play Instructions */}
          <div className="pixel-panel p-4 text-sm font-mono space-y-2 max-w-md mx-auto mb-6">
            <p>
              🎯 <strong>How to play:</strong>
            </p>
            <p>1. Join or create a team</p>
            <p>2. Take turns adding sentences to your story</p>
            <p>3. AI will inject surprise twists</p>
            <p>4. Collaborate to create epic tales!</p>
          </div>

          {/* Username Dialog */}
          {showUsernameDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="pixel-panel p-6 max-w-md w-full">
                <form onSubmit={handleUsernameSubmit} className="space-y-6">
                  <h2 className="font-pixel text-lg sm:text-xl mb-4 flex items-center gap-2">
                    <Users size={20} />
                    Enter Your Username
                  </h2>
                  <input
                    type="text"
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    className="w-full pixel-input"
                    placeholder="Your username..."
                    maxLength={20}
                    required
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-full pixel-button bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={!tempUsername.trim()}
                  >
                    🚀 Join Team
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
