import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { callReducerLocal } from '../lib/helpers';
import { Loader2 } from 'lucide-react';

export default function SamlCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Completing SAML sign-in...');

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const samlResponse = params.get('SAMLResponse');
        const relayState = params.get('RelayState');
        if (!samlResponse) {
          setStatus('No SAMLResponse received.');
          return;
        }

        setStatus('Parsing SAML response...');
        let decodedXml: string;
        try {
          const binaryStr = atob(samlResponse);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const pako = await import('pako');
          try {
            decodedXml = pako.inflate(bytes, { to: 'string' }) as string;
          } catch {
            decodedXml = new TextDecoder().decode(bytes);
          }
        } catch {
          setStatus('Failed to decode SAMLResponse.');
          return;
        }

        const xmlDoc = new DOMParser().parseFromString(decodedXml, 'text/xml');
        let providerId = relayState || '';
        if (!providerId) {
          const issuerEl = xmlDoc.querySelector('Issuer');
          if (issuerEl?.textContent) {
            const providers = await api.saml.list();
            const matched = providers.find((p: unknown) => p.entity_id === issuerEl!.textContent);
            if (matched) providerId = matched.id;
          }
        }
        if (!providerId) {
          setStatus('Could not determine SAML provider.');
          return;
        }

        const attributes: Record<string, string> = {};
        const nameIdEl = xmlDoc.querySelector('Subject NameID');
        if (nameIdEl?.textContent) attributes['nameId'] = nameIdEl.textContent;
        const attStmt = xmlDoc.querySelector('AttributeStatement');
        if (attStmt) {
          attStmt.querySelectorAll('Attribute').forEach((attr) => {
            const name = attr.getAttribute('Name') || attr.getAttribute('FriendlyName') || '';
            const value = attr.querySelector('AttributeValue')?.textContent || '';
            if (name && value) attributes[name] = value;
          });
        }

        setStatus('Signing in...');
        const provider = await api.saml.get(providerId);
        if (!provider) {
          setStatus('SAML provider not found.');
          return;
        }
        let mapping: Record<string, string> = { email: 'email', name: 'name' };
        try {
          mapping = JSON.parse(provider.attribute_mapping);
        } catch {}

        const email =
          attributes[mapping.email] || attributes['email'] || attributes['nameId'] || '';
        const displayName =
          attributes[mapping.name] || attributes['name'] || email?.split('@')[0] || 'User';
        if (!email) {
          setStatus('Could not determine email.');
          return;
        }

        const existing = await api.users.getByEmail(email);
        if (existing) localStorage.setItem('sw_user_id', existing.id);
        else if (provider.auto_register) {
          const id = 'user_' + Math.random().toString(36).slice(2, 8);
          await callReducerLocal('register_user', [
            id,
            displayName,
            email,
            crypto.randomUUID(),
            'member',
          ]);
          localStorage.setItem('sw_user_id', id);
        } else {
          setStatus(`No account found. Auto-registration disabled.`);
          return;
        }
        navigate('/', { replace: true });
      } catch (err: unknown) {
        setStatus(`Error: ${err.message || err}`);
      }
    })();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
