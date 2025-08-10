import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ChatBubble } from "@/components/ChatBubble";
import { SystemMessage } from "@/components/SystemMessage";
import { FloatingScrollToBottom } from "@/components/FloatingScrollToBottom";

import { TimerDisplay } from "@/components/TimerDisplay";
import { AnalyzerScoreModal } from "@/components/AnalyzerScoreModal";
import { ExitSessionModal } from "@/components/ExitSessionModal";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePoll } from "@/hooks/usePoll";
import { useTimer } from "@/hooks/useTimer";
import { useKeyboardSafeArea } from "@/hooks/useKeyboardSafeArea";
import { apiClient, storage } from "@/api/client";
import { StoryMessage, Team } from "@/types/game";
import { Send, Zap, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function StoryRoom() {
  const { teamId } = useParams<{ teamId: string }>();
  const [searchParams] = useSearchParams();
  const isModerator = searchParams.get("mod") === "true";

  const [messages, setMessages] = useState<StoryMessage[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [currentStory, setCurrentStory] = useState<any>(null);
  const [currentSentence, setCurrentSentence] = useState("");
  const [username] = useLocalStorage("nickname", "");
  const [isRtl, setIsRtl] = useLocalStorage("isRtl", false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStory, setIsLoadingStory] = useState(true);
  const [showAnalyzerModal, setShowAnalyzerModal] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<"active" | "completed">(
    "active",
  );
  const [sessionEndedAt, setSessionEndedAt] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardSafeArea();

  // 10-minute timer for the session
  const timer = useTimer({
    duration: 10 * 60, // 10 minutes in seconds
    onExpire: () => {
      setShowAnalyzerModal(true);
    },
  });

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Helper function to add system messages to chat
  const addSystemMessage = (
    text: string,
    type: "info" | "success" | "warning" | "error" = "info",
  ) => {
    const systemMessage: StoryMessage = {
      id: `system-${Date.now()}`,
      text,
      sender: "system",
      type: "system",
      timestamp: new Date().toISOString(),
      systemType: type,
    };

    setMessages((prev) => [...prev, systemMessage]);
    // Enhanced auto-scroll for system messages
    setTimeout(() => {
      scrollToBottom();
      // Ensure scroll happens even on mobile
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    }, 150);
  };

  // Enhanced scroll to bottom for floating button
  const handleScrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Auto-scroll on new messages
    if (messages.length > lastMessageCount) {
      scrollToBottom();
      setLastMessageCount(messages.length);
    }
  }, [messages, lastMessageCount]);

  // Load initial data
  const loadStory = async () => {
    if (!teamId) return;

    try {
      setIsLoadingStory(true);

      // Check session status from leaderboard data
      try {
        const leaderboardData = await apiClient.leaderboard.getTeams();
        const currentTeam = leaderboardData.teams?.find(
          (team: any) => team.team_code === teamId,
        );
        if (currentTeam) {
          setSessionStatus(currentTeam.session_status || "active");
          setSessionEndedAt(currentTeam.session_ended_at);

          if (currentTeam.session_status === "completed") {
            addSystemMessage(
              "⏸️ This session has ended. Chat is disabled.",
              "warning",
            );
          }
        }
      } catch (error) {
        console.warn("Could not check session status:", error);
      }

      // Get stories for this team
      const stories = await apiClient.stories.list(teamId, "active");

      if (stories.length > 0) {
        const activeStory = stories[0]; // Get the active story
        setCurrentStory(activeStory);

        // Get story turns (messages)
        const turns = await apiClient.stories.getTurns(activeStory.id);

        // Convert backend turns to frontend message format
        const convertedMessages: StoryMessage[] = turns.map((turn: any) => {
          // Backend uses 'is_twist' field instead of 'turn_type'
          const isAITwist =
            turn.is_twist === true || turn.turn_type === "twist";
          return {
            id: turn.id.toString(),
            text: turn.content || turn.text || "",
            author: isAITwist
              ? "StoryTwister"
              : turn.author_name ||
                turn.author ||
                turn.nickname ||
                turn.user_nickname ||
                "Unknown",
            timestamp:
              turn.created_at || turn.timestamp || new Date().toISOString(),
            type: isAITwist ? "twist" : "user",
            sender: isAITwist ? "twist" : "user",
          };
        });

        setMessages(convertedMessages);

        // Add welcome system message if this is the first load
        if (convertedMessages.length === 1) {
          setTimeout(() => {
            addSystemMessage(
              "🎭 Welcome to the story! Start collaborating by adding your sentences.",
              "info",
            );
          }, 1000);
        }

        // Set team data
        setTeam({
          id: teamId,
          name: teamId.replace("_", " ").toUpperCase(),
          storyLength: convertedMessages.length,
          lastTwist:
            convertedMessages
              .filter((m) => m.type === "twist")
              .pop()
              ?.text.substring(0, 50) + "..." || "No twists yet",
        });
      } else {
        // No active story found - create one

        const newStory = await apiClient.stories.create(
          teamId,
          `${teamId.replace("_", " ").toUpperCase()} Story`,
          "Once upon a time...",
        );

        setCurrentStory(newStory);

        // Initialize with empty messages
        setMessages([]);
        setTeam({
          id: teamId,
          name: teamId.replace("_", " ").toUpperCase(),
          storyLength: 0,
          lastTwist: "Story just started",
        });
      }
    } catch (error) {
      console.error("Failed to load story:", error);
      addSystemMessage(
        "❌ Failed to load story. Please refresh the page.",
        "error",
      );

      // Fallback: set basic team data
      setTeam({
        id: teamId,
        name: teamId.replace("_", " ").toUpperCase(),
        storyLength: 0,
        lastTwist: "Connection error",
      });
      setMessages([]);
    } finally {
      setIsLoadingStory(false);
    }
  };

  useEffect(() => {
    loadStory();
  }, [teamId]);

  // Poll for updates
  usePoll(loadStory, { interval: 5000, enabled: !!teamId });

  const handleSendSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSentence.trim() || !currentStory || !currentStory.id) {
      console.error("Cannot send message: missing sentence, story, or story ID", {
        hasSentence: !!currentSentence.trim(),
        hasStory: !!currentStory,
        storyId: currentStory?.id,
      });
      addSystemMessage("❌ Cannot send message: story not ready", "error");
      return;
    }

    const trimmedMessage = currentSentence.trim();
    const nickname = localStorage.getItem("nickname") || "Anonymous";

    setIsLoading(true);

    // Optimistic UI update - add message immediately
    const optimisticMessage: StoryMessage = {
      id: `temp-${Date.now()}`,
      text: trimmedMessage,
      author: nickname,
      timestamp: new Date().toISOString(),
      type: "user",
      sender: "user",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setCurrentSentence("");
    // Enhanced auto-scroll for new messages
    setTimeout(() => {
      scrollToBottom();
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    }, 100);

    try {
      // Send the sentence
      await apiClient.stories.addSentence(currentStory.id, trimmedMessage);

      // Refresh to get the real message from backend (replaces optimistic one)
      await loadStory();

      // Add system message for successful send
      addSystemMessage("✅ Message added to the story!", "success");

      // Force scroll to bottom after refresh
      setTimeout(scrollToBottom, 200);
    } catch (error) {
      console.error("❌ Send message error:", error);

      // Always refresh the story to check if the message was actually added
      // (backend sometimes returns 400 but still processes the message)
      await loadStory();

      // Check if the message was actually added by looking for it in the refreshed messages
      // Wait a bit for the state to update
      setTimeout(() => {
        const messageWasAdded = messages.some(
          (msg) => msg.text === trimmedMessage && msg.author === nickname,
        );

        if (messageWasAdded) {
          // Message was actually added successfully, treat as success

          addSystemMessage("✅ Message added to the story!", "success");
          setTimeout(scrollToBottom, 200);
        } else {
          // Message was not added, show error
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== optimisticMessage.id),
          );
          setCurrentSentence(trimmedMessage); // Restore message

          addSystemMessage(
            "❌ Failed to send message. Please try again.",
            "error",
          );
        }
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInjectTwist = async () => {
    if (!teamId || isLoading || !currentStory) return;

    setIsLoading(true);
    try {
      // Use the proper backend API with story ID
      const result = await apiClient.stories.addTwist(currentStory.id);

      addSystemMessage("🌪️ AI twist added to the story!", "success");
      // Refresh immediately after adding twist
      await loadStory();
      // Force scroll to bottom after twist injected
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Failed to inject twist:", error);
      addSystemMessage("❌ Failed to inject twist. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportStory = () => {
    const storyText = messages
      .map(
        (m) =>
          `[${m.sender.toUpperCase()}] ${m.author ? `@${m.author}` : ""}: ${m.text}`,
      )
      .join("\n\n");

    const blob = new Blob([storyText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${teamId}_story_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addSystemMessage("📄 Story exported successfully!", "success");
  };

  if (!teamId)
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="pixel-panel p-6 text-center">
          <h2 className="font-pixel text-lg mb-2">Team not found</h2>
          <p className="text-muted-foreground">
            Please check the URL and try again.
          </p>
        </div>
      </div>
    );

  // Count user messages for analyzer
  const userMessageCount = messages.filter((m) => m.author === username).length;

  return (
    <div
      className="w-full bg-background flex flex-col h-full"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Exit Session Modal */}
      <ExitSessionModal teamId={teamId} />

      {/* Timer Display with Exit Button */}
      <TimerDisplay
        formattedTime={timer.formattedTime}
        isExpired={timer.isExpired}
        teamId={teamId}
        sessionStatus={sessionStatus}
        sessionEndedAt={sessionEndedAt}
      />

      {/* Analyzer Score Modal */}
      <AnalyzerScoreModal
        isOpen={showAnalyzerModal}
        onClose={() => setShowAnalyzerModal(false)}
        messageCount={userMessageCount}
      />

      {/* Main Chat Area - Scrollable */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 chat-container"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollBehavior: "smooth",
          overscrollBehaviorY: "contain",
        }}
      >
        <div className="space-y-2 py-2">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground font-mono py-8">
              <div className="pixel-panel p-4 inline-block">
                <p className="text-sm sm:text-base font-bold mb-2">
                  📖 Empty Story Canvas
                </p>
                <p className="text-xs sm:text-sm">
                  Be the first to start this adventure!
                </p>
                <p className="text-xs opacity-75 mt-1">
                  Type a sentence below to begin...
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) =>
              message.type === "system" ? (
                <SystemMessage
                  key={message.id}
                  message={message.text}
                  type={message.systemType}
                  timestamp={message.timestamp}
                />
              ) : (
                <ChatBubble key={message.id} message={message} isRtl={isRtl} />
              ),
            )
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Scroll Button */}
      <FloatingScrollToBottom
        messagesContainer={messagesContainerRef.current}
        isVisible={messages.length > 0}
        onScrollToBottom={handleScrollToBottom}
      />

      {/* Input Area - Fixed positioning for keyboard handling */}
      <div className="input-bar">
        {isModerator ? (
          <div className="space-y-2">
            <div className="flex gap-4 button-gap">
              <button
                onClick={handleInjectTwist}
                disabled={isLoading}
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-md transition-all touch-button"
                style={{ minHeight: "44px" }}
              >
                <Zap size={16} />
                <span className="text-sm font-bold">
                  {isLoading ? "Injecting..." : "Twist"}
                </span>
              </button>
              <button
                onClick={handleExportStory}
                disabled={isLoading}
                className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-md transition-all touch-button"
                style={{ minHeight: "44px" }}
              >
                <Download size={16} />
                <span className="text-sm font-bold">Export</span>
              </button>
            </div>
            <p
              className="text-xs text-center text-muted-foreground"
              style={{ fontSize: "10px" }}
            >
              🎭 Moderator Controls
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <form onSubmit={handleSendSentence} className="flex gap-2">
              <input
                type="text"
                value={currentSentence}
                onChange={(e) => setCurrentSentence(e.target.value)}
                placeholder={
                  sessionStatus === "completed"
                    ? "Session ended - chat disabled"
                    : timer.isExpired
                      ? "Session expired"
                      : "Add to the story..."
                }
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-black"
                maxLength={200}
                disabled={
                  !currentStory ||
                  timer.isExpired ||
                  sessionStatus === "completed"
                }
              />
              <button
                type="submit"
                disabled={
                  !currentSentence.trim() ||
                  !currentStory ||
                  isLoading ||
                  timer.isExpired ||
                  sessionStatus === "completed"
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 px-4 rounded-md transition-all touch-button"
                style={{ minHeight: "44px", minWidth: "60px" }}
              >
                <Send size={18} />
                <span className="hidden sm:inline text-sm font-medium">
                  {isLoading ? "Sending..." : "Send"}
                </span>
              </button>

              {isModerator && (
                <button
                  type="button"
                  onClick={handleInjectTwist}
                  disabled={!currentStory || timer.isExpired}
                  className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 px-4 rounded-md transition-all touch-button"
                  style={{ minHeight: "44px", minWidth: "60px" }}
                >
                  <Zap size={18} />
                  <span className="hidden sm:inline text-sm font-medium">
                    Twist
                  </span>
                </button>
              )}
            </form>
            <div
              className="flex justify-between items-center"
              style={{ fontSize: "10px", color: "#000" }}
            >
              <span>{currentSentence.length}/200</span>
              <span className="hidden sm:inline">Enter to send</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
