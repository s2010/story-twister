import { StoryMessage, Team } from "@/types/game";

// Simulated delay for realistic API feel
const delay = (ms: number = 1000) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Mock data storage
const stories: Record<string, StoryMessage[]> = {
  team_alpha: [
    {
      id: "1",
      text: "Once upon a time in a mystical forest, a brave knight discovered a glowing crystal...",
      sender: "user",
      author: "alice",
      timestamp: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: "2",
      text: "Suddenly, the crystal began to crack and emit a strange purple mist!",
      sender: "twist",
      author: "StoryBot",
      timestamp: new Date(Date.now() - 240000).toISOString(),
    },
    {
      id: "3",
      text: "The knight coughed and realized the mist was making him see illusions of his past...",
      sender: "user",
      author: "bob",
      timestamp: new Date(Date.now() - 180000).toISOString(),
    },
  ],
};

const teams: Team[] = [
  {
    id: "team_alpha",
    name: "Alpha Storytellers",
    storyLength: 3,
    lastTwist: "Purple mist illusions",
    score: {
      creativity: 8.5,
      twistIntegration: 9.0,
      coherence: 7.5,
      total: 25.0,
    },
  },
  {
    id: "team_beta",
    name: "Beta Legends",
    storyLength: 5,
    lastTwist: "Time loop paradox",
    score: {
      creativity: 9.0,
      twistIntegration: 8.0,
      coherence: 8.5,
      total: 25.5,
    },
  },
  {
    id: "team_gamma",
    name: "Gamma Warriors",
    storyLength: 2,
    lastTwist: "Dragon awakening",
    score: {
      creativity: 7.5,
      twistIntegration: 8.5,
      coherence: 9.0,
      total: 25.0,
    },
  },
];

export const mockApi = {
  async getStory(teamId: string): Promise<StoryMessage[]> {
    await delay();
    return stories[teamId] || [];
  },

  async addSentence(
    teamId: string,
    text: string,
    author: string,
  ): Promise<StoryMessage> {
    await delay();

    const newMessage: StoryMessage = {
      id: Date.now().toString(),
      text,
      sender: "user",
      author,
      timestamp: new Date().toISOString(),
    };

    if (!stories[teamId]) {
      stories[teamId] = [];
    }

    stories[teamId].push(newMessage);

    // Update team story length
    const team = teams.find((t) => t.id === teamId);
    if (team) {
      team.storyLength = stories[teamId].length;
    }

    return newMessage;
  },

  async addTwist(teamId: string): Promise<StoryMessage> {
    await delay();

    const twists = [
      "A portal opens and out steps a familiar face from someone's past...",
      "The ground begins to shake as an ancient beast awakens below...",
      "Time suddenly freezes for everyone except one person...",
      "A mysterious voice echoes from the sky with a cryptic warning...",
      "Reality starts to glitch like a broken video game...",
      "Someone discovers they have been dreaming this entire time...",
    ];

    const randomTwist = twists[Math.floor(Math.random() * twists.length)];

    const twistMessage: StoryMessage = {
      id: Date.now().toString(),
      text: randomTwist,
      sender: "twist",
      author: "StoryBot",
      timestamp: new Date().toISOString(),
    };

    if (!stories[teamId]) {
      stories[teamId] = [];
    }

    stories[teamId].push(twistMessage);

    // Update team info
    const team = teams.find((t) => t.id === teamId);
    if (team) {
      team.storyLength = stories[teamId].length;
      team.lastTwist = randomTwist.substring(0, 50) + "...";
    }

    return twistMessage;
  },

  async getTeams(): Promise<Team[]> {
    await delay();
    return teams;
  },

  async getLeaderboard(): Promise<Team[]> {
    await delay();
    return teams
      .filter((team) => team.score)
      .sort((a, b) => {
        const aScore =
          typeof a.score === "object" ? a.score.total : a.score || 0;
        const bScore =
          typeof b.score === "object" ? b.score.total : b.score || 0;
        return bScore - aScore;
      });
  },
};
