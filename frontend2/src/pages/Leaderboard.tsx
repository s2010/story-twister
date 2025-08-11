import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trophy, Users, Clock, Zap, FileText, Home } from "lucide-react";
import { Team } from "@/types/game";
import { apiClient } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function Leaderboard() {
  const { t, ready } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Don't render until i18n is ready
  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-300 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-pixel text-2xl mb-4">🎮 Loading...</h1>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const loadTeams = async () => {
      try {
        // Use the proper backend API for leaderboard
        const response = await apiClient.leaderboard.getTeams();

        // Convert backend data to frontend Team format and filter only completed sessions
        const convertedTeams: Team[] = (response.teams || [])
          .filter((team: any) => team.session_status === "completed") // Only show completed sessions
          .map((team: any) => {
            const convertedTeam = {
              id: team.team_code,
              storyLength: team.user_turns || team.total_turns || 0, // Use user_turns if available, fallback to total_turns
              lastTwist: team.last_active
                ? new Date(team.last_active).toLocaleDateString()
                : "No activity yet",
              teamName: team.team_name,
              creativityScore: team.avg_creativity_score || 0,
              status: team.session_status, // Use real twist count from backend
              score:
                team.stories_completed * 100 +
                team.total_turns * 10 +
                (team.avg_creativity_score || 0) +
                (team.avg_engagement_score || 0) +
                (team.avg_collaboration_score || 0),
              sessionEndedAt: team.session_ended_at,
            };

            return {
              id: convertedTeam.id,
              name: convertedTeam.teamName,
              participants: team.participant_count,
              userTurns: convertedTeam.storyLength,
              realTwistCount: team.twist_count || 0,
              totalTurns: team.total_turns,
              creativityScore: convertedTeam.creativityScore,
              finalScore: convertedTeam.score,
              sessionId: team.session_id,
              timeRemaining: team.time_remaining || "00:00",
            };
          });

        // Sort teams by score (highest first)
        const sortedTeams = convertedTeams.sort((a, b) => {
          const scoreA = typeof a.score === "number" ? a.score : 0;
          const scoreB = typeof b.score === "number" ? b.score : 0;
          return scoreB - scoreA;
        });

        setTeams(sortedTeams);
      } catch (error) {
        console.error("Failed to load teams:", error);
        toast({
          title: "Connection Error",
          description: "Failed to load leaderboard. Please try again.",
          variant: "destructive",
        });

        // Fallback: show empty state
        setTeams([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeams();
  }, [toast]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return "🥇";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return `#${index + 1}`;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p style={{ fontSize: "14px" }}>{t("leaderboard.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors touch-button"
          >
            <Home size={20} />
            <span className="hidden sm:inline">{t("common.back")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-yellow-500" />
            <h1 className="text-lg font-bold">{t("leaderboard.title")}</h1>
          </div>
          <div className="w-8" /> {/* Spacer for center alignment */}
        </div>
      </div>

      {/* Content */}
      <div className="content-container">
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <div className="text-center mb-6">
            <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
              {t("home.subtitle")}
            </p>
          </div>

          <div className="space-y-4">
            {teams.map((team, index) => (
              <div
                key={team.id}
                className="pixel-panel p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold min-w-[2.5rem] text-center">
                      {getRankIcon(index)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{team.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {team.memberCount || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {team.storyLength}
                          {team.sessionStatus === "completed" &&
                            team.sessionEndedAt && (
                              <span
                                className="text-red-500 ml-1"
                                title="Session ended"
                              >
                                ⏸️
                              </span>
                            )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap size={12} />
                          {team.twistUsage || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">
                      {typeof team.score === "number"
                        ? team.score
                        : team.score?.total || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">{t("common.score")}</div>
                  </div>
                </div>

                {/* Scores breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-bold">{team.creativityScore}%</div>
                    <div className="text-muted-foreground">{t("storySummary.stats")}</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-bold">{team.twistUsage}</div>
                    <div className="text-muted-foreground">{t("storySummary.twists")}</div>
                  </div>
                </div>

                {team.lastTwist && (
                  <div className="mt-3 p-2 bg-muted/30 rounded">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("storyRoom.twistAdded")}
                    </p>
                    <p className="text-xs italic">"{team.lastTwist}"</p>
                  </div>
                )}

                {/* Action buttons - All sessions are completed (read-only) */}
                <div className="flex gap-2 mt-3">
                  <Link
                    to={`/room/${team.id}`}
                    className="flex-1 text-center py-2 px-3 bg-muted text-white rounded text-xs font-medium hover:bg-muted/80 transition-colors touch-button"
                    title="View completed session - read-only mode"
                  >
                    {t("leaderboard.see")}
                  </Link>
                  <Link
                    to={`/story-summary/${team.id}`}
                    className="flex items-center justify-center py-2 px-3 bg-secondary text-secondary-foreground rounded text-xs font-medium hover:bg-secondary/90 transition-colors touch-button"
                  >
                    <FileText size={14} />
                    <span className="ml-1 hidden sm:inline">{t("storySummary.title")}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {teams.length === 0 && (
            <div className="text-center py-12">
              <Trophy
                size={48}
                className="mx-auto text-muted-foreground mb-4"
              />
              <h3 className="text-lg font-medium mb-2">
                {t("leaderboard.noTeams")}
              </h3>
              <p className="text-muted-foreground">
                {t("home.subtitle")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
