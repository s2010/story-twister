import { StoryMessage } from "@/types/game";
import { cn } from "@/lib/utils";
import { getUserColor, hexToHsl } from "@/utils/colorAssignment";

interface ChatBubbleProps {
  message: StoryMessage;
  isRtl?: boolean;
}

export function ChatBubble({ message, isRtl = false }: ChatBubbleProps) {
  const getBubbleStyle = () => {
    const baseClasses = "relative break-words chat-bubble-responsive";

    switch (message.sender) {
      case "twist":
        return {
          className: `${baseClasses} animate-fade-in`,
          style: {
            backgroundColor: "#FFF3CD", // Light yellow background
            color: "#000",
            border: "1px solid #FFC857",
            borderRadius: "12px",
            padding: "6px 8px",
            marginBottom: "6px",
          },
        };
      case "moderator":
        return {
          className: `${baseClasses}`,
          style: {
            backgroundColor: "#E8F4FD", // Light blue background
            color: "#000",
            border: "1px solid #5DBB63",
            borderRadius: "12px",
            padding: "6px 8px",
            marginBottom: "6px",
          },
        };
      default:
        if (message.author) {
          const userColor = getUserColor(message.author);
          return {
            className: `${baseClasses}`,
            style: {
              backgroundColor: userColor,
              color: "#000",
              border: "1px solid #ccc",
              borderRadius: "12px",
              padding: "6px 8px",
              marginBottom: "6px",
            },
          };
        }
        return {
          className: `${baseClasses}`,
          style: {
            backgroundColor: "#E3F2FD",
            color: "#000",
            border: "1px solid #ccc",
            borderRadius: "12px",
            padding: "6px 8px",
            marginBottom: "6px",
          },
        };
    }
  };

  const getAuthorPrefix = () => {
    if (message.sender === "twist") return "🤖 StoryTwister";
    if (message.sender === "moderator") return "🎭 Moderator";
    return message.author || "Unknown";
  };

  const getMessageIcon = () => {
    if (message.sender === "twist") return "⚡ ";
    return "";
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const bubbleStyle = getBubbleStyle();

  return (
    <div
      className={cn(
        "mb-2 max-w-[95%] sm:max-w-[85%]",
        isRtl ? "ml-auto" : "mr-auto",
      )}
      style={{ marginBottom: "6px" }}
      data-uid={message.author || message.sender}
      data-sender-type={message.sender}
    >
      {/* Username above bubble - Mobile optimized */}
      <div className="mb-1 px-1">
        <span
          className="font-bold chat-username-responsive"
          style={{ color: "#000", fontSize: "10px" }}
        >
          @{getAuthorPrefix()}
        </span>
        <span className="text-gray-500 ml-2 hidden sm:inline chat-timestamp-responsive">
          {formatTime(message.timestamp)}
        </span>
      </div>

      {/* Message bubble - Mobile optimized */}
      <div className={bubbleStyle.className} style={bubbleStyle.style}>
        <p
          className="leading-relaxed font-medium"
          style={{ color: "#000", fontSize: "10px" }}
        >
          {getMessageIcon()}
          {message.text}
        </p>
      </div>
    </div>
  );
}
