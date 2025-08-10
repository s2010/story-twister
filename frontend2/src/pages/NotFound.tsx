import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-full animated-clouds grass-pattern items-center justify-center content-container">
      <div className="pixel-panel p-8 text-center max-w-md mx-4 crt-effect">
        <div className="flex items-center justify-center gap-3 mb-4">
          <AlertTriangle size={32} className="text-accent" />
          <h1 className="font-pixel text-3xl">404</h1>
          <AlertTriangle size={32} className="text-accent" />
        </div>

        <p className="font-mono text-lg text-muted-foreground mb-6">
          Oops! This page got lost in the pixel realm...
        </p>

        <Link
          to="/"
          className="pixel-button bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2"
        >
          <Home size={16} />
          Return to Game
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
