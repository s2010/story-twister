import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Users,
  Zap,
  TrendingUp,
  Award,
  Clock,
  FileText,
} from "lucide-react";
import {
  PixelButton,
  PixelCard,
  PixelCardHeader,
  PixelCardTitle,
  PixelCardContent,
  PageContent,
} from "@/ui";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/api/client";

interface SessionAnalysis {
  session_id: string;
  team_code: string;
  team_name: string;
  status: "completed" | "active";
  duration: string;
  completed_at?: string;

  // Story metrics
  total_turns: number;
  user_turns: number;
  twist_count: number;
  word_count: number;
  participants: string[];

  // Analysis scores
  creativity_score: number;
  engagement_score: number;
  collaboration_score: number;
  overall_score: number;

  // Detailed breakdown
  participant_contributions: { [key: string]: number };
  turn_distribution: { user: number; twist: number };
}

interface CompletedSession {
  id: string;
  team_code: string;
  team_name: string;
  completed_at: string;
  participants: number;
  total_turns: number;
  overall_score: number;
}

export default function AdminAnalysis() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [completedSessions, setCompletedSessions] = useState<
    CompletedSession[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<"overview" | "details">(
    "overview",
  );
  const { toast } = useToast();

  useEffect(() => {
    const loadAnalysisData = async () => {
      try {
        setIsLoading(true);

        if (sessionId) {
          const response = await apiClient.admin.getSessionAnalysis(sessionId);
          console.log("📊 Admin Session Analysis data loaded:", response);
          setAnalysis(response);
        } else {
          const response = await apiClient.admin.getAnalysisList();
          console.log("📊 Admin Analysis List data loaded:", response);
          setCompletedSessions(response.completed_sessions || []);
        }
      } catch (error) {
        console.error("Failed to load analysis data:", error);
        toast({
          title: "Error Loading Analysis",
          description: "Could not load analysis data. Please try again.",
          variant: "destructive",
        });
        // Clear data on error
        if (sessionId) {
          setAnalysis(null);
        } else {
          setCompletedSessions([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalysisData();
  }, [sessionId, toast]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Good";
    if (score >= 70) return "Fair";
    return "Needs Improvement";
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <PageContent className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="font-mono text-sm text-muted-foreground">
            Loading analysis data...
          </div>
        </div>
      </PageContent>
    );
  }

  // Session list view
  if (!sessionId) {
    return (
      <PageContent className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-pixel text-2xl mb-2">Session Analysis</h1>
            <p className="text-muted-foreground font-mono text-sm">
              Review completed storytelling sessions and performance metrics
            </p>
          </div>
          <Link to="/admin">
            <PixelButton variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </PixelButton>
          </Link>
        </div>

        {/* Completed Sessions */}
        <PixelCard>
          <PixelCardHeader>
            <PixelCardTitle>Completed Sessions</PixelCardTitle>
          </PixelCardHeader>
          <PixelCardContent className="p-0">
            {completedSessions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="font-mono text-sm text-muted-foreground">
                  No completed sessions
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {completedSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-pixel text-sm">
                            {session.team_name}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {session.participants} participants •{" "}
                            {session.total_turns} turns
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div
                            className={`font-pixel text-lg ${getScoreColor(session.overall_score)}`}
                          >
                            {session.overall_score}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {getScoreBadge(session.overall_score)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono text-xs text-muted-foreground">
                            {formatDate(session.completed_at)}
                          </div>
                        </div>

                        <Link to={`/admin/analysis/${session.id}`}>
                          <PixelButton size="sm" variant="outline">
                            <BarChart3 className="w-4 h-4 mr-1" />
                            View Analysis
                          </PixelButton>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PixelCardContent>
        </PixelCard>
      </PageContent>
    );
  }

  // Individual session analysis view
  if (!analysis) {
    return (
      <PageContent className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="font-mono text-sm text-muted-foreground">
            Analysis not found
          </div>
          <Link to="/admin/analysis" className="mt-4 inline-block">
            <PixelButton variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Analysis
            </PixelButton>
          </Link>
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/analysis">
            <PixelButton variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </PixelButton>
          </Link>
          <div>
            <h1 className="font-pixel text-xl">
              {analysis.team_name} Analysis
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              Session completed{" "}
              {analysis.completed_at
                ? formatDate(analysis.completed_at)
                : "Recently"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <PixelButton
            variant={selectedView === "overview" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("overview")}
          >
            Overview
          </PixelButton>
          <PixelButton
            variant={selectedView === "details" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("details")}
          >
            Details
          </PixelButton>
        </div>
      </div>

      {selectedView === "overview" ? (
        <>
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <PixelCard>
              <PixelCardContent className="p-4 text-center">
                <Award className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div
                  className={`font-pixel text-2xl ${getScoreColor(analysis.overall_score)}`}
                >
                  {analysis.overall_score}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  Overall Score
                </div>
                <div className="text-xs font-mono mt-1">
                  {getScoreBadge(analysis.overall_score)}
                </div>
              </PixelCardContent>
            </PixelCard>

            <PixelCard>
              <PixelCardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-secondary" />
                <div
                  className={`font-pixel text-xl ${getScoreColor(analysis.creativity_score)}`}
                >
                  {analysis.creativity_score}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  Creativity
                </div>
              </PixelCardContent>
            </PixelCard>

            <PixelCard>
              <PixelCardContent className="p-4 text-center">
                <Zap className="w-6 h-6 mx-auto mb-2 text-accent" />
                <div
                  className={`font-pixel text-xl ${getScoreColor(analysis.engagement_score)}`}
                >
                  {analysis.engagement_score}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  Engagement
                </div>
              </PixelCardContent>
            </PixelCard>

            <PixelCard>
              <PixelCardContent className="p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
                <div
                  className={`font-pixel text-xl ${getScoreColor(analysis.collaboration_score)}`}
                >
                  {analysis.collaboration_score}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  Collaboration
                </div>
              </PixelCardContent>
            </PixelCard>
          </div>

          {/* Session Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <PixelCard>
              <PixelCardContent className="p-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-pixel text-sm">
                      {analysis.total_turns}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Total Turns
                    </div>
                  </div>
                </div>
              </PixelCardContent>
            </PixelCard>

            <PixelCard>
              <PixelCardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-secondary" />
                  <div>
                    <div className="font-pixel text-sm">
                      {analysis.participants.length}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Participants
                    </div>
                  </div>
                </div>
              </PixelCardContent>
            </PixelCard>

            <PixelCard>
              <PixelCardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent" />
                  <div>
                    <div className="font-pixel text-sm">
                      {analysis.twist_count}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      AI Twists
                    </div>
                  </div>
                </div>
              </PixelCardContent>
            </PixelCard>

            <PixelCard>
              <PixelCardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <div>
                    <div className="font-pixel text-sm">
                      {analysis.duration}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Duration
                    </div>
                  </div>
                </div>
              </PixelCardContent>
            </PixelCard>
          </div>

          {/* Participant Contributions */}
          <PixelCard>
            <PixelCardHeader>
              <PixelCardTitle>Participant Contributions</PixelCardTitle>
            </PixelCardHeader>
            <PixelCardContent className="p-4">
              <div className="space-y-3">
                {Object.entries(analysis.participant_contributions).map(
                  ([participant, count]) => (
                    <div
                      key={participant}
                      className="flex items-center justify-between"
                    >
                      <span className="font-mono text-sm">{participant}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${(count / Math.max(...Object.values(analysis.participant_contributions))) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="font-pixel text-sm w-8 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </PixelCardContent>
          </PixelCard>
        </>
      ) : (
        /* Details View */
        <div className="space-y-6">
          {/* Timeline */}
          <PixelCard>
            <PixelCardHeader>
              <PixelCardTitle>Session Timeline</PixelCardTitle>
            </PixelCardHeader>
            <PixelCardContent className="p-4">
              <div className="space-y-3">
                {analysis.timelineEvents.map((event, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatDate(event.timestamp)}
                        </span>
                        {event.participant && (
                          <span className="font-mono text-xs font-bold">
                            {event.participant}
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-sm">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </PixelCardContent>
          </PixelCard>

          {/* Turn Distribution */}
          <PixelCard>
            <PixelCardHeader>
              <PixelCardTitle>Turn Distribution</PixelCardTitle>
            </PixelCardHeader>
            <PixelCardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="font-pixel text-2xl text-primary">
                    {analysis.turn_distribution.user}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    User Contributions
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-pixel text-2xl text-secondary">
                    {analysis.turn_distribution.twist}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    AI Plot Twists
                  </div>
                </div>
              </div>
            </PixelCardContent>
          </PixelCard>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex gap-4 justify-center">
        <Link to={`/admin/live/${analysis.session_id}`}>
          <PixelButton variant="outline">View Live Session</PixelButton>
        </Link>
        <Link to={`/story-summary/${analysis.team_code}`}>
          <PixelButton variant="outline">View Story Summary</PixelButton>
        </Link>
      </div>
    </PageContent>
  );
}
