import { describe, it, expect } from 'vitest';
import {
  mapPage,
  mapCollection,
  mapUser,
  mapComment,
  mapCommentReaction,
  mapTag,
  mapAttachment,
  mapCollectionMember,
  mapShareLink,
  mapApiKey,
  mapPagePermission,
  mapAuditEvent,
  mapNotification,
  mapDbBase,
  mapDbColumn,
  mapDbCell,
  mapWebhook,
  mapAccessRequest,
} from '../lib/api/mappers';

/**
 * Contract tests for the positional-array mappers.
 *
 * sqlQuery() returns rows as positional arrays (`unknown[][]`) indexed by
 * SELECT-column position. Each mapper must read row[i] in the exact table
 * column order. These tests pin that contract with the column order taken
 * from the live STDB schema, so a mapper drift (wrong index) is caught
 * here even though the rest of the app treats mappers as opaque.
 *
 * 2026-08-04 bug lane reference: AdminDashboard read rows[0].c and
 * AccessRequestPanel read rows[0].title off positional arrays — every stat
 * card and every access-request label silently rendered empty/Unknown.
 * These tests exist so that class of regression is caught at the mapper.
 */
describe('mappers — positional-array column contract', () => {
  it('mapPage reads id…direction (22 cols)', () => {
    const p = mapPage([
      'p1',
      'Title',
      'slug',
      '<h1>hi</h1>',
      'hi',
      'c1',
      null,
      'published',
      '📄',
      'red',
      true,
      true,
      false,
      null,
      3,
      'u1',
      'u2',
      1700000000,
      1700000001,
      1700000002,
      null,
      'ltr',
    ]);
    expect(p.id).toBe('p1');
    expect(p.title).toBe('Title');
    expect(p.slug).toBe('slug');
    expect(p.content).toBe('<h1>hi</h1>');
    expect(p.text_content).toBe('hi');
    expect(p.collection_id).toBe('c1');
    expect(p.parent_page_id).toBe('');
    expect(p.status).toBe('published');
    expect(p.icon).toBe('📄');
    expect(p.color).toBe('red');
    expect(p.full_width).toBe(true);
    expect(p.is_pinned).toBe(true);
    expect(p.is_template).toBe(false);
    expect(p.sort_order).toBe(3);
    expect(p.created_by).toBe('u1');
    expect(p.updated_by).toBe('u2');
    expect(p.created_at).toBe(1700000000);
    expect(p.updated_at).toBe(1700000001);
    expect(p.published_at).toBe(1700000002);
    expect(p.direction).toBe('ltr');
  });

  it('mapCollection reads id…updated_at (11 cols)', () => {
    const c = mapCollection([
      'c1',
      'Docs',
      'docs',
      'repo',
      null,
      '📚',
      'blue',
      1,
      'u1',
      1700000,
      1700001,
    ]);
    expect(c.id).toBe('c1');
    expect(c.name).toBe('Docs');
    expect(c.slug).toBe('docs');
    expect(c.description).toBe('repo');
    expect(c.parent_id).toBe('');
    expect(c.icon).toBe('📚');
    expect(c.color).toBe('blue');
    expect(c.sort_order).toBe(1);
    expect(c.created_by).toBe('u1');
    expect(c.created_at).toBe(1700000);
    expect(c.updated_at).toBe(1700001);
  });

  it('mapUser reads id…created_at (6 cols)', () => {
    const u = mapUser(['u1', 'Alice', 'a@x.io', 'admin', 'https://a', 1700000]);
    expect(u.id).toBe('u1');
    expect(u.name).toBe('Alice');
    expect(u.email).toBe('a@x.io');
    expect(u.role).toBe('admin');
    expect(u.avatar_url).toBe('https://a');
    expect(u.created_at).toBe(1700000);
  });

  it('mapComment reads id…updated_at (9 cols)', () => {
    const c = mapComment(['cm1', 'p1', null, 'u1', 'hello', '{"x":1}', false, 1700000, 1700001]);
    expect(c.id).toBe('cm1');
    expect(c.page_id).toBe('p1');
    expect(c.parent_comment_id).toBe('');
    expect(c.user_id).toBe('u1');
    expect(c.body).toBe('hello');
    expect(c.text_anchor).toBe('{"x":1}');
    expect(c.is_resolved).toBe(false);
    expect(c.created_at).toBe(1700000);
    expect(c.updated_at).toBe(1700001);
  });

  it('mapShareLink reads id…brand_logo_url (10 cols, nullable brand fields)', () => {
    const s = mapShareLink([
      'sl1',
      'p1',
      'tok',
      'u1',
      0,
      1700000,
      3,
      true,
      'My Wiki',
      'https://logo',
    ]);
    expect(s.id).toBe('sl1');
    expect(s.page_id).toBe('p1');
    expect(s.token).toBe('tok');
    expect(s.created_by).toBe('u1');
    expect(s.expires_at).toBe(0);
    expect(s.created_at).toBe(1700000);
    expect(s.visit_count).toBe(3);
    expect(s.has_password).toBe(true);
    expect(s.brand_title).toBe('My Wiki');
    expect(s.brand_logo_url).toBe('https://logo');

    const nil = mapShareLink(['sl1', 'p1', 'tok', 'u1', 0, 1700000, 0, false, null, null]);
    expect(nil.brand_title).toBeNull();
    expect(nil.brand_logo_url).toBeNull();
  });

  it('mapAuditEvent reads id…created_at (7 cols)', () => {
    const a = mapAuditEvent(['ae1', 'page.create', 'u1', 'p1', 'Title', '{}', 1700000]);
    expect(a.id).toBe('ae1');
    expect(a.event_type).toBe('page.create');
    expect(a.actor_id).toBe('u1');
    expect(a.target_id).toBe('p1');
    expect(a.target_name).toBe('Title');
    expect(a.metadata).toBe('{}');
    expect(a.created_at).toBe(1700000);
  });

  it('mapNotification reads id…created_at (10 cols)', () => {
    const n = mapNotification([
      'n1',
      'u1',
      'mention',
      'p1',
      'A',
      'mention',
      'u2',
      '🔔',
      true,
      1700000,
    ]);
    expect(n.id).toBe('n1');
    expect(n.user_id).toBe('u1');
    expect(n.event_type).toBe('mention');
    expect(n.target_id).toBe('p1');
    expect(n.title).toBe('A');
    expect(n.message).toBe('mention');
    expect(n.actor_id).toBe('u2');
    expect(n.icon).toBe('🔔');
    expect(n.is_read).toBe(true);
    expect(n.created_at).toBe(1700000);
  });

  it('mapDbBase/mapDbColumn/mapDbCell read the inline-spreadsheet columns', () => {
    const b = mapDbBase(['db1', 'p1', 'Table', 'grid', 'u1', 1700000, 1700001]);
    expect(b.id).toBe('db1');
    expect(b.page_id).toBe('p1');
    expect(b.title).toBe('Table');
    expect(b.view_type).toBe('grid');
    expect(b.created_by).toBe('u1');
    expect(b.created_at).toBe(1700000);

    const col = mapDbColumn(['dcol1', 'db1', 'Name', 'text', {}, 0, 1700000, 1700001]);
    expect(col.id).toBe('dcol1');
    expect(col.base_id).toBe('db1');
    expect(col.name).toBe('Name');
    expect(col.field_type).toBe('text');

    const cell = mapDbCell(['dc1', 'r1', 'dcol1', 'val', 1700000, 1700001]);
    expect(cell.id).toBe('dc1');
    expect(cell.row_id).toBe('r1');
    expect(cell.column_id).toBe('dcol1');
    expect(cell.value).toBe('val');
  });

  it('mapWebhook reads id…updated_at (9 cols, secret kept)', () => {
    const w = mapWebhook([
      'w1',
      'New page',
      'https://hook',
      ['page.create'],
      true,
      'sec',
      'u1',
      1700000,
      1700001,
    ]);
    expect(w.id).toBe('w1');
    expect(w.name).toBe('New page');
    expect(w.url).toBe('https://hook');
    expect(w.events).toBe('page.create');
    expect(w.is_active).toBe(true);
    expect(w.secret).toBe('sec');
    expect(w.created_by).toBe('u1');
    expect(w.created_at).toBe(1700000);
  });

  it('mapTag / mapCommentReaction / mapAttachment / mapApiKey read small positional rows', () => {
    const t = mapTag(['t1', 'p1', 'tag', 1700000]);
    expect(t.id).toBe('t1');
    expect(t.page_id).toBe('p1');
    expect(t.name).toBe('tag');

    const r = mapCommentReaction(['cr1', 'cm1', 'u1', '👍', 1700000]);
    expect(r.id).toBe('cr1');
    expect(r.comment_id).toBe('cm1');
    expect(r.user_id).toBe('u1');
    expect(r.emoji).toBe('👍');
    expect(r.created_at).toBe(1700000);

    const att = mapAttachment(['att1', 'p1', 'file.png', 'image/png', 1024, 'key', 'u1', 1700000]);
    expect(att.id).toBe('att1');
    expect(att.page_id).toBe('p1');
    expect(att.filename).toBe('file.png');
    expect(att.mime_type).toBe('image/png');
    expect(att.size_bytes).toBe(1024);
    expect(att.storage_key).toBe('key');
    expect(att.uploaded_by).toBe('u1');
    expect(att.created_at).toBe(1700000);

    const k = mapApiKey(['ak1', 'u1', 'key', 'ak_', 0, 1700000, 0, false]);
    expect(k.id).toBe('ak1');
    expect(k.user_id).toBe('u1');
    expect(k.name).toBe('key');
    expect(k.key_prefix).toBe('ak_');
    expect(k.is_revoked).toBe(false);
  });

  it('mapPagePermission / mapCollectionMember / mapAccessRequest readers', () => {
    const pp = mapPagePermission(['pp1', 'p1', 'u1', null, 'editor', 1700000]);
    expect(pp.id).toBe('pp1');
    expect(pp.page_id).toBe('p1');
    expect(pp.user_id).toBe('u1');
    expect(pp.group_id).toBe('');
    expect(pp.role).toBe('editor');
    expect(pp.created_at).toBe(1700000);

    const cm = mapCollectionMember(['m1', 'c1', 'u1', 'admin', 'u2', 1700000]);
    expect(cm.id).toBe('m1');
    expect(cm.collection_id).toBe('c1');
    expect(cm.user_id).toBe('u1');
    expect(cm.role).toBe('admin');
    expect(cm.added_by).toBe('u2');

    const ar = mapAccessRequest(['req1', 'p1', 'u1', 'need access', 'pending', null, 0, 1700000]);
    expect(ar.id).toBe('req1');
    expect(ar.page_id).toBe('p1');
    expect(ar.requester_id).toBe('u1');
    expect(ar.reason).toBe('need access');
    expect(ar.status).toBe('pending');
    expect(ar.responded_by).toBe('');
    expect(ar.created_at).toBe(1700000);
  });
});
