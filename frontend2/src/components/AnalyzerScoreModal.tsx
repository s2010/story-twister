import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp, MessageSquare, Zap, Target } from "lucide-react";

interface AnalyzerScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageCount: number;
}

interface AnalysisScore {
  creativity: number;
  engagement: number;
  collaboration: number;
  overall: number;
}

export function AnalyzerScoreModal({
  isOpen,
  onClose,
  messageCount,
}: AnalyzerScoreModalProps) {
  const [score, setScore] = useState<AnalysisScore | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (isOpen && !score) {
      setIsCalculating(true);

      // Simulate score calculation
      setTimeout(() => {
        const baseScore = Math.max(
          0,
          Math.min(100, 60 + messageCount * 2 + Math.floor(Math.random() * 20)),
        );

        setScore({
          creativity: Math.max(
            0,
            Math.min(100, baseScore + Math.floor(Math.random() * 20) - 10),
          ),
          engagement: Math.max(
            0,
            Math.min(100, baseScore + Math.floor(Math.random() * 15) - 7),
          ),
          collaboration: Math.max(
            0,
            Math.min(100, baseScore + Math.floor(Math.random() * 25) - 12),
          ),
          overall: baseScore,
        });
        setIsCalculating(false);
      }, 2000);
    }
  }, [isOpen, messageCount, score]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-orange-500";
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    return "D";
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-1">
          <DialogTitle className="text-lg font-bold">
            🎯 Session Complete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {isCalculating ? (
            <div className="text-center space-y-4">
              <div className="animate-spin mx-auto w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
              <p className="text-sm text-muted-foreground">
                Analyzing your creative contribution...
              </p>
            </div>
          ) : score ? (
            <>
              {/* Overall Score */}
              <div className="text-center space-y-1">
                <div
                  className={`text-3xl font-bold ${getScoreColor(score.overall)}`}
                >
                  {score.overall}
                </div>
                <div className="text-xs text-muted-foreground">
                  Overall Grade:{" "}
                  <span className="font-bold">
                    {getScoreGrade(score.overall)}
                  </span>
                </div>
              </div>

              {/* Detailed Scores */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-yellow-500" />
                    <span className="text-xs font-medium">Creativity</span>
                  </div>
                  <span
                    className={`font-bold text-sm ${getScoreColor(score.creativity)}`}
                  >
                    {score.creativity}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-blue-500" />
                    <span className="text-xs font-medium">Engagement</span>
                  </div>
                  <span
                    className={`font-bold text-sm ${getScoreColor(score.engagement)}`}
                  >
                    {score.engagement}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-green-500" />
                    <span className="text-xs font-medium">Collaboration</span>
                  </div>
                  <span
                    className={`font-bold text-sm ${getScoreColor(score.collaboration)}`}
                  >
                    {score.collaboration}
                  </span>
                </div>
              </div>

              {/* Session Stats */}
              <div className="bg-muted/30 rounded-lg p-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    Messages Contributed
                  </span>
                  <span className="font-medium">{messageCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Session Duration</span>
                  <span className="font-medium">10:00</span>
                </div>
              </div>
            </>
          ) : null}

          <Button
            onClick={onClose}
            className="w-full min-h-[44px] text-sm font-medium"
            disabled={isCalculating}
          >
            {isCalculating ? "Calculating..." : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
