import { useState, useEffect } from "react";

const SIDEBAR_STORAGE_KEY = "treenest_sidebar_collapsed";
const SIDEBAR_EVENT_KEY = "treenest_sidebar_change";

export function useSidebar() {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleStorage = (e: Event) => {
      const customEvent = e as CustomEvent<{ isCollapsed: boolean }>;
      if (customEvent.detail !== undefined) {
        setIsCollapsedState(customEvent.detail.isCollapsed);
      } else {
        const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
        setIsCollapsedState(stored);
      }
    };

    window.addEventListener(SIDEBAR_EVENT_KEY, handleStorage);
    return () => window.removeEventListener(SIDEBAR_EVENT_KEY, handleStorage);
  }, []);

  const setIsCollapsed = (collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
      window.dispatchEvent(
        new CustomEvent(SIDEBAR_EVENT_KEY, { detail: { isCollapsed: collapsed } })
      );
    } catch {
      // ignore
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return { isCollapsed, setIsCollapsed, toggleSidebar };
}
