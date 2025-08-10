import React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  withPadding?: boolean;
  withGrassFooter?: boolean;
}

const PageShell = React.forwardRef<HTMLDivElement, PageShellProps>(
  (
    {
      className,
      children,
      withPadding = true,
      withGrassFooter = true,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base page shell styles - sky blue background
          "min-h-screen bg-background",
          // Flex layout to handle footer properly
          "flex flex-col",
          className,
        )}
        {...props}
      >
        {/* Main content area */}
        <div
          className={cn(
            // Flex grow to take available space
            "flex-1",
            withPadding && "px-3 sm:px-4",
            withGrassFooter ? "pb-4" : "pb-8", // Normal bottom padding
          )}
        >
          {children}
        </div>

        {/* Pixel grass footer */}
        {withGrassFooter && (
          <div className="h-12 bg-secondary border-t-2 border-black mt-auto">
            <div className="h-full bg-gradient-to-t from-secondary to-secondary/80 relative">
              {/* Pixel grass pattern */}
              <div className="absolute inset-0 opacity-30">
                <div
                  className="h-full w-full bg-repeat-x"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 8V6h1V4h1V2h1V0h1v2h1v2h1v2h1v2H0z' fill='%23000' fill-opacity='0.1'/%3E%3C/svg%3E")`,
                    backgroundSize: "8px 8px",
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

PageShell.displayName = "PageShell";

const PageContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Responsive container with max width and centering
      "max-w-[900px] mx-auto w-full",
      // Mobile-first: 390px target width, scales to desktop
      "min-w-0",
      className,
    )}
    {...props}
  />
));

PageContent.displayName = "PageContent";

export { PageShell, PageContent };
