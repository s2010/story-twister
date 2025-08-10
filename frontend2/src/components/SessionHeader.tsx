import { Clock, Users } from "lucide-react";

interface SessionHeaderProps {
  teamName: string;
  storyLength: number;
  formattedTime: string;
  isExpired: boolean;
}

export function SessionHeader({
  teamName,
  storyLength,
  formattedTime,
  isExpired,
}: SessionHeaderProps) {
  return (
    <div className="sticky top-[60px] z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between py-2 px-4">
        <div className="flex items-center gap-3">
          <Users size={16} className="text-primary" />
          <span className="font-pixel text-sm font-bold text-foreground">
            {teamName}
          </span>
          <span className="text-xs text-muted-foreground">
            • {storyLength} messages
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 text-xs font-mono ${
              isExpired ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            <Clock size={12} />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
