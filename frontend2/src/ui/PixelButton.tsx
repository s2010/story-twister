import React from "react";
import { cn } from "@/lib/utils";

interface PixelButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "destructive";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const PixelButton = React.forwardRef<HTMLButtonElement, PixelButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseClasses = [
      // Base pixel button styles
      "font-pixel text-xs leading-none",
      "border-2 border-black",
      "transition-all duration-150",
      "focus:outline-none focus:ring-4 focus:ring-ring",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      // Pixel art hover effect
      "hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      "active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
      "active:translate-x-[2px] active:translate-y-[2px]",
      "disabled:hover:shadow-none disabled:active:shadow-none",
      "disabled:active:translate-x-0 disabled:active:translate-y-0",
    ];

    const variantClasses = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
      accent: "bg-accent text-accent-foreground hover:bg-accent/90",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    };

    const sizeClasses = {
      sm: "px-3 py-2 min-h-[32px]",
      md: "px-4 py-3 min-h-[44px]",
      lg: "px-6 py-4 min-h-[52px]",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  },
);

PixelButton.displayName = "PixelButton";

export { PixelButton };
