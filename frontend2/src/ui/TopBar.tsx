import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TopBarProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children?: React.ReactNode;
  sticky?: boolean;
  showNavigation?: boolean;
}

const TopBar = React.forwardRef<HTMLDivElement, TopBarProps>(
  (
    {
      className,
      title,
      children,
      sticky = true,
      showNavigation = true,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base top bar styles
          "bg-card text-card-foreground",
          "border-b-2 border-black",
          "px-3 sm:px-4 py-3",
          "flex items-center justify-between",
          // Sticky positioning
          sticky && "sticky top-0 z-50",
          // Responsive container
          "max-w-[900px] mx-auto w-full",
          className,
        )}
        {...props}
      >
        {/* Left side - Brand */}
        <div className="flex items-center">
          <Link
            to="/"
            className="font-pixel text-sm leading-tight hover:text-primary transition-colors"
          >
            {title || "StoryBot Game"}
          </Link>
        </div>

        {/* Right side - Navigation or custom children */}
        <div className="flex items-center gap-3">
          {showNavigation && (
            <Link
              to="/leaderboard"
              className="font-pixel text-xs leading-tight hover:text-primary transition-colors"
            >
              Leaderboard
            </Link>
          )}
          {children}
        </div>
      </div>
    );
  },
);

TopBar.displayName = "TopBar";

export { TopBar };
