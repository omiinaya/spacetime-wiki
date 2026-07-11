import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockGetMethod = vi.fn();
const mockGetBackupCodes = vi.fn();
const mockEnableTotp = vi.fn();
const mockDisable = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    mfa: {
      getMethod: (...a: unknown[]) => mockGetMethod(...a),
      getBackupCodes: (...a: unknown[]) => mockGetBackupCodes(...a),
      enableTotp: (...a: unknown[]) => mockEnableTotp(...a),
      disable: (...a: unknown[]) => mockDisable(...a),
    },
  },
  MfaMethod: class {},
}));

import { MfaSettings } from '../components/admin/MfaSettings';

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleMfaEnabled = {
  id: 'mfa_1',
  user_id: 'u1',
  method_type: 'totp',
  totp_secret: Array.from(
    { length: 16 },
    () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)],
  ).join(''),
  is_enabled: true,
  created_at: 1000,
  updated_at: 1000,
};

const sampleBackupCodes = [
  { id: 'bc_1', user_id: 'u1', code_hash: 'ABCD1234', is_used: false, created_at: 1000 },
  { id: 'bc_2', user_id: 'u1', code_hash: 'EFGH5678', is_used: false, created_at: 1000 },
  { id: 'bc_3', user_id: 'u1', code_hash: 'IJKL9012', is_used: true, created_at: 1000 },
];

function renderMfaSettings(userId: string | null = 'u1') {
  return render(<MfaSettings userId={userId} />);
}

describe('MfaSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMethod.mockResolvedValue(null); // default: no MFA
    mockGetBackupCodes.mockResolvedValue([]);
    // Mock crypto.getRandomValues
    vi.stubGlobal('crypto', {
      ...crypto,
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i % 256;
        }
        return arr;
      },
    });
    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => {
        if (key === 'sw_user_email') return 'test@example.com';
        return null;
      },
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('renders the section header', async () => {
    renderMfaSettings();
    await waitFor(() => {
      expect(screen.getByText(/Multi-Factor Authentication/)).toBeInTheDocument();
    });
  });

  it('calls api.mfa.getMethod on mount', () => {
    renderMfaSettings();
    expect(mockGetMethod).toHaveBeenCalledWith('u1');
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  it('shows loading spinner while fetching', () => {
    mockGetMethod.mockReturnValue(new Promise(() => {}));
    renderMfaSettings();
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  // ─── Disabled state (no MFA configured) ──────────────────────────────────

  it('shows MFA is not configured when method is null', async () => {
    renderMfaSettings();
    await waitFor(() => {
      expect(screen.getByText('MFA is not configured')).toBeInTheDocument();
    });
  });

  it('shows Enable MFA button when not configured', async () => {
    renderMfaSettings();
    await waitFor(() => {
      expect(screen.getByText('Enable MFA')).toBeInTheDocument();
    });
  });

  // ─── Enabled state ──────────────────────────────────────────────────────

  it('shows MFA is enabled when method exists', async () => {
    mockGetMethod.mockResolvedValue(sampleMfaEnabled);
    mockGetBackupCodes.mockResolvedValue(sampleBackupCodes);
    renderMfaSettings();
    await waitFor(() => {
      expect(screen.getByText('MFA is enabled')).toBeInTheDocument();
    });
  });

  it('shows backup codes count when MFA enabled', async () => {
    mockGetMethod.mockResolvedValue(sampleMfaEnabled);
    mockGetBackupCodes.mockResolvedValue(sampleBackupCodes);
    renderMfaSettings();
    await waitFor(() => {
      // 2 unused backup codes (bc_3 is used)
      expect(screen.getByText(/2 unused backup codes/)).toBeInTheDocument();
    });
  });

  it('shows Disable MFA button when enabled', async () => {
    mockGetMethod.mockResolvedValue(sampleMfaEnabled);
    mockGetBackupCodes.mockResolvedValue(sampleBackupCodes);
    renderMfaSettings();
    await waitFor(() => {
      expect(screen.getByText('Disable MFA')).toBeInTheDocument();
    });
  });

  it('shows TOTP method info when enabled', async () => {
    mockGetMethod.mockResolvedValue(sampleMfaEnabled);
    mockGetBackupCodes.mockResolvedValue(sampleBackupCodes);
    renderMfaSettings();
    await waitFor(() => {
      // Look for the method type label specifically
      expect(screen.getByText(/Method:/)).toBeInTheDocument();
    });
  });

  // ─── Setup dialog ───────────────────────────────────────────────────────

  it('opens setup dialog when Enable MFA clicked', async () => {
    renderMfaSettings();
    await waitFor(() => expect(screen.getByText('Enable MFA')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Enable MFA'));
    expect(screen.getByText('Enable MFA (TOTP)')).toBeInTheDocument();
  });

  it('shows QR code image in setup dialog', async () => {
    renderMfaSettings();
    await waitFor(() => expect(screen.getByText('Enable MFA')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Enable MFA'));
    const qrImg = document.querySelector("img[alt='TOTP QR Code']");
    expect(qrImg).toBeInTheDocument();
  });

  it('shows TOTP secret in setup dialog', async () => {
    renderMfaSettings();
    await waitFor(() => expect(screen.getByText('Enable MFA')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Enable MFA'));
    // The secret is generated from the mocked getRandomValues
    expect(screen.getByText(/^[A-Z2-7]{20,}/)).toBeInTheDocument();
  });

  it('shows backup codes in setup dialog', async () => {
    renderMfaSettings();
    await waitFor(() => expect(screen.getByText('Enable MFA')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Enable MFA'));
    expect(screen.getByText(/Save these backup codes/)).toBeInTheDocument();
    // Should show 8 backup codes
    const codeEls = document.querySelectorAll('code');
    expect(codeEls.length).toBeGreaterThanOrEqual(8);
  });

  it('has verify code input field', async () => {
    renderMfaSettings();
    await waitFor(() => expect(screen.getByText('Enable MFA')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Enable MFA'));
    const codeInput = screen.getByPlaceholderText('000000');
    expect(codeInput).toBeInTheDocument();
  });

  it('Verify & Enable button is disabled when code is not 6 digits', async () => {
    renderMfaSettings();
    await waitFor(() => expect(screen.getByText('Enable MFA')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Enable MFA'));
    const verifyBtn = screen.getByText('Verify & Enable');
    expect(verifyBtn).toBeDisabled();
    // Type a 6-digit code
    const codeInput = screen.getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    expect(verifyBtn).not.toBeDisabled();
  });

  it('calls api.mfa.enableTotp on verify', async () => {
    mockEnableTotp.mockResolvedValue(undefined);
    renderMfaSettings();
    await waitFor(() => expect(screen.getByText('Enable MFA')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Enable MFA'));
    const codeInput = screen.getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify & Enable'));
    await waitFor(() => {
      expect(mockEnableTotp).toHaveBeenCalledWith('u1', expect.any(String), expect.any(Array));
    });
  });

  it('closes setup dialog on Cancel', async () => {
    renderMfaSettings();
    await waitFor(() => expect(screen.getByText('Enable MFA')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Enable MFA'));
    await waitFor(() => expect(screen.getByText('Enable MFA (TOTP)')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Enable MFA (TOTP)')).not.toBeInTheDocument();
  });

  it('shows verify becomes enabled with 6-digit code', async () => {
    renderMfaSettings();
    await waitFor(() => expect(screen.getByText('Enable MFA')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Enable MFA'));
    const codeInput = screen.getByPlaceholderText('000000');
    const verifyBtn = screen.getByText('Verify & Enable');
    expect(verifyBtn).toBeDisabled();
    fireEvent.change(codeInput, { target: { value: '123456' } });
    expect(verifyBtn).not.toBeDisabled();
  });

  // ─── Disable MFA ────────────────────────────────────────────────────────

  it('calls api.mfa.disable on confirm', async () => {
    mockGetMethod.mockResolvedValue(sampleMfaEnabled);
    mockGetBackupCodes.mockResolvedValue(sampleBackupCodes);
    mockDisable.mockResolvedValue(undefined);

    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmMock);

    renderMfaSettings();
    await waitFor(() => expect(screen.getByText('MFA is enabled')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Disable MFA'));
    await waitFor(() => {
      expect(mockDisable).toHaveBeenCalledWith('u1');
    });
    vi.unstubAllGlobals();
  });

  // ─── Error state ─────────────────────────────────────────────────────────

  it('handles api.mfa.getMethod error gracefully', async () => {
    mockGetMethod.mockRejectedValue(new Error('Network error'));
    renderMfaSettings();
    await waitFor(() => {
      expect(screen.getByText('MFA is not configured')).toBeInTheDocument();
    });
  });

  it('shows error on enable failure', async () => {
    mockEnableTotp.mockRejectedValue(new Error('Enable failed'));
    renderMfaSettings();
    await waitFor(() => expect(screen.getByText('Enable MFA')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Enable MFA'));
    const codeInput = screen.getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify & Enable'));
    await waitFor(() => {
      // Error appears in the dialog — the first match is sufficient
      expect(screen.getAllByText(/Failed to enable MFA/).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── userId null ─────────────────────────────────────────────────────────

  it('shows MFA not configured when userId is null', async () => {
    renderMfaSettings(null);
    expect(mockGetMethod).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('MFA is not configured')).toBeInTheDocument();
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations in disabled state', async () => {
    const { container } = renderMfaSettings();
    await waitFor(() => expect(screen.getByText('MFA is not configured')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in enabled state', async () => {
    mockGetMethod.mockResolvedValue(sampleMfaEnabled);
    mockGetBackupCodes.mockResolvedValue(sampleBackupCodes);
    const { container } = renderMfaSettings();
    await waitFor(() => expect(screen.getByText('MFA is enabled')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in setup dialog', async () => {
    const { container } = renderMfaSettings();
    await waitFor(() => expect(screen.getByText('Enable MFA')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Enable MFA'));
    await waitFor(() => expect(screen.getByText('Enable MFA (TOTP)')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
