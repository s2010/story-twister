/**
 * API Client for Story Twister Frontend2
 * Handles Event Mode headers and localStorage integration safely
 */

// Get base URL from environment
const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:8001";

// Cache-busting parameter to force fresh requests
const CACHE_BUST = Date.now();

// API Client initialized

/**
 * Safely get value from localStorage without JSON.parse
 * Returns null if key doesn't exist or is empty
 */
function getStorageValue(key: string): string | null {
  try {
    const value = localStorage.getItem(key);
    return value && value.trim() !== "" ? value : null;
  } catch (error) {
    console.warn(`Failed to get ${key} from localStorage:`, error);
    return null;
  }
}

/**
 * Safely set value to localStorage
 */
function setStorageValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to set ${key} in localStorage:`, error);
  }
}

/**
 * Generate Event headers for API requests
 */
function getEventHeaders(): Record<string, string> {
  const nickname = getStorageValue("nickname") || "Anonymous";
  const teamCode = getStorageValue("teamCode") || "DEFAULT";
  const eventSession = new Date().toISOString();

  return {
    "Content-Type": "application/json",
    "X-Event-Mode": "true",
    "X-Nickname": nickname,
    "X-Team-Code": teamCode,
    "X-Event-Session": eventSession,
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };
}

/**
 * Generic API request function
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const base = `${API_BASE_URL}${endpoint}`;
  const sep = base.includes("?") ? "&" : "?";
  const url = `${base}${sep}_cb=${CACHE_BUST}&_t=${Date.now()}`;

  const headers = {
    ...getEventHeaders(),
    "Content-Type": "application/json",
    ...(options.headers || {}),
  } as Record<string, string>;

  const config: RequestInit = {
    method: "GET",
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ API Error for ${endpoint}:`, error);
    throw error;
  }
}

// API Client object with all endpoints
export const apiClient = {
  // Health check
  health: () => apiRequest<{ status: string }>("/health"),

  // Session management
  sessions: {
    join: () =>
      apiRequest<{
        team: any;
        session: any;
        members_count: number;
      }>("/api/v1/sessions/join", {
        method: "POST",
        body: JSON.stringify({}),
      }),

    complete: (sessionId: string) =>
      apiRequest<{ message: string; ended_at: string }>(
        `/api/v1/sessions/${sessionId}/complete`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      ),
  },

  // Story management
  stories: {
    async list(teamCode: string, status?: string) {
      const params = new URLSearchParams({
        team_code: teamCode,
        ...(status && { status }),
      });
      return apiRequest(`/api/v1/stories?${params}`);
    },

    create: (teamId: string, title: string, initialPrompt: string) =>
      apiRequest<any>("/api/v1/stories", {
        method: "POST",
        body: JSON.stringify({
          team_id: teamId,
          title,
          initial_prompt: initialPrompt,
        }),
      }),

    getTurns: (storyId: string) =>
      apiRequest<any[]>(`/api/v1/stories/${storyId}/turns`),

    addSentence: (storyId: string, content: string) =>
      apiRequest<{ message: string; turn_number: number }>(
        "/api/v1/stories/add-sentence",
        {
          method: "POST",
          body: JSON.stringify({
            story_id: storyId,
            content: content,
          }),
        },
      ),

    addTwist: (storyId: string) =>
      apiRequest<{ message: string; turn_number: number; content: string }>(
        "/api/v1/stories/twist",
        {
          method: "POST",
          body: JSON.stringify({
            story_id: storyId,
          }),
        },
      ),

    getStatus: (storyId: string) =>
      apiRequest<{
        id: string;
        status: string;
        current_turn: number;
        total_turns: number;
      }>(`/api/v1/stories/${storyId}/status`),

    getAnalysis: (storyId: string) =>
      apiRequest<{
        creativity_score: number;
        engagement_score: number;
        collaboration_score: number;
        creativity_feedback: string;
        engagement_feedback: string;
        collaboration_feedback: string;
        total_turns: number;
        unique_participants: number;
        session_duration_minutes: number;
      }>(`/api/v1/stories/${storyId}/analysis`),
  },

  // Leaderboard
  leaderboard: {
    getTeams: () => apiRequest<any[]>("/api/v1/leaderboard/teams"),
  },

  // Legacy methods for backward compatibility with existing components
  getStory: (teamId: string) => {
    // Map to new API structure - get stories for team
    return apiClient.stories.list(teamId);
  },

  getTeams: () => {
    // Map to leaderboard teams
    return apiClient.leaderboard.getTeams();
  },

  addSentence: (teamId: string, text: string, author: string) => {
    // For legacy compatibility - would need story ID in real implementation
    // This is a simplified mapping
    console.warn(
      "Legacy addSentence called - needs story ID for proper implementation",
    );
    return Promise.resolve({
      id: Date.now().toString(),
      text,
      author,
      timestamp: new Date().toISOString(),
      type: "user" as const,
    });
  },

  addTwist: (teamId: string) => {
    // For legacy compatibility - would need story ID in real implementation
    console.warn(
      "Legacy addTwist called - needs story ID for proper implementation",
    );
    return Promise.resolve({
      id: Date.now().toString(),
      text: "AI Twist added!",
      author: "StoryBot",
      timestamp: new Date().toISOString(),
      type: "twist" as const,
    });
  },

  // Admin API methods
  admin: {
    getDashboard: () => {
      const token = localStorage.getItem("adminToken");
      if (!token) throw new Error("Admin token not found");
      return apiRequest("/api/v1/admin/dashboard", {
        method: "GET",
        headers: {
          "X-Admin-Token": token,
        },
      });
    },

    getLiveView: (sessionId: string) => {
      const token = localStorage.getItem("adminToken");
      if (!token) throw new Error("Admin token not found");
      return apiRequest(`/api/v1/admin/live/${sessionId}`, {
        method: "GET",
        headers: {
          "X-Admin-Token": token,
        },
      });
    },

    getAnalysisList: () => {
      const token = localStorage.getItem("adminToken");
      if (!token) throw new Error("Admin token not found");
      return apiRequest("/api/v1/admin/analysis", {
        method: "GET",
        headers: {
          "X-Admin-Token": token,
        },
      });
    },

    getSessionAnalysis: (sessionId: string) => {
      const token = localStorage.getItem("adminToken");
      if (!token) throw new Error("Admin token not found");
      return apiRequest(`/api/v1/admin/analysis/${sessionId}`, {
        method: "GET",
        headers: {
          "X-Admin-Token": token,
        },
      });
    },

    createSession: (teamCode: string, teamName?: string) => {
      const token = localStorage.getItem("adminToken");
      if (!token) throw new Error("Admin token not found");
      return apiRequest("/api/v1/admin/sessions", {
        method: "POST",
        headers: {
          "X-Admin-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          team_code: teamCode,
          team_name: teamName,
          duration_minutes: 10,
        }),
      });
    },

    async deleteSession(sessionId: string): Promise<void> {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("Admin token not found");
      }

      await apiRequest(`/api/v1/admin/sessions/${sessionId}`, {
        method: "DELETE",
        headers: {
          "X-Admin-Token": token,
        },
      });
    },

    async startSession(sessionId: string): Promise<void> {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("Admin token not found");
      }

      await apiRequest(`/api/v1/admin/sessions/${sessionId}/start`, {
        method: "POST",
        headers: {
          "X-Admin-Token": token,
        },
      });
    },

    getSnapshot: () => {
      const token = localStorage.getItem("adminToken");
      if (!token) throw new Error("Admin token not found");
      return apiRequest("/api/v1/admin/snapshot", {
        method: "GET",
        headers: {
          "X-Admin-Token": token,
        },
      });
    },

    createRoom: (teamCode: string, teamName: string) => {
      const token = localStorage.getItem("adminToken");
      if (!token) throw new Error("Admin token not found");
      return apiRequest("/api/v1/admin/rooms", {
        method: "POST",
        headers: {
          "X-Admin-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ team_code: teamCode, team_name: teamName }),
      });
    },

    logout: () => {
      // Clear admin token from localStorage
      localStorage.removeItem("adminToken");
      // Return success for consistency
      return Promise.resolve({
        status: "success",
        message: "Logged out successfully",
      });
    },
  },
};

// Storage utilities
export const storage = {
  getNickname: () => getStorageValue("nickname"),
  setNickname: (nickname: string) => setStorageValue("nickname", nickname),

  getTeamCode: () => getStorageValue("teamCode"),
  setTeamCode: (teamCode: string) => setStorageValue("teamCode", teamCode),

  clear: () => {
    try {
      localStorage.removeItem("nickname");
      localStorage.removeItem("teamCode");
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }
  },
};
