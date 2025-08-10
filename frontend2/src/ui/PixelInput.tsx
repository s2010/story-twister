import React from "react";
import { cn } from "@/lib/utils";

interface PixelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: string;
}

const PixelInput = React.forwardRef<HTMLInputElement, PixelInputProps>(
  ({ className, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            // Base pixel input styles
            "w-full font-pixel text-xs leading-none",
            "border-2 border-black bg-card text-card-foreground",
            "px-3 py-3 min-h-[44px]",
            // Focus styles with large ring
            "focus:outline-none focus:ring-4 focus:ring-ring",
            // Error styles
            error && "border-destructive focus:ring-destructive",
            // Disabled styles
            "disabled:opacity-50 disabled:cursor-not-allowed",
            // Placeholder styles
            "placeholder:text-muted-foreground",
            className,
          )}
          {...props}
        />
        {/* Helper text or error message */}
        {(helperText || error) && (
          <p
            className={cn(
              "mt-1 text-xs font-pixel",
              error ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  },
);

PixelInput.displayName = "PixelInput";

export { PixelInput };
