// Admin tab: change each feature flag's mode and allowlist.
// Plain markup on purpose — restyle with your existing admin panel classes.

import { useEffect, useState } from 'react';
import { getAdminFeatureFlags, updateFeatureFlag } from '../../lib/api';
import { useFeatureFlagStore } from '../../hooks/useFeatureFlags';

const DESCRIPTIONS = {
  pro_role: 'Pro role assignment and checks',
  terms_gate: 'Versioned Terms re-acceptance',
  paywall: '5 lifetime on-demand signals, then paywall',
  trial: '7-day trial limits on AI Signals, chat, Auto-trader',
  billing: 'Pricing page, Stripe checkout and portal',
  coupons: 'Coupon redemption',
  autotrader_liquidation: 'Convert Auto-trader holdings to cash when access ends',
};

const parseUids = (text) =>
  [...new Set(text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))];

export default function FeatureFlagsPanel() {
  const [flags, setFlags] = useState(null);
  const [modes, setModes] = useState(['off', 'allowlist', 'on']);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const refreshMine = useFeatureFlagStore((s) => s.fetchFlags);

  const load = async () => {
    setError(null);
    try {
      const res = await getAdminFeatureFlags();
      setFlags(res.flags);
      if (res.modes) setModes(res.modes);
      setDrafts(
        Object.fromEntries(
          Object.entries(res.flags).map(([k, v]) => [k, { mode: v.mode, uidsText: v.uids.join('\n') }]),
        ),
      );
    } catch (e) {
      setError(e?.message || 'Failed to load flags');
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (name) => {
    const d = drafts[name];
    if (d.mode === 'on' && !window.confirm(`Turn "${name}" ON for every user?`)) return;
    setSaving(name);
    setError(null);
    try {
      await updateFeatureFlag(name, { mode: d.mode, uids: parseUids(d.uidsText) });
      await load();
      refreshMine(); // so your own UI reflects the change right away
    } catch (e) {
      setError(e?.message || `Failed to save ${name}`);
    } finally {
      setSaving(null);
    }
  };

  if (!flags) return <div>{error || 'Loading flags…'}</div>;

  return (
    <div>
      <h3>Feature flags</h3>
      <p style={{ opacity: 0.7 }}>
        off = nobody · allowlist = only listed UIDs · on = everyone. Changes apply within 60 seconds.
      </p>
      {error && <div style={{ color: 'var(--red, #e5484d)' }}>{error}</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Flag</th>
            <th align="left">Mode</th>
            <th align="left">Allowlist UIDs</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {Object.keys(flags).map((name) => {
            const d = drafts[name] || { mode: 'off', uidsText: '' };
            const dirty =
              d.mode !== flags[name].mode ||
              parseUids(d.uidsText).join() !== flags[name].uids.join();
            return (
              <tr key={name} style={{ borderTop: '1px solid var(--border, #333)' }}>
                <td style={{ padding: 8, verticalAlign: 'top' }}>
                  <code>{name}</code>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{DESCRIPTIONS[name]}</div>
                </td>
                <td style={{ padding: 8, verticalAlign: 'top' }}>
                  <select
                    value={d.mode}
                    onChange={(e) => setDrafts({ ...drafts, [name]: { ...d, mode: e.target.value } })}
                  >
                    {modes.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                <td style={{ padding: 8, verticalAlign: 'top' }}>
                  <textarea
                    rows={2}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
                    placeholder="one UID per line"
                    disabled={d.mode !== 'allowlist'}
                    value={d.uidsText}
                    onChange={(e) => setDrafts({ ...drafts, [name]: { ...d, uidsText: e.target.value } })}
                  />
                </td>
                <td style={{ padding: 8, verticalAlign: 'top' }}>
                  <button disabled={!dirty || saving === name} onClick={() => save(name)}>
                    {saving === name ? 'Saving…' : 'Save'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
