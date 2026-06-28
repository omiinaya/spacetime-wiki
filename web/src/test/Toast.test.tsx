import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { axe } from "vitest-axe";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast, ToastItem } from "../components/Toast";
import React from "react";

// ─── Helper: component that exposes toast actions ────────────────────────────

function ToastTester() {
  const { addToast, removeToast, clearToasts, toasts } = useToast();
  return (
    <div>
      <button onClick={() => addToast({ type: "info", title: "Info toast" })}>
        Add Info
      </button>
      <button
        onClick={() =>
          addToast({
            type: "success",
            title: "Saved!",
            message: "Page updated successfully",
          })
        }
      >
        Add Success
      </button>
      <button
        onClick={() =>
          addToast({ type: "error", title: "Error!", duration: 0 })
        }
      >
        Add Persistent
      </button>
      <button onClick={() => addToast({ type: "warning", title: "Warning!" })}>
        Add Warning
      </button>
      <button onClick={clearToasts}>Clear All</button>
      <div data-testid="toast-count">{toasts.length}</div>
      <ul>
        {toasts.map((t: ToastItem) => (
          <li key={t.id}>
            <span data-testid={`toast-title-${t.id}`}>{t.title}</span>
            <button
              data-testid={`dismiss-${t.id}`}
              onClick={() => removeToast(t.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders children", () => {
    renderWithToast(<div data-testid="child">Hello</div>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("adds a toast when addToast is called", () => {
    renderWithToast(<ToastTester />);
    const countBefore = screen.getByTestId("toast-count").textContent;
    expect(countBefore).toBe("0");

    fireEvent.click(screen.getByText("Add Info"));
    expect(screen.getByTestId("toast-count").textContent).toBe("1");
    // The toast title appears in the ToastContainer's <p> with role="alert"
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBe(1);
    expect(alerts[0]).toHaveTextContent("Info toast");
  });

  it("adds multiple toasts", () => {
    renderWithToast(<ToastTester />);
    fireEvent.click(screen.getByText("Add Info"));
    fireEvent.click(screen.getByText("Add Success"));
    fireEvent.click(screen.getByText("Add Warning"));
    expect(screen.getByTestId("toast-count").textContent).toBe("3");
  });

  it("removes a toast when dismiss is clicked", () => {
    renderWithToast(<ToastTester />);
    fireEvent.click(screen.getByText("Add Info"));
    expect(screen.getByTestId("toast-count").textContent).toBe("1");

    // Find the dismiss button (uses toast ID which is dynamic)
    const dismissButtons = screen.getAllByRole("button", { name: "✕" });
    expect(dismissButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(dismissButtons[0]);
    expect(screen.getByTestId("toast-count").textContent).toBe("0");
  });

  it("clears all toasts", () => {
    renderWithToast(<ToastTester />);
    fireEvent.click(screen.getByText("Add Info"));
    fireEvent.click(screen.getByText("Add Success"));
    fireEvent.click(screen.getByText("Add Warning"));
    expect(screen.getByTestId("toast-count").textContent).toBe("3");

    fireEvent.click(screen.getByText("Clear All"));
    expect(screen.getByTestId("toast-count").textContent).toBe("0");
  });

  it("auto-dismisses toasts after duration", () => {
    renderWithToast(<ToastTester />);
    fireEvent.click(screen.getByText("Add Persistent")); // duration 0, should stay
    fireEvent.click(screen.getByText("Add Info")); // default 4000ms

    expect(screen.getByTestId("toast-count").textContent).toBe("2");

    // Advance time past the auto-dismiss
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Persistent toast (duration 0) should remain, info should be gone
    expect(screen.getByTestId("toast-count").textContent).toBe("1");
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBe(1);
    expect(alerts[0]).toHaveTextContent("Error!");
  });

  it("shows toast message when provided", () => {
    renderWithToast(<ToastTester />);
    fireEvent.click(screen.getByText("Add Success"));
    expect(screen.getByText("Page updated successfully")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    vi.useRealTimers();
    const { container } = renderWithToast(<ToastTester />);
    fireEvent.click(screen.getByText("Add Info"));
    fireEvent.click(screen.getByText("Add Success"));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
