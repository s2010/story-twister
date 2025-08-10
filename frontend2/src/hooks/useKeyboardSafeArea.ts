import { useState, useEffect } from "react";

export function useKeyboardSafeArea() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Modern approach using Visual Viewport API
    if ("visualViewport" in window && window.visualViewport) {
      const viewport = window.visualViewport;

      const handleViewportChange = () => {
        const newHeight = window.innerHeight - viewport.height;
        setKeyboardHeight(newHeight);
        setIsKeyboardVisible(newHeight > 0);
      };

      viewport.addEventListener("resize", handleViewportChange);
      return () => viewport.removeEventListener("resize", handleViewportChange);
    } else {
      // Fallback for older browsers
      const initialHeight = window.innerHeight;

      const handleResize = () => {
        const currentHeight = window.innerHeight;
        const heightDiff = initialHeight - currentHeight;

        if (heightDiff > 150) {
          // Likely keyboard
          setKeyboardHeight(heightDiff);
          setIsKeyboardVisible(true);
        } else {
          setKeyboardHeight(0);
          setIsKeyboardVisible(false);
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}
