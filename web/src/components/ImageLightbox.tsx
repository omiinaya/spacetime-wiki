import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

// ─── Image Lightbox ──────────────────────────────────────────────────────────
// Fullscreen overlay for viewing images with zoom, pan, keyboard navigation,
// gallery navigation (prev/next), and image-specific comments.

interface GalleryImage {
  src: string;
  alt?: string;
  imageId?: string;
}

interface ImageLightboxProps {
  images: GalleryImage[];
  initialIndex?: number;
  onClose: () => void;
  pageId?: string;
  onAddComment?: (imageId: string, body: string) => void;
  comments?: Array<{
    id: string;
    body: string;
    user_id: string;
    created_at: number;
    text_anchor?: string;
  }>;
}

export function ImageLightbox({
  images,
  initialIndex = 0,
  onClose,
  pageId,
  onAddComment,
  comments,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const [commentInput, setCommentInput] = useState('');
  const [showComments, setShowComments] = useState(false);

  const current = images[currentIndex];
  const isMulti = images.length > 1;
  const imageId = current?.imageId;

  // Filter comments for this specific image
  const imageComments =
    comments?.filter(
      (c) => 'text_anchor' in c && (c as unknown).text_anchor === `image:${imageId}`,
    ) || [];

  // ── Reset zoom on image change ───────────────────────────────────────────
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex((i) => i + 1);
      resetZoom();
    }
  }, [currentIndex, images.length, resetZoom]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      resetZoom();
    }
  }, [currentIndex, resetZoom]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (isMulti) {
            e.preventDefault();
            goPrev();
          }
          break;
        case 'ArrowRight':
          if (isMulti) {
            e.preventDefault();
            goNext();
          }
          break;
        case '=':
        case '+':
          e.preventDefault();
          setZoom((z) => Math.min(z + 0.25, 5));
          break;
        case '-':
          e.preventDefault();
          setZoom((z) => {
            const next = Math.max(z - 0.25, 0.25);
            if (next < 1) setPosition({ x: 0, y: 0 });
            return next;
          });
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goNext, goPrev, isMulti, resetZoom]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
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

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY,
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
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

  // ── Add comment handler ──────────────────────────────────────────────────
  const handleSubmitComment = () => {
    const body = commentInput.trim();
    if (!body || !imageId || !onAddComment) return;
    onAddComment(imageId, body);
    setCommentInput('');
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-xs select-none"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={
        isMulti ? `Image gallery: ${currentIndex + 1} of ${images.length}` : 'Image lightbox'
      }
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white/90 hover:bg-black/70 hover:text-white transition-colors"
        title="Close (Esc)"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Comments toggle button */}
      {imageId && onAddComment && (
        <button
          onClick={() => setShowComments(!showComments)}
          className={`fixed top-4 right-16 z-10 p-2 rounded-full transition-colors ${
            showComments
              ? 'bg-primary/40 text-white'
              : 'bg-black/50 text-white/90 hover:bg-black/70 hover:text-white'
          }`}
          title="Toggle comments"
        >
          <MessageSquare className="h-5 w-5" />
          {imageComments.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {imageComments.length}
            </span>
          )}
        </button>
      )}

      {/* Gallery counter */}
      {isMulti && (
        <div className="fixed top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-xs text-white/70 font-mono tabular-nums">
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 shadow-2xl">
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
          title="Zoom out (-)"
          disabled={zoom <= 0.25}
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <span className="text-xs text-white/70 min-w-12 text-center font-mono tabular-nums">
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

      {/* Comments sidebar */}
      {showComments && imageId && onAddComment && (
        <div className="fixed right-0 top-0 bottom-0 w-72 z-20 bg-black/70 backdrop-blur-md border-l border-white/10 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-medium text-white/90">Comments</h3>
            <button
              onClick={() => setShowComments(false)}
              className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {imageComments.length === 0 && (
              <p className="text-xs text-white/40 text-center pt-8">
                No comments on this image yet.
              </p>
            )}
            {imageComments.map((c) => (
              <div key={c.id} className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-medium text-white/50 truncate max-w-[120px]">
                    {c.user_id}
                  </span>
                  <span className="text-[10px] text-white/30">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-white/80 whitespace-pre-wrap wrap-break-word">
                  {c.body}
                </p>
              </div>
            ))}
          </div>

          {/* Comment input */}
          <div className="p-3 border-t border-white/10">
            <textarea
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/30 resize-none outline-hidden focus:ring-1 focus:ring-primary/50 min-h-[60px]"
              placeholder="Add a comment..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={handleCommentKeyDown}
              rows={2}
            />
            <button
              onClick={handleSubmitComment}
              disabled={!commentInput.trim()}
              className="mt-2 w-full py-1.5 rounded-lg bg-primary/80 hover:bg-primary text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Comment
            </button>
          </div>
        </div>
      )}

      {/* Image */}
      <img
        ref={imgRef}
        key={current.src}
        src={current.src}
        alt={current.alt || ''}
        className={`max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-100 ease-out will-change-transform
          ${isDragging ? 'cursor-grabbing' : ''}
          ${!isDragging && zoom > 1 ? 'cursor-grab' : ''}
          ${zoom <= 1 ? 'cursor-default' : ''}
          ${showComments ? 'mr-72' : ''}
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
export default ImageLightbox;
