import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { axe } from "vitest-axe";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ImageLightbox } from "../components/ImageLightbox";
import React from "react";

const singleImage = [{ src: "https://example.com/img1.png", alt: "First image" }];

const galleryImages = [
  { src: "https://example.com/img1.png", alt: "First image", imageId: "img1" },
  { src: "https://example.com/img2.png", alt: "Second image", imageId: "img2" },
  { src: "https://example.com/img3.png", alt: "Third image" },
];

const sampleComments = [
  { id: "c1", body: "Nice image!", user_id: "user1", created_at: Date.now() - 10000, text_anchor: "image:img1" },
  { id: "c2", body: "I agree", user_id: "user2", created_at: Date.now() - 5000, text_anchor: "image:img1" },
];

describe("ImageLightbox", () => {
  const onClose = vi.fn();
  const onAddComment = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); document.body.style.overflow = ""; });
  afterEach(() => { document.body.style.overflow = ""; });

  it("renders null when images array is empty", () => {
    const { container } = render(<ImageLightbox images={[]} onClose={onClose} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders a single image with dialog role", () => {
    render(<ImageLightbox images={singleImage} onClose={onClose} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", singleImage[0].src);
    expect(screen.getByRole("img")).toHaveAttribute("alt", singleImage[0].alt);
  });

  it("renders gallery counter for multiple images but not single", () => {
    const { rerender } = render(<ImageLightbox images={galleryImages} onClose={onClose} />);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    rerender(<ImageLightbox images={singleImage} onClose={onClose} />);
    expect(screen.queryByText(/\/ 1/)).not.toBeInTheDocument();
  });

  it("navigates next/prev with buttons", () => {
    render(<ImageLightbox images={galleryImages} onClose={onClose} />);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Next (→)"));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Previous (←)"));
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("shows/hides prev/next at boundaries", () => {
    render(<ImageLightbox images={galleryImages} onClose={onClose} />);
    expect(screen.queryByTitle("Previous (←)")).not.toBeInTheDocument();
    expect(screen.getByTitle("Next (→)")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Next (→)"));
    fireEvent.click(screen.getByTitle("Next (→)"));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.queryByTitle("Next (→)")).not.toBeInTheDocument();
    expect(screen.getByTitle("Previous (←)")).toBeInTheDocument();
  });

  it("zooms in and out with buttons", () => {
    render(<ImageLightbox images={singleImage} onClose={onClose} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Zoom in (+)"));
    expect(screen.getByText("125%")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Zoom out (-)"));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("disables zoom out at minimum zoom (0.25)", () => {
    render(<ImageLightbox images={singleImage} onClose={onClose} />);
    // Zoom in 3x first to get to 175%
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByTitle("Zoom in (+)"));
    expect(screen.getByText("175%")).toBeInTheDocument();
    // Zoom out 6x: 175→150→125→100→75→50→25
    for (let i = 0; i < 6; i++) fireEvent.click(screen.getByTitle("Zoom out (-)"));
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByTitle("Zoom out (-)")).toBeDisabled();
  });

  it("disables zoom in at maximum (5x)", () => {
    render(<ImageLightbox images={singleImage} onClose={onClose} />);
    for (let i = 0; i < 16; i++) fireEvent.click(screen.getByTitle("Zoom in (+)"));
    expect(screen.getByText("500%")).toBeInTheDocument();
    expect(screen.getByTitle("Zoom in (+)")).toBeDisabled();
  });

  it("closes on Escape key", () => {
    render(<ImageLightbox images={singleImage} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("navigates and zooms with keyboard", () => {
    render(<ImageLightbox images={galleryImages} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "=" });
    expect(screen.getByText("125%")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "-" });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("resets zoom with 0 key", () => {
    render(<ImageLightbox images={singleImage} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "=" });
    fireEvent.keyDown(window, { key: "=" });
    expect(screen.getByText("150%")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "0" });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("closes on backdrop click but not image click", () => {
    render(<ImageLightbox images={singleImage} onClose={onClose} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("img"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("resets zoom on image change", () => {
    render(<ImageLightbox images={galleryImages} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "=" });
    expect(screen.getByText("125%")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("locks/unlocks body scroll", () => {
    const { unmount } = render(<ImageLightbox images={singleImage} onClose={onClose} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("shows comments toggle only when imageId and onAddComment are provided", () => {
    const { rerender } = render(<ImageLightbox images={galleryImages} onClose={onClose} />);
    expect(screen.queryByTitle("Toggle comments")).not.toBeInTheDocument();
    rerender(<ImageLightbox images={galleryImages} onClose={onClose} onAddComment={onAddComment} />);
    expect(screen.getByTitle("Toggle comments")).toBeInTheDocument();
  });

  it("shows comment count badge", () => {
    render(<ImageLightbox images={galleryImages} onClose={onClose} onAddComment={onAddComment} comments={sampleComments} />);
    expect(screen.getByTitle("Toggle comments")).toHaveTextContent("2");
  });

  it("opens comments sidebar and shows image-specific comments", () => {
    render(<ImageLightbox images={galleryImages} onClose={onClose} onAddComment={onAddComment} comments={sampleComments} />);
    fireEvent.click(screen.getByTitle("Toggle comments"));
    expect(screen.getByText("Comments")).toBeInTheDocument();
    expect(screen.getByText("Nice image!")).toBeInTheDocument();
    expect(screen.getByText("I agree")).toBeInTheDocument();
  });

  it("shows empty state when no comments on current image", () => {
    render(<ImageLightbox images={galleryImages} onClose={onClose} onAddComment={onAddComment} comments={sampleComments} />);
    // Navigate to second image (img2) which has no matching comments
    fireEvent.click(screen.getByTitle("Next (→)"));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    // Toggle comments — should show empty state
    fireEvent.click(screen.getByTitle("Toggle comments"));
    expect(screen.getByText("No comments on this image yet.")).toBeInTheDocument();
  });

  it("submits a comment via button and Enter key", () => {
    render(<ImageLightbox images={galleryImages} onClose={onClose} onAddComment={onAddComment} />);
    fireEvent.click(screen.getByTitle("Toggle comments"));
    const textarea = screen.getByPlaceholderText("Add a comment...");
    fireEvent.change(textarea, { target: { value: "Great shot!" } });
    fireEvent.click(screen.getByText("Comment"));
    expect(onAddComment).toHaveBeenCalledWith("img1", "Great shot!");
    // Reset mock for next call
    onAddComment.mockClear();
    fireEvent.change(textarea, { target: { value: "Nice!" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onAddComment).toHaveBeenCalledWith("img1", "Nice!");
  });

  it("disables comment button for empty input", () => {
    render(<ImageLightbox images={galleryImages} onClose={onClose} onAddComment={onAddComment} />);
    fireEvent.click(screen.getByTitle("Toggle comments"));
    expect(screen.getByText("Comment")).toBeDisabled();
  });

  it("toggles comments panel via the toggle button", () => {
    render(<ImageLightbox images={galleryImages} onClose={onClose} onAddComment={onAddComment} />);
    fireEvent.click(screen.getByTitle("Toggle comments"));
    expect(screen.getByText("Comments")).toBeInTheDocument();
    // Toggle again to close
    fireEvent.click(screen.getByTitle("Toggle comments"));
    expect(screen.queryByText("Comments")).not.toBeInTheDocument();
  });

  it("double-click toggles zoom", () => {
    render(<ImageLightbox images={singleImage} onClose={onClose} />);
    const img = screen.getByRole("img");
    fireEvent.doubleClick(img);
    expect(screen.getByText("200%")).toBeInTheDocument();
    fireEvent.doubleClick(img);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("sets correct aria-label for single vs multi", () => {
    const { rerender } = render(<ImageLightbox images={singleImage} onClose={onClose} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Image lightbox");
    rerender(<ImageLightbox images={galleryImages} onClose={onClose} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Image gallery: 1 of 3");
  });

  it("starts at initialIndex when provided", () => {
    render(<ImageLightbox images={galleryImages} initialIndex={2} onClose={onClose} />);
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", galleryImages[2].src);
  });

  it("resets on double-click when already zoomed in", () => {
    render(<ImageLightbox images={singleImage} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "=" });
    expect(screen.getByText("125%")).toBeInTheDocument();
    fireEvent.doubleClick(screen.getByRole("img"));
    expect(screen.getByText("250%")).toBeInTheDocument();
    fireEvent.doubleClick(screen.getByRole("img"));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ImageLightbox images={galleryImages} onClose={onClose} onAddComment={onAddComment} comments={sampleComments} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
