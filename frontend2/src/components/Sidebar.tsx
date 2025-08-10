import { Team } from "@/types/game";
import { Clock, MessageSquare, Zap } from "lucide-react";

interface SidebarProps {
  team?: Team;
  isVisible: boolean;
  isRtl?: boolean;
}

export function Sidebar({ team, isVisible, isRtl }: SidebarProps) {
  if (!isVisible || !team) return null;

  return (
    <aside
      className={`
      w-64 pixel-panel p-4 space-y-4 
      ${isRtl ? "order-first" : "order-last"}
      hidden lg:block
    `}
    >
      <div className="font-pixel text-sm">
        <h3 className="text-primary mb-3 font-bold">Team Info</h3>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Story Length</div>
              <div className="font-bold">{team.storyLength} sentences</div>
            </div>
          </div>

          {team.lastTwist && (
            <div className="flex items-start gap-2">
              <Zap size={16} className="text-accent mt-1" />
              <div>
                <div className="text-xs text-muted-foreground">Last Twist</div>
                <div className="text-xs leading-relaxed">{team.lastTwist}</div>
              </div>
            </div>
          )}

          {team.score && typeof team.score === "object" && (
            <div className="flex items-start gap-2">
              <Clock size={16} className="text-secondary mt-1" />
              <div>
                <div className="text-xs text-muted-foreground">Score</div>
                <div className="space-y-1 text-xs">
                  <div>Creativity: {team.score.creativity}/10</div>
                  <div>Twists: {team.score.twistIntegration}/10</div>
                  <div>Flow: {team.score.coherence}/10</div>
                  <div className="font-bold text-primary">
                    Total: {team.score.total}/30
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          💡 Tip: Build on previous sentences and incorporate AI twists for
          better scores!
        </div>
      </div>
    </aside>
  );
}
