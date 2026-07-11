import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockListEvents = vi.fn();
const mockFire = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    webhooks: {
      list: (...a: unknown[]) => mockList(...a),
      create: (...a: unknown[]) => mockCreate(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
      delete: (...a: unknown[]) => mockDelete(...a),
      listEvents: (...a: unknown[]) => mockListEvents(...a),
      fire: (...a: unknown[]) => mockFire(...a),
    },
  },
  Webhook: class {},
  WebhookEvent: class {},
}));

import { WebhookSettings } from '../components/WebhookSettings';

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleWebhooks = [
  {
    id: 'wh1',
    name: 'Slack Notifier',
    url: 'https://hooks.slack.com/xxx',
    events: JSON.stringify(['page.create', 'page.update']),
    secret: 'whsec_test123',
    is_active: true,
    created_at: 1000,
    created_by: 'u1',
  },
  {
    id: 'wh2',
    name: 'Discord Bot',
    url: 'https://discord.com/api/webhooks/yyy',
    events: JSON.stringify(['page.delete']),
    secret: '',
    is_active: false,
    created_at: 900,
    created_by: 'u1',
  },
];

const sampleEvents = [
  {
    id: 'e1',
    webhook_id: 'wh1',
    event_type: 'page.create',
    payload: '{}',
    status: 'sent',
    response_code: 200,
    response_body: '{}',
    created_at: 1000,
  },
  {
    id: 'e2',
    webhook_id: 'wh1',
    event_type: 'page.update',
    payload: '{}',
    status: 'failed',
    response_code: 500,
    response_body: '{"error":"timeout"}',
    created_at: 900,
  },
];

function renderWebhooks(props: Partial<Parameters<typeof WebhookSettings>[0]> = {}) {
  return render(<WebhookSettings userId={props.userId ?? 'u1'} />);
}

describe('WebhookSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(sampleWebhooks);
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('renders the section header', () => {
    renderWebhooks();
    expect(screen.getByText('Webhooks')).toBeInTheDocument();
  });

  it('calls api.webhooks.list on mount', () => {
    renderWebhooks();
    expect(mockList).toHaveBeenCalledOnce();
  });

  it('shows New Webhook button', async () => {
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    expect(screen.getByText('New Webhook')).toBeInTheDocument();
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  it('shows loading spinner while fetching', () => {
    mockList.mockReturnValue(new Promise(() => {}));
    renderWebhooks();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  // ─── Empty state ─────────────────────────────────────────────────────────

  it('shows empty state when no webhooks', async () => {
    mockList.mockResolvedValue([]);
    renderWebhooks();
    await waitFor(() => {
      expect(screen.getByText(/No webhooks configured/)).toBeInTheDocument();
    });
  });

  // ─── Webhook list ─────────────────────────────────────────────────────────

  it('renders webhook items with names', async () => {
    renderWebhooks();
    await waitFor(() => {
      expect(screen.getByText('Slack Notifier')).toBeInTheDocument();
      expect(screen.getByText('Discord Bot')).toBeInTheDocument();
    });
  });

  it('shows webhook URLs', async () => {
    renderWebhooks();
    await waitFor(() => {
      expect(screen.getByText(/hooks\.slack\.com/)).toBeInTheDocument();
    });
  });

  it('shows active status indicator', async () => {
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    // Active webhook has a green dot
    const activeDots = document.querySelectorAll('.bg-green-500');
    expect(activeDots.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Expand details ──────────────────────────────────────────────────────

  it('expands webhook details on click', async () => {
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Slack Notifier'));
    // URL label should appear in expanded detail section
    expect(screen.getByText('URL:')).toBeInTheDocument();
  });

  it('shows event tags in expanded section', async () => {
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Slack Notifier'));
    expect(screen.getByText('page.create')).toBeInTheDocument();
    expect(screen.getByText('page.update')).toBeInTheDocument();
  });

  it('shows active/inactive toggle button in expanded section', async () => {
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Slack Notifier'));
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  // ─── Create webhook form ─────────────────────────────────────────────────

  it('opens create form when New Webhook is clicked', async () => {
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Webhook'));
    expect(screen.getByText('New webhook')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('My webhook')).toBeInTheDocument();
  });

  it('calls api.webhooks.create when form submitted', async () => {
    mockCreate.mockResolvedValue(undefined);
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Webhook'));
    const nameInput = screen.getByPlaceholderText('My webhook');
    const urlInput = screen.getByPlaceholderText('https://hooks.example.com/notify');
    fireEvent.change(nameInput, { target: { value: 'Test Hook' } });
    fireEvent.change(urlInput, { target: { value: 'https://example.com/hook' } });
    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        'Test Hook',
        'https://example.com/hook',
        JSON.stringify(['page.create', 'page.update']),
        '',
        'u1',
      );
    });
  });

  // ─── Edit webhook ───────────────────────────────────────────────────────

  it('opens edit form with pre-filled data', async () => {
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    const editBtns = document.querySelectorAll('[title="Edit"]');
    fireEvent.click(editBtns[0]);
    expect(screen.getByText('Edit webhook')).toBeInTheDocument();
    const nameInput = screen.getByPlaceholderText('My webhook') as HTMLInputElement;
    expect(nameInput.value).toBe('Slack Notifier');
  });

  it('calls api.webhooks.update when editing', async () => {
    mockUpdate.mockResolvedValue(undefined);
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    const editBtns = document.querySelectorAll('[title="Edit"]');
    fireEvent.click(editBtns[0]);
    const nameInput = screen.getByPlaceholderText('My webhook');
    fireEvent.change(nameInput, { target: { value: 'Updated' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  // ─── Delete webhook ─────────────────────────────────────────────────────

  it('calls api.webhooks.delete on confirm', async () => {
    mockDelete.mockResolvedValue(undefined);
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmMock);

    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    const deleteBtns = document.querySelectorAll('[title="Delete"]');
    fireEvent.click(deleteBtns[0]);
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('wh1');
    });
    vi.unstubAllGlobals();
  });

  // ─── Toggle active ──────────────────────────────────────────────────────

  it('toggles webhook active status', async () => {
    mockUpdate.mockResolvedValue(undefined);
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Slack Notifier')); // expand
    fireEvent.click(screen.getByText('Active')); // click toggle
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        'wh1',
        'Slack Notifier',
        'https://hooks.slack.com/xxx',
        JSON.stringify(['page.create', 'page.update']),
        'whsec_test123',
        false,
      );
    });
  });

  // ─── Test event ─────────────────────────────────────────────────────────

  it('fires test event when test button clicked', async () => {
    mockFire.mockResolvedValue(undefined);
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    const fireBtns = document.querySelectorAll('[title="Fire test event"]');
    fireEvent.click(fireBtns[0]);
    await waitFor(() => {
      expect(mockFire).toHaveBeenCalledWith('wh1', 'page.create', '', expect.any(String));
    });
  });

  // ─── Events panel ───────────────────────────────────────────────────────

  it('opens events panel when events button clicked', async () => {
    mockListEvents.mockResolvedValue(sampleEvents);
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    const eventsBtns = document.querySelectorAll('[title="View events"]');
    fireEvent.click(eventsBtns[0]);
    await waitFor(() => {
      expect(screen.getByText('Webhook Events')).toBeInTheDocument();
    });
  });

  it('shows event status icons', async () => {
    mockListEvents.mockResolvedValue(sampleEvents);
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    const eventsBtns = document.querySelectorAll('[title="View events"]');
    fireEvent.click(eventsBtns[0]);
    await waitFor(() => {
      expect(screen.getByText('sent')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
    });
  });

  it('shows event response code', async () => {
    mockListEvents.mockResolvedValue(sampleEvents);
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    const eventsBtns = document.querySelectorAll('[title="View events"]');
    fireEvent.click(eventsBtns[0]);
    await waitFor(() => {
      expect(screen.getByText('HTTP 200')).toBeInTheDocument();
      expect(screen.getByText('HTTP 500')).toBeInTheDocument();
    });
  });

  // ─── Event type checkboxes ──────────────────────────────────────────────

  it('shows event type checkboxes in create form', async () => {
    renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Webhook'));
    expect(screen.getByText('Page created')).toBeInTheDocument();
    expect(screen.getByText('Page updated')).toBeInTheDocument();
    expect(screen.getByText('Page deleted')).toBeInTheDocument();
    expect(screen.getByText('Comment added')).toBeInTheDocument();
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations with webhooks', async () => {
    const { container } = renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in empty state', async () => {
    mockList.mockResolvedValue([]);
    const { container } = renderWebhooks();
    await waitFor(() => expect(screen.getByText(/No webhooks configured/)).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with events panel open', async () => {
    mockListEvents.mockResolvedValue(sampleEvents);
    const { container } = renderWebhooks();
    await waitFor(() => expect(screen.getByText('Slack Notifier')).toBeInTheDocument());
    const eventsBtns = document.querySelectorAll('[title="View events"]');
    fireEvent.click(eventsBtns[0]);
    await waitFor(() => expect(screen.getByText('Webhook Events')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
