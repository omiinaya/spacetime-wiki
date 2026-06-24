import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// ─── Image Lightbox ──────────────────────────────────────────────────────────
// Fullscreen overlay for viewing images with zoom, pan, and keyboard navigation.
// Click backdrop or press Escape to close.

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // ── Keyboard navigation ──────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "=":
        case "+":
          e.preventDefault();
          setZoom((z) => Math.min(z + 0.25, 5));
          break;
        case "-":
          e.preventDefault();
          setZoom((z) => {
            const next = Math.max(z - 0.25, 0.25);
            if (next < 1) setPosition({ x: 0, y: 0 });
            return next;
          });
          break;
        case "0":
          e.preventDefault();
          setZoom(1);
          setPosition({ x: 0, y: 0 });
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ── Zoom controls ────────────────────────────────────────────────────────

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 5));

  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(z - 0.25, 0.25);
      if (next < 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // ── Canvas-style drag-to-pan when zoomed ─────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX - position.x,
      startY: e.clientY - position.y,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragRef.current.startX,
      y: e.clientY - dragRef.current.startY,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ── Double-click to toggle zoom ──────────────────────────────────────────

  const handleDoubleClick = () => {
    if (zoom > 1.5) {
      handleReset();
    } else {
      setZoom((z) => Math.min(z * 2, 5));
    }
  };

  // ── Close on backdrop click (not image click) ────────────────────────────

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm select-none"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white/90 hover:bg-black/70 hover:text-white transition-colors"
        title="Close (Esc)"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Zoom toolbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 rounded-full bg-black/60 backdrop-blur border border-white/10 shadow-2xl">
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
          title="Zoom out (-)"
          disabled={zoom <= 0.25}
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <span className="text-xs text-white/70 min-w-[3rem] text-center font-mono tabular-nums">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
          title="Zoom in (+)"
          disabled={zoom >= 5}
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <span className="w-px h-4 bg-white/20" />

        <button
          onClick={handleReset}
          className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
          title="Reset zoom (0)"
          disabled={zoom === 1 && position.x === 0 && position.y === 0}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt || ""}
        className={`max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-100 ease-out will-change-transform
          ${isDragging ? "cursor-grabbing" : ""}
          ${!isDragging && zoom > 1 ? "cursor-grab" : ""}
          ${zoom <= 1 ? "cursor-default" : ""}
        `}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        draggable={false}
      />
    </div>
  );
}
