import { useRef, useState } from 'react';

export const SIDEBAR_W = 288;

export function useSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const touchStartRef = useRef(0);
  const sidebarDragRef = useRef(false);
  const sidebarElRef = useRef<HTMLDivElement>(null);
  const sidebarTouchDelta = useRef(0);
  const [sidebarOverlayVisible, setSidebarOverlayVisible] = useState(false);
  const sidebarOverlayRef = useRef<HTMLDivElement>(null);
  const sidebarNavRef = useRef<HTMLDivElement>(null);

  return {
    sidebarOpen,
    setSidebarOpen,
    sidebarDragRef,
    touchStartRef,
    sidebarTouchDelta,
    sidebarElRef,
    sidebarOverlayRef,
    sidebarOverlayVisible,
    setSidebarOverlayVisible,
    SIDEBAR_W,
    sidebarNavRef,
  };
}
