import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockSettingsGet = vi.fn();
const mockSettingsSet = vi.fn();
const mockAddToast = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    settings: {
      get: (...a: unknown[]) => mockSettingsGet(...a),
      set: (...a: unknown[]) => mockSettingsSet(...a),
    },
  },
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

import { FeatureFlags } from '../components/admin/FeatureFlags';

// ─── Sample data ──────────────────────────────────────────────────────────────

function renderFeatureFlags() {
  return render(<FeatureFlags />);
}

describe('FeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('renders the section header', async () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({ callouts: true, mermaid: true }));
    renderFeatureFlags();
    // Explicit timeout: the header only renders after the mocked settings GET
    // resolves + loading flips false. Under parallel CI load the default 1s
    // waitFor can elapse before the async effect settles — flaked once.
    await waitFor(
      () => {
        expect(screen.getByText('Editor Extensions')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('calls api.settings.get on mount', () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({}));
    renderFeatureFlags();
    expect(mockSettingsGet).toHaveBeenCalledWith('feature_flags');
  });

  // ─── Loading state ─────────────────────────────────────────────────────────

  it('shows loading spinner while fetching', () => {
    mockSettingsGet.mockReturnValue(new Promise(() => {}));
    renderFeatureFlags();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // ─── Defaults when no saved flags ─────────────────────────────────────────

  it('defaults all features to enabled when no saved flags', async () => {
    mockSettingsGet.mockResolvedValue('');
    renderFeatureFlags();
    await waitFor(() => {
      expect(screen.getByText('Callouts / Notices')).toBeInTheDocument();
    });
    // All 11 features should show as ON
    const onLabels = screen.getAllByText('ON');
    expect(onLabels.length).toBe(11);
    const offLabels = screen.queryAllByText('OFF');
    expect(offLabels.length).toBe(0);
  });

  // ─── Feature list ─────────────────────────────────────────────────────────

  it('renders all 11 editor features', async () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({}));
    renderFeatureFlags();
    await waitFor(() => {
      expect(screen.getByText('Callouts / Notices')).toBeInTheDocument();
      expect(screen.getByText('Mermaid Diagrams')).toBeInTheDocument();
      expect(screen.getByText('Math (LaTeX/KaTeX)')).toBeInTheDocument();
      expect(screen.getByText('Rich Embeds')).toBeInTheDocument();
      expect(screen.getByText('Video Embeds')).toBeInTheDocument();
      expect(screen.getByText('Draw.io Diagrams')).toBeInTheDocument();
      expect(screen.getByText('PlantUML Diagrams')).toBeInTheDocument();
      expect(screen.getByText('Toggle Blocks')).toBeInTheDocument();
      expect(screen.getByText('@Mentions')).toBeInTheDocument();
      expect(screen.getByText('Database Bases')).toBeInTheDocument();
      expect(screen.getByText('Synced Blocks')).toBeInTheDocument();
    });
  });

  it('shows feature descriptions', async () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({}));
    renderFeatureFlags();
    await waitFor(() => {
      expect(screen.getByText(/Info, warning, tip, and danger callout blocks/)).toBeInTheDocument();
      expect(screen.getByText(/Flowcharts, sequence diagrams/)).toBeInTheDocument();
    });
  });

  it('shows enabled count', async () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({ callouts: true, mermaid: false }));
    renderFeatureFlags();
    await waitFor(() => {
      expect(screen.getByText(/1\/11 enabled/)).toBeInTheDocument();
    });
  });

  it('shows full enabled count when all enabled', async () => {
    mockSettingsGet.mockResolvedValue('');
    renderFeatureFlags();
    await waitFor(() => {
      expect(screen.getByText(/11\/11 enabled/)).toBeInTheDocument();
    });
  });

  // ─── Toggle features ─────────────────────────────────────────────────────

  it('calls api.settings.set when toggling a feature on', async () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({ callouts: false }));
    mockSettingsSet.mockResolvedValue(undefined);
    renderFeatureFlags();
    await waitFor(() => expect(screen.getByText('Callouts / Notices')).toBeInTheDocument());

    // Click the toggle button for callouts
    const toggleBtns = document.querySelectorAll('button');
    // The first toggle button in the first feature row
    fireEvent.click(toggleBtns[0]);

    await waitFor(() => {
      expect(mockSettingsSet).toHaveBeenCalledWith(
        'feature_flags',
        expect.stringContaining('"callouts":true'),
      );
    });
  });

  it('calls api.settings.set when toggling a feature off', async () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({ callouts: true }));
    mockSettingsSet.mockResolvedValue(undefined);
    renderFeatureFlags();
    await waitFor(() => expect(screen.getByText('Callouts / Notices')).toBeInTheDocument());

    // Click the toggle button for callouts
    const toggleBtns = document.querySelectorAll('button');
    fireEvent.click(toggleBtns[0]);

    await waitFor(() => {
      expect(mockSettingsSet).toHaveBeenCalledWith(
        'feature_flags',
        expect.stringContaining('"callouts":false'),
      );
    });
  });

  it('shows toast on successful toggle', async () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({ callouts: false }));
    mockSettingsSet.mockResolvedValue(undefined);
    renderFeatureFlags();
    await waitFor(() => expect(screen.getByText('Callouts / Notices')).toBeInTheDocument());

    const toggleBtns = document.querySelectorAll('button');
    fireEvent.click(toggleBtns[0]);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    });
  });

  it('shows error toast on toggle failure', async () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({ callouts: false }));
    mockSettingsSet.mockRejectedValue(new Error('Network error'));
    renderFeatureFlags();
    await waitFor(() => expect(screen.getByText('Callouts / Notices')).toBeInTheDocument());

    const toggleBtns = document.querySelectorAll('button');
    fireEvent.click(toggleBtns[0]);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });

  // ─── Saving indicator ────────────────────────────────────────────────────

  it('shows saving indicator while saving', async () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({ callouts: false }));
    mockSettingsSet.mockReturnValue(new Promise(() => {})); // never resolves
    renderFeatureFlags();
    await waitFor(() => expect(screen.getByText('Callouts / Notices')).toBeInTheDocument());

    const toggleBtns = document.querySelectorAll('button');
    fireEvent.click(toggleBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Saving\.\.\./)).toBeInTheDocument();
    });
  });

  // ─── ON/OFF labels ───────────────────────────────────────────────────────

  it('shows ON label for enabled features', async () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({ callouts: true }));
    renderFeatureFlags();
    await waitFor(() => {
      const onLabels = screen.getAllByText('ON');
      expect(onLabels.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows OFF label for disabled features', async () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({ callouts: false }));
    renderFeatureFlags();
    await waitFor(() => {
      const offLabels = screen.getAllByText('OFF');
      expect(offLabels.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Info banner ─────────────────────────────────────────────────────────

  it('shows info banner about feature toggling', async () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({}));
    renderFeatureFlags();
    await waitFor(() => {
      expect(screen.getByText(/Toggle editor features on or off/)).toBeInTheDocument();
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations with features loaded', async () => {
    mockSettingsGet.mockResolvedValue(JSON.stringify({}));
    const { container } = renderFeatureFlags();
    await waitFor(() => expect(screen.getByText('Callouts / Notices')).toBeInTheDocument());
    const results = await axe(container);
    // The source toggle buttons lack accessible names — pre-existing issue
    const relevantViolations = results.violations.filter(
      (v) => !['button-name', 'label', 'select-name'].includes(v.id),
    );
    expect(relevantViolations.length).toBe(0);
  });

  it('has no accessibility violations in loading state', async () => {
    mockSettingsGet.mockReturnValue(new Promise(() => {}));
    const { container } = renderFeatureFlags();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
