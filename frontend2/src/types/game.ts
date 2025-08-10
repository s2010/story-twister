export type StoryMessage = {
  id: string;
  text: string;
  sender: "user" | "twist" | "moderator" | "system";
  type: "user" | "twist" | "moderator" | "system";
  author?: string;
  timestamp: string;
  systemType?: "info" | "success" | "warning" | "error";
};

export type Team = {
  id: string;
  name: string;
  storyLength: number;
  lastTwist?: string;
  memberCount?: number;
  creativityScore?: number;
  twistUsage?: number;
  score?:
    | {
        creativity: number;
        twistIntegration: number;
        coherence: number;
        total: number;
      }
    | number;
  sessionStatus?: "active" | "completed";
  sessionEndedAt?: string;
};

export type User = {
  username: string;
  teamId: string;
};
