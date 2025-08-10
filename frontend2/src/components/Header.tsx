import { useState } from "react";
import { Link } from "react-router-dom";
import { Globe, Users, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  teamId?: string;
  isRtl?: boolean;
  onToggleRtl?: () => void;
}

export function Header({ teamId, isRtl, onToggleRtl }: HeaderProps) {
  return (
    <header className="pixel-panel p-4 mb-4 crt-effect">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="font-pixel text-lg hover:text-primary transition-colors"
          >
            🎮 Story Twister
          </Link>

          {teamId && (
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <Users size={16} />
              <span className="font-pixel">Team: {teamId}</span>
            </div>
          )}
        </div>

        <nav className="flex items-center gap-4">
          <Link
            to="/leaderboard"
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            <Trophy size={16} />
            <span className="hidden sm:inline font-pixel text-sm">
              Leaderboard
            </span>
          </Link>

          {onToggleRtl && (
            <button
              onClick={onToggleRtl}
              className="flex items-center gap-2 hover:text-primary transition-colors"
              aria-label="Toggle RTL/LTR"
            >
              <Globe size={16} />
              <span className="hidden sm:inline font-pixel text-sm">
                {isRtl ? "ENG" : "عربي"}
              </span>
            </button>
          )}
        </nav>
      </div>

      {teamId && (
        <div className="sm:hidden mt-2 flex items-center gap-2 text-sm">
          <Users size={16} />
          <span className="font-pixel">Team: {teamId}</span>
        </div>
      )}
    </header>
  );
}
