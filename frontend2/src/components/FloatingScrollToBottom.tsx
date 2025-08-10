import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingScrollToBottomProps {
  messagesContainer: HTMLElement | null;
  isVisible: boolean;
  onScrollToBottom: () => void;
}

export function FloatingScrollToBottom({
  messagesContainer,
  isVisible,
  onScrollToBottom,
}: FloatingScrollToBottomProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!messagesContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShow(!isNearBottom && isVisible);
    };

    messagesContainer.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial state

    return () => messagesContainer.removeEventListener("scroll", handleScroll);
  }, [messagesContainer, isVisible]);

  if (!show) return null;

  return (
    <button
      onClick={onScrollToBottom}
      className={cn(
        "fixed bottom-20 right-3 z-50",
        "pixel-button bg-primary text-primary-foreground",
        "shadow-lg hover:opacity-80 active:scale-95 transition-all duration-200",
        "flex items-center gap-1 text-xs font-bold",
        "min-h-[44px] min-w-[44px] px-2 animate-bounce",
      )}
      aria-label="Scroll to new messages"
    >
      <span className="hidden sm:inline text-xs">New</span>
      <ChevronDown size={16} />
    </button>
  );
}
