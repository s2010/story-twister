import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Clock,
  Play,
  Trash2,
  Plus,
  RefreshCw,
  BarChart3,
  CheckCircle,
  PlayCircle,
  Eye,
  LogOut,
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

interface ActiveSession {
  id: string;
  team_code: string;
  team_name: string;
  participants: number;
  status: "active" | "waiting" | "in_progress";
  time_remaining: string;
  total_turns: number;
  twist_count: number;
  started_at: string;
}

export default function AdminDashboard() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [newTeamCode, setNewTeamCode] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );
  const [startingSessionId, setStartingSessionId] = useState<string | null>(
    null,
  );
  const { toast } = useToast();

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.admin.getDashboard();
      console.log("📊 Admin Dashboard data loaded:", response);

      setSessions(response.active_sessions || []);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      toast({
        title: "Error Loading Dashboard",
        description: "Could not load dashboard data. Please try again.",
        variant: "destructive",
      });
      // Fallback to empty data on error
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleCreateSession = async () => {
    if (!newTeamCode.trim()) {
      toast({
        title: "Validation Error",
        description: "Team code is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      const response = await apiClient.admin.createSession(
        newTeamCode.trim(),
        newTeamName.trim() || undefined,
      );

      console.log("✅ Session created:", response);

      toast({
        title: "Session Created",
        description: `Successfully created session for team "${newTeamCode}"`,
        variant: "default",
      });

      // Reset form and close modal
      setNewTeamCode("");
      setNewTeamName("");
      setShowCreateModal(false);

      // Refresh dashboard data
      loadDashboardData();
    } catch (error: any) {
      console.error("❌ Failed to create session:", error);
      toast({
        title: "Failed to Create Session",
        description:
          error.message || "Could not create session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setShowDeleteModal(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    setDeletingSessionId(sessionToDelete);
    try {
      await apiClient.admin.deleteSession(sessionToDelete);
      toast({
        title: "Session Deleted",
        description:
          "Session and all related data have been removed successfully.",
      });

      // Remove the session from local state immediately to avoid rate limiting
      setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete));

      // Delay refresh to avoid rate limiting
      setTimeout(() => {
        loadDashboardData();
      }, 1000);
    } catch (error) {
      console.error("Failed to delete session:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Delete Failed",
        description: `Failed to delete session: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setDeletingSessionId(null);
      setSessionToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const cancelDeleteSession = () => {
    setSessionToDelete(null);
    setShowDeleteModal(false);
  };

  const handleStartSession = async (sessionId: string) => {
    setStartingSessionId(sessionId);
    try {
      await apiClient.admin.startSession(sessionId);
      toast({
        title: "Session Started",
        description: "Session is now active and users can join.",
      });
      await loadDashboardData(); // Refresh the list
    } catch (error) {
      console.error("Failed to start session:", error);
      toast({
        title: "Start Failed",
        description: "Failed to start session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setStartingSessionId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.admin.logout();
      toast({
        title: "Logged Out",
        description: "Successfully logged out of admin console.",
      });
      // Redirect to login page
      window.location.href = "/admin/login";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout API fails, clear token and redirect
      localStorage.removeItem("adminToken");
      window.location.href = "/admin/login";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "text-yellow-600";
      case "active":
        return "text-green-600";
      case "completed":
        return "text-gray-500";
      default:
        return "text-yellow-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "waiting":
        return <Clock className="w-4 h-4" />;
      case "active":
        return <Play className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <PageContent className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-between items-center mb-4">
          <div></div>
          <h1 className="text-4xl font-bold text-gray-800 pixel-font">
            Admin Dashboard
          </h1>
          <PixelButton
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2 text-red-600 border-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </PixelButton>
        </div>
        <p className="text-gray-600 pixel-font">
          Monitor active storytelling sessions and team activity
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <PixelCard>
          <PixelCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-pixel text-lg">{sessions.length}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  Active Sessions
                </div>
              </div>
            </div>
          </PixelCardContent>
        </PixelCard>

        <PixelCard>
          <PixelCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded">
                <Play className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="font-pixel text-lg">
                  {sessions.filter((s) => s.status === "active").length}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  In Progress
                </div>
              </div>
            </div>
          </PixelCardContent>
        </PixelCard>

        <PixelCard>
          <PixelCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="font-pixel text-lg">
                  {sessions.filter((s) => s.status === "waiting").length}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  Waiting
                </div>
              </div>
            </div>
          </PixelCardContent>
        </PixelCard>
      </div>

      {/* Session Management */}
      <div className="mb-6">
        <PixelButton
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Session
        </PixelButton>
      </div>

      {/* Sessions List */}
      <PixelCard>
        <PixelCardHeader>
          <div className="flex justify-between items-center">
            <PixelCardTitle>Active Sessions</PixelCardTitle>
            <PixelButton
              variant="outline"
              size="sm"
              onClick={loadDashboardData}
              disabled={isLoading}
            >
              Refresh
            </PixelButton>
          </div>
        </PixelCardHeader>
        <PixelCardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="font-mono text-sm text-muted-foreground">
                Loading sessions...
              </div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="font-mono text-sm text-muted-foreground">
                No active sessions
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex items-center gap-2 ${getStatusColor(session.status)}`}
                      >
                        {getStatusIcon(session.status)}
                        <span className="font-mono text-xs uppercase font-bold">
                          {session.status}
                        </span>
                      </div>

                      <div>
                        <div className="font-pixel text-sm">
                          {session.team_name}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          Code: {session.team_code.toUpperCase()} •{" "}
                          {session.participants} participants
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-pixel text-sm">
                          {session.time_remaining}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          remaining
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono text-xs text-muted-foreground">
                          {session.total_turns} turns • {session.twist_count}{" "}
                          twists
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {session.status === "waiting" ? (
                          <PixelButton
                            size="sm"
                            variant="default"
                            onClick={() => handleStartSession(session.id)}
                            disabled={startingSessionId === session.id}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            {startingSessionId === session.id ? (
                              <div className="w-4 h-4 animate-spin border-2 border-green-600 border-t-transparent rounded-full" />
                            ) : (
                              <>
                                <PlayCircle className="w-4 h-4 mr-1" />
                                Start
                              </>
                            )}
                          </PixelButton>
                        ) : (
                          <Link to={`/admin/live/${session.id}`}>
                            <PixelButton size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              Live View
                            </PixelButton>
                          </Link>
                        )}

                        <PixelButton
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSession(session.id)}
                          disabled={deletingSessionId === session.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingSessionId === session.id ? (
                            <div className="w-4 h-4 animate-spin border-2 border-red-600 border-t-transparent rounded-full" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </PixelButton>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelCardContent>
      </PixelCard>

      {/* Navigation */}
      <div className="mt-8 flex gap-4 justify-center">
        <Link to="/admin/analysis">
          <PixelButton variant="outline">View Analysis Reports</PixelButton>
        </Link>
        <Link to="/leaderboard">
          <PixelButton variant="outline">Public Leaderboard</PixelButton>
        </Link>
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <Plus className="w-5 h-5 text-primary" />
              <h2 className="font-pixel text-lg">Create New Session</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-sm font-medium mb-2">
                  Team Code *
                </label>
                <input
                  type="text"
                  value={newTeamCode}
                  onChange={(e) => setNewTeamCode(e.target.value.toUpperCase())}
                  placeholder="Enter team code (e.g., ALPHA)"
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isCreating}
                />
              </div>

              <div>
                <label className="block font-mono text-sm font-medium mb-2">
                  Team Name (Optional)
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter team name (e.g., Team Alpha)"
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isCreating}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <PixelButton
                onClick={handleCreateSession}
                disabled={isCreating || !newTeamCode.trim()}
                className="flex-1"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Session
                  </>
                )}
              </PixelButton>

              <PixelButton
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTeamCode("");
                  setNewTeamName("");
                }}
                disabled={isCreating}
                className="flex-1"
              >
                Cancel
              </PixelButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Session Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-5 h-5 text-red-600" />
              <h2 className="font-pixel text-lg text-red-600">
                Delete Session
              </h2>
            </div>

            <p className="font-mono text-sm text-gray-600 mb-6">
              Are you sure you want to delete this session? This action cannot
              be undone and will remove all related data including stories,
              turns, and team information.
            </p>

            <div className="flex gap-3">
              <PixelButton
                onClick={confirmDeleteSession}
                disabled={deletingSessionId === sessionToDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deletingSessionId === sessionToDelete ? (
                  <>
                    <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Session
                  </>
                )}
              </PixelButton>

              <PixelButton
                variant="outline"
                onClick={cancelDeleteSession}
                disabled={deletingSessionId === sessionToDelete}
                className="flex-1"
              >
                Cancel
              </PixelButton>
            </div>
          </div>
        </div>
      )}
    </PageContent>
  );
}
