import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Clock,
  MessageSquare,
  Zap,
  Eye,
  EyeOff,
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

interface LiveMessage {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  type: "user" | "twist" | "system";
}

interface SessionInfo {
  id: string;
  team_code: string;
  team_name: string;
  participants: number;
  status: "active" | "waiting" | "completed";
  time_remaining: string;
  total_turns: number;
  twist_count: number;
}

export default function AdminLiveView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadSessionData = async () => {
      try {
        setIsLoading(true);
        if (!sessionId) return;

        const response = await apiClient.admin.getLiveView(sessionId);
        console.log("🔴 Admin Live View data loaded:", response);

        setSessionInfo(response.session_info);
        setMessages(response.messages || []);
      } catch (error) {
        console.error("Failed to load session data:", error);
        toast({
          title: "Error Loading Session",
          description: "Could not load session data. Please try again.",
          variant: "destructive",
        });
        // Clear data on error
        setSessionInfo(null);
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      loadSessionData();

      // Auto-refresh every 5 seconds for real-time updates
      const interval = setInterval(loadSessionData, 5000);
      return () => clearInterval(interval);
    }
  }, [sessionId, toast]);

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "twist":
        return <Zap className="w-4 h-4 text-secondary" />;
      case "system":
        return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
      default:
        return <MessageSquare className="w-4 h-4 text-primary" />;
    }
  };

  const getMessageStyle = (type: string) => {
    switch (type) {
      case "twist":
        return "border-l-4 border-secondary bg-secondary/5";
      case "system":
        return "border-l-4 border-muted bg-muted/20";
      default:
        return "border-l-4 border-primary bg-primary/5";
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <PageContent className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="font-mono text-sm text-muted-foreground">
            Loading session data...
          </div>
        </div>
      </PageContent>
    );
  }

  if (!sessionInfo) {
    return (
      <PageContent className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="font-mono text-sm text-muted-foreground">
            Session not found
          </div>
          <Link to="/admin" className="mt-4 inline-block">
            <PixelButton variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
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
          <Link to="/admin">
            <PixelButton variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </PixelButton>
          </Link>
          <div>
            <h1 className="font-pixel text-xl">{sessionInfo.team_name}</h1>
            <p className="text-muted-foreground font-mono text-sm">
              Live Session Monitor • Code: {sessionInfo.team_code.toUpperCase()}
            </p>
          </div>
        </div>

        <PixelButton
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
        >
          {isVisible ? (
            <EyeOff className="w-4 h-4 mr-2" />
          ) : (
            <Eye className="w-4 h-4 mr-2" />
          )}
          {isVisible ? "Hide Messages" : "Show Messages"}
        </PixelButton>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <PixelCard>
          <PixelCardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <div>
                <div className="font-pixel text-sm">
                  {sessionInfo.participants}
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
              <Clock className="w-4 h-4 text-accent" />
              <div>
                <div className="font-pixel text-sm">
                  {sessionInfo.time_remaining}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  Remaining
                </div>
              </div>
            </div>
          </PixelCardContent>
        </PixelCard>

        <PixelCard>
          <PixelCardContent className="p-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-secondary" />
              <div>
                <div className="font-pixel text-sm">
                  {sessionInfo.total_turns}
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
              <Zap className="w-4 h-4 text-yellow-500" />
              <div>
                <div className="font-pixel text-sm">
                  {sessionInfo.twist_count}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  AI Twists
                </div>
              </div>
            </div>
          </PixelCardContent>
        </PixelCard>
      </div>

      {/* Live Messages */}
      {isVisible && (
        <PixelCard>
          <PixelCardHeader>
            <PixelCardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Live Story Feed
              <span className="ml-auto text-xs font-mono text-muted-foreground">
                Auto-refreshing every 5s
              </span>
            </PixelCardTitle>
          </PixelCardHeader>
          <PixelCardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="font-mono text-sm text-muted-foreground">
                    No messages yet
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 ${getMessageStyle(message.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getMessageIcon(message.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold">
                              {message.author}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {formatTime(message.timestamp)}
                            </span>
                            {message.type === "twist" && (
                              <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs font-mono">
                                AI TWIST
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-sm leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PixelCardContent>
        </PixelCard>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-4 justify-center">
        <Link to={`/admin/analysis/${sessionId}`}>
          <PixelButton variant="outline">View Analysis</PixelButton>
        </Link>
        <Link to={`/room/${sessionInfo.team_code}`}>
          <PixelButton variant="outline">Join Session</PixelButton>
        </Link>
      </div>
    </PageContent>
  );
}
