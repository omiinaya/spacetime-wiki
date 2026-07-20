import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const __mockApi = vi.hoisted(() => ({
  saml: { list: vi.fn(), get: vi.fn() },
  users: { getByEmail: vi.fn() },
}));

vi.mock('../../lib/api', () => ({ api: __mockApi }));

const mockCallReducer = vi.hoisted(() => vi.fn());
vi.mock('../../lib/helpers', () => ({
  callReducerLocal: mockCallReducer,
}));

let store: Record<string, string> = {};
let setItemSpy: Mock;

import SamlCallback from '../../pages/SamlCallback';

// Helper to create a minimal base64 SAMLResponse containing attributes
function makeSamlResponse(attrs: Record<string, string>, nameId?: string): string {
  const attStmt = Object.entries(attrs)
    .map(
      ([k, v]) =>
        `<saml:Attribute Name="${k}"><saml:AttributeValue>${v}</saml:AttributeValue></saml:Attribute>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
  <saml:Issuer>https://saml.idp.example.com</saml:Issuer>
  <saml:Assertion>
    <saml:Subject>
      <saml:NameID>${nameId || 'user@saml.idp.com'}</saml:NameID>
    </saml:Subject>
    <saml:AttributeStatement>
${attStmt}
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;
  return btoa(xml);
}

describe('SamlCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => store[key] ?? null);
    setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation((key: string, value: string) => {
        store[key] = value;
      });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete store[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows error when no SAMLResponse param', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation(() => null);

    render(
      <BrowserRouter>
        <SamlCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('No SAMLResponse received.')).toBeTruthy();
    });
  });

  it('shows error when SAMLResponse is invalid base64', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'SAMLResponse') return '!!!invalid-base64!!!';
      return null;
    });

    render(
      <BrowserRouter>
        <SamlCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Failed to decode SAMLResponse.')).toBeTruthy();
    });
  });

  it('shows error when provider cannot be determined', async () => {
    // Build a SAMLResponse with an Issuer that doesn't match any SAML provider
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
  <saml:Issuer>https://unknown.idp.com</saml:Issuer>
</samlp:Response>`;
    const samlResponse = btoa(xml);

    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'SAMLResponse') return samlResponse;
      return null;
    });

    __mockApi.saml.list.mockResolvedValue([{ id: 'saml-okta', entity_id: 'https://okta.com' }]);

    render(
      <BrowserRouter>
        <SamlCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Could not determine SAML provider.')).toBeTruthy();
    });
  });

  it('uses RelayState as providerId when provided', async () => {
    const samlResponse = btoa(`<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
  <saml:Issuer>https://some.idp.com</saml:Issuer>
</samlp:Response>`);

    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'SAMLResponse') return samlResponse;
      if (key === 'RelayState') return 'saml-direct';
      return null;
    });

    __mockApi.saml.get.mockResolvedValue({
      id: 'saml-direct',
      auto_register: false,
      attribute_mapping: '{"email": "email", "name": "displayName"}',
    });

    render(
      <BrowserRouter>
        <SamlCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(__mockApi.saml.get).toHaveBeenCalledWith('saml-direct');
    });
  });

  it('shows error when SAML provider not found by get()', async () => {
    const samlResponse = btoa(`<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
  <saml:Issuer>https://idp.com</saml:Issuer>
</samlp:Response>`);

    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'SAMLResponse') return samlResponse;
      if (key === 'RelayState') return 'saml-missing';
      return null;
    });

    __mockApi.saml.get.mockResolvedValue(null);

    render(
      <BrowserRouter>
        <SamlCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('SAML provider not found.')).toBeTruthy();
    });
  });

  it('shows error when no email in attributes', async () => {
    // Build a SAML response with NO Subject/NameID and no email attributes
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
  <saml:Issuer>https://saml.idp.example.com</saml:Issuer>
  <saml:Assertion>
    <saml:AttributeStatement>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;
    const resp = btoa(xml);

    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'SAMLResponse') return resp;
      return null;
    });

    __mockApi.saml.list.mockResolvedValue([
      { id: 'saml-1', entity_id: 'https://saml.idp.example.com' },
    ]);
    __mockApi.saml.get.mockResolvedValue({
      id: 'saml-1',
      auto_register: true,
      attribute_mapping: '{"email": "mail", "name": "name"}',
    });

    render(
      <BrowserRouter>
        <SamlCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Could not determine email.')).toBeTruthy();
    });
  });

  it('signs in existing user via NameID', async () => {
    const resp = makeSamlResponse({}, 'existing@saml.idp.com');

    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'SAMLResponse') return resp;
      return null;
    });

    __mockApi.saml.list.mockResolvedValue([
      { id: 'saml-1', entity_id: 'https://saml.idp.example.com' },
    ]);
    __mockApi.saml.get.mockResolvedValue({
      id: 'saml-1',
      auto_register: true,
      attribute_mapping: '{"email": "mail", "name": "displayName"}',
    });
    __mockApi.users.getByEmail.mockResolvedValue({ id: 'existing-user' });

    render(
      <BrowserRouter>
        <SamlCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
    expect(setItemSpy).toHaveBeenCalledWith('sw_user_id', 'existing-user');
  });

  it('registers new user when auto_register is true', async () => {
    const resp = makeSamlResponse({ email: 'new@saml.idp.com', name: 'SAML User' });

    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'SAMLResponse') return resp;
      return null;
    });

    __mockApi.saml.list.mockResolvedValue([
      { id: 'saml-1', entity_id: 'https://saml.idp.example.com' },
    ]);
    __mockApi.saml.get.mockResolvedValue({
      id: 'saml-1',
      auto_register: true,
      attribute_mapping: '{"email": "email", "name": "name"}',
    });
    __mockApi.users.getByEmail.mockResolvedValue(null);

    render(
      <BrowserRouter>
        <SamlCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(mockCallReducer).toHaveBeenCalled();
    });
    expect(mockCallReducer.mock.calls[0][0]).toBe('register_user');
    expect(mockCallReducer.mock.calls[0][1][2]).toBe('new@saml.idp.com');
  });

  it("shows error when auto_register is false and user doesn't exist", async () => {
    const resp = makeSamlResponse({ email: 'new@saml.idp.com' });

    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'SAMLResponse') return resp;
      return null;
    });

    __mockApi.saml.list.mockResolvedValue([
      { id: 'saml-1', entity_id: 'https://saml.idp.example.com' },
    ]);
    __mockApi.saml.get.mockResolvedValue({
      id: 'saml-1',
      auto_register: false,
      attribute_mapping: '{"email": "email", "name": "name"}',
    });
    __mockApi.users.getByEmail.mockResolvedValue(null);

    render(
      <BrowserRouter>
        <SamlCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/No account found/)).toBeTruthy();
    });
  });

  it('shows error on fetch failure', async () => {
    const resp = makeSamlResponse({});

    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'SAMLResponse') return resp;
      return null;
    });

    __mockApi.saml.list.mockRejectedValue(new Error('API unavailable'));

    render(
      <BrowserRouter>
        <SamlCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Error: API unavailable')).toBeTruthy();
    });
  });

  it('uses mapped attribute names from provider config', async () => {
    // Test with non-standard attribute names
    const resp = makeSamlResponse({
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'mapped@idp.com',
    });

    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'SAMLResponse') return resp;
      return null;
    });

    __mockApi.saml.list.mockResolvedValue([
      { id: 'saml-1', entity_id: 'https://saml.idp.example.com' },
    ]);
    __mockApi.saml.get.mockResolvedValue({
      id: 'saml-1',
      auto_register: true,
      attribute_mapping: JSON.stringify({
        email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        name: 'name',
      }),
    });
    __mockApi.users.getByEmail.mockResolvedValue({ id: 'mapped-user' });

    render(
      <BrowserRouter>
        <SamlCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
    expect(setItemSpy).toHaveBeenCalledWith('sw_user_id', 'mapped-user');
  });
});
