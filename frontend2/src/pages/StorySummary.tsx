import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Copy,
  Share2,
  Clock,
  Zap,
  Hash,
  Type,
} from "lucide-react";
import {
  PixelButton,
  PixelCard,
  PixelCardHeader,
  PixelCardTitle,
  PixelCardContent,
  PageContent,
} from "@/ui";
import { apiClient, storage } from "@/api/client";
import { useToast } from "@/hooks/use-toast";

export default function StorySummary() {
  const { teamId } = useParams<{ teamId: string }>();
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Real story stats from backend
  const [stats, setStats] = useState({
    sentences: 0,
    twists: 0,
    wordCount: 0,
    contributors: 0,
  });

  const handleCopyText = () => {
    navigator.clipboard.writeText(summary);
    toast({
      title: "Copied!",
      description: "Story text copied to clipboard.",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Story by Team ${teamId?.replace("_", " ").toUpperCase()}`,
        text: summary,
        url: window.location.href,
      });
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied!",
        description: "Story link copied to clipboard.",
      });
    }
  };

  useEffect(() => {
    const loadSummary = async () => {
      if (!teamId) return;

      try {
        setIsLoading(true);

        // Get team code from localStorage or URL params
        const teamCode = storage.getTeamCode() || teamId;
        if (!teamCode) {
          throw new Error("No team code available");
        }

        // Fetch the active story for this team
        const stories = await apiClient.stories.list(teamCode, "active");

        if (stories.length === 0) {
          throw new Error("No active story found for this team");
        }

        const story = stories[0];

        // Get all story turns to build the complete narrative
        const turns = await apiClient.stories.getTurns(story.id);

        // Build the complete story text from turns
        const storyText = turns
          .map((turn: any) => {
            // Check multiple possible field names for twist identification
            const isAITwist =
              turn.turn_type === "twist" ||
              turn.type === "twist" ||
              turn.is_twist === true ||
              turn.author === "StoryTwister" ||
              turn.nickname === "StoryTwister";
            const prefix = isAITwist ? "**[TWIST]** " : "";
            const author = turn.author || turn.nickname || "Unknown";
            return `${prefix}${turn.content}`;
          })
          .join("\n\n");

        // Set the complete story summary
        setSummary(storyText || "No story content available yet.");

        // Update stats based on real data - check multiple possible twist identification methods
        const twistTurns = turns.filter(
          (turn: any) =>
            turn.turn_type === "twist" ||
            turn.type === "twist" ||
            turn.is_twist === true ||
            turn.author === "StoryTwister" ||
            turn.nickname === "StoryTwister",
        );
        const userTurns = turns.filter(
          (turn: any) => !twistTurns.includes(turn),
        );

        setStats({
          wordCount: storyText.split(/\s+/).length,
          sentences: turns.length,
          twists: twistTurns.length,
          contributors: [
            ...new Set(turns.map((turn: any) => turn.author || turn.nickname)),
          ].length,
        });
      } catch (error) {
        console.error("Failed to load story summary:", error);
        toast({
          title: "Error Loading Summary",
          description: "Could not load the story summary. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [teamId, toast]);

  if (!teamId) {
    return (
      <PageContent className="min-h-screen flex items-center justify-center">
        <PixelCard className="max-w-md">
          <PixelCardContent className="text-center p-6">
            <h2 className="font-pixel text-lg mb-2">Team not found</h2>
            <p className="text-muted-foreground font-mono text-sm">
              Please check the URL and try again.
            </p>
          </PixelCardContent>
        </PixelCard>
      </PageContent>
    );
  }

  return (
    <PageContent className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/leaderboard"
          className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline font-mono">
            Back to Leaderboard
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <FileText size={20} />
          <h1 className="font-pixel text-lg">Story Summary</h1>
        </div>
        <div className="w-8" /> {/* Spacer for center alignment */}
      </div>

      <div className="space-y-6">
        {/* Story Card */}
        <PixelCard>
          <PixelCardHeader>
            <PixelCardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded flex items-center justify-center font-pixel text-sm">
                {teamId.charAt(teamId.indexOf("_") + 1).toUpperCase()}
              </div>
              <div>
                <div className="font-pixel text-lg">
                  Team {teamId.replace("_", " ").toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground font-mono font-normal">
                  Final Story
                </div>
              </div>
            </PixelCardTitle>
          </PixelCardHeader>
          <PixelCardContent>
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                <div className="space-y-2 pt-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-3 bg-muted rounded animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="font-mono text-sm leading-relaxed space-y-4">
                {summary.split("\n\n").map((paragraph, index) => (
                  <p key={index} className="text-foreground">
                    {paragraph.replace(/\*\*(.*?)\*\*/g, "$1").trim()}
                  </p>
                ))}
              </div>
            )}
          </PixelCardContent>
        </PixelCard>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <PixelCard className="text-center">
            <PixelCardContent className="p-4">
              <div className="flex flex-col items-center gap-2">
                <Hash className="w-6 h-6 text-primary" />
                <div className="font-pixel text-lg">{stats.sentences}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  Turns
                </div>
              </div>
            </PixelCardContent>
          </PixelCard>

          <PixelCard className="text-center">
            <PixelCardContent className="p-4">
              <div className="flex flex-col items-center gap-2">
                <Zap className="w-6 h-6 text-secondary" />
                <div className="font-pixel text-lg">{stats.twists}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  Twists
                </div>
              </div>
            </PixelCardContent>
          </PixelCard>

          <PixelCard className="text-center">
            <PixelCardContent className="p-4">
              <div className="flex flex-col items-center gap-2">
                <Type className="w-6 h-6 text-accent" />
                <div className="font-pixel text-lg">{stats.wordCount}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  Words
                </div>
              </div>
            </PixelCardContent>
          </PixelCard>

          <PixelCard className="text-center">
            <PixelCardContent className="p-4">
              <div className="flex flex-col items-center gap-2">
                <Clock className="w-6 h-6 text-muted-foreground" />
                <div className="font-pixel text-lg">{stats.contributors}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  Contributors
                </div>
              </div>
            </PixelCardContent>
          </PixelCard>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-4 flex-1">
            <PixelButton
              onClick={handleCopyText}
              disabled={isLoading}
              className="flex-1"
              variant="secondary"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Text
            </PixelButton>
            <PixelButton
              onClick={handleShare}
              disabled={isLoading}
              className="flex-1"
              variant="secondary"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </PixelButton>
          </div>
          <div className="flex gap-4 flex-1">
            <Link to={`/room/${teamId}`} className="flex-1">
              <PixelButton className="w-full">Return to Story Room</PixelButton>
            </Link>
            <Link to="/leaderboard" className="flex-1">
              <PixelButton variant="secondary" className="w-full">
                View Leaderboard
              </PixelButton>
            </Link>
          </div>
        </div>
      </div>
    </PageContent>
  );
}
