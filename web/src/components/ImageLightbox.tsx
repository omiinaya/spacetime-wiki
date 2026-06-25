import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Image Lightbox ──────────────────────────────────────────────────────────
// Fullscreen overlay for viewing images with zoom, pan, keyboard navigation,
// and gallery navigation (prev/next) when viewing multiple images on a page.

interface GalleryImage {
  src: string;
  alt?: string;
}

interface ImageLightboxProps {
  images: GalleryImage[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex = 0, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const current = images[currentIndex];
  const isMulti = images.length > 1;

  // ── Reset zoom on image change ───────────────────────────────────────────
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(i => i + 1);
      resetZoom();
    }
  }, [currentIndex, images.length, resetZoom]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      resetZoom();
    }
  }, [currentIndex, resetZoom]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (isMulti) { e.preventDefault(); goPrev(); }
          break;
        case "ArrowRight":
          if (isMulti) { e.preventDefault(); goNext(); }
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
          resetZoom();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goNext, goPrev, isMulti, resetZoom]);

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

  const handleReset = resetZoom;

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
  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm select-none"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={isMulti ? `Image gallery: ${currentIndex + 1} of ${images.length}` : "Image lightbox"}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white/90 hover:bg-black/70 hover:text-white transition-colors"
        title="Close (Esc)"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Gallery counter */}
      {isMulti && (
        <div className="fixed top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur border border-white/10 text-xs text-white/70 font-mono tabular-nums">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Prev/Next arrows (sides) */}
      {isMulti && currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-black/50 text-white/90 hover:bg-black/70 hover:text-white transition-colors"
          title="Previous (←)"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {isMulti && currentIndex < images.length - 1 && (
        <button
          onClick={goNext}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-black/50 text-white/90 hover:bg-black/70 hover:text-white transition-colors"
          title="Next (→)"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

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
        key={current.src}
        src={current.src}
        alt={current.alt || ""}
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
