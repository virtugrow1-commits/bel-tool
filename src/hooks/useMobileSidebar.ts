import { useState, useEffect, useCallback } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useMobileSidebar() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false); // Auto-close on desktop
    };

    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen(p => !p), []);

  // Auto-close when selecting a contact on mobile
  const closeOnAction = useCallback(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  return {
    isMobile,
    sidebarOpen,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    closeOnAction,
  };
}
