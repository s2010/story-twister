import React from "react";
import { cn } from "@/lib/utils";

interface PixelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const PixelCard = React.forwardRef<HTMLDivElement, PixelCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base pixel card styles
          "bg-card text-card-foreground",
          "border-2 border-black",
          "p-4",
          // Subtle shadow for depth
          "shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

PixelCard.displayName = "PixelCard";

const PixelCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mb-4", className)} {...props} />
));

PixelCardHeader.displayName = "PixelCardHeader";

const PixelCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-pixel text-sm leading-tight", className)}
    {...props}
  />
));

PixelCardTitle.displayName = "PixelCardTitle";

const PixelCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-pixel text-xs leading-relaxed", className)}
    {...props}
  />
));

PixelCardContent.displayName = "PixelCardContent";

export { PixelCard, PixelCardHeader, PixelCardTitle, PixelCardContent };
