/**
 * pages/IpcDemoPage.tsx
 * Live demonstration of every IPC pattern.
 *
 * This page is NOT part of the main app navigation — it's a dev/test page.
 * Access it by adding a route: <Route path="/ipc-demo" element={<IpcDemoPage />} />
 *
 * Demonstrates:
 *   1. useIpc hook — automatic loading/error state
 *   2. ipc.app.getAppInfo() — simple fetch on mount
 *   3. ipc.app.ping() — interactive call with input
 *   4. ipc.system.getSystemInfo() — system data
 *   5. ipcInvokeSafe — inline safe call without try/catch
 *   6. IpcCallError handling — typed error codes
 */

import React, { useEffect, useState } from 'react';
import { ipc, ipcInvokeSafe, IpcCallError, CMD } from '@/ipc';
import { useIpc } from '@/hooks';
import type { AppInfo, PingResponse, SystemInfo } from '@/ipc';

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
    <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
      {title}
    </h3>
    {children}
  </div>
);

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <pre className="bg-slate-950 rounded-lg p-3 text-xs text-slate-300 overflow-auto">
    {children}
  </pre>
);

// ── Main page ─────────────────────────────────────────────────────────────────
export const IpcDemoPage: React.FC = () => {
  // ── 1. useIpc hook — fetch app info on mount ──────────────────────────────
  const appInfoIpc = useIpc<AppInfo>({ toastOnError: true });

  useEffect(() => {
    appInfoIpc.run(() => ipc.app.getAppInfo());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. useIpc hook — interactive ping ─────────────────────────────────────
  const pingIpc = useIpc<PingResponse>();
  const [pingMsg, setPingMsg] = useState('hello from TFC ERP');

  // ── 3. useIpc hook — system info ──────────────────────────────────────────
  const systemIpc = useIpc<SystemInfo>();

  // ── 4. ipcInvokeSafe — inline safe call ───────────────────────────────────
  const [safeResult, setSafeResult] = useState<string>('');

  const handleSafeCall = async () => {
    const { data, error, ok } = await ipcInvokeSafe<AppInfo>(
      CMD.app.getAppInfo,
      undefined,
      { name: 'DEV', version: '0.0.0', tauri_version: 'N/A', debug: true, build_stamp: 'dev' },
    );
    if (ok && data) {
      setSafeResult(`✓ ${data.name} v${data.version}`);
    } else {
      setSafeResult(`✗ ${error?.code}: ${error?.message}`);
    }
  };

  // ── 5. IpcCallError typed handling ────────────────────────────────────────
  const [errorDemo, setErrorDemo] = useState<string>('');

  const handleErrorDemo = async () => {
    try {
      // Intentionally call a non-existent file to trigger NOT_FOUND
      await ipc.file.readTextFile({ path: '/this/does/not/exist.txt' });
    } catch (err) {
      if (err instanceof IpcCallError) {
        setErrorDemo(`IpcCallError caught!\ncode: ${err.code}\nmessage: ${err.message}`);
      } else {
        setErrorDemo(`Unknown error: ${String(err)}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">IPC Demo</h1>
          <p className="text-slate-500 text-sm mt-1">
            Live demonstration of the Tauri IPC architecture.
          </p>
        </div>

        {/* ── 1. App Info ─────────────────────────────────────────────────── */}
        <Section title="1. useIpc — fetch on mount">
          <p className="text-xs text-slate-500">
            <code className="text-emerald-400">ipc.app.getAppInfo()</code> called on mount via{' '}
            <code className="text-emerald-400">useIpc</code> hook.
          </p>
          {appInfoIpc.loading && (
            <p className="text-slate-400 text-sm animate-pulse">Loading…</p>
          )}
          {appInfoIpc.error && (
            <p className="text-red-400 text-sm">Error: {appInfoIpc.error.message}</p>
          )}
          {appInfoIpc.data && (
            <Code>{JSON.stringify(appInfoIpc.data, null, 2)}</Code>
          )}
        </Section>

        {/* ── 2. Ping ─────────────────────────────────────────────────────── */}
        <Section title="2. useIpc — interactive ping">
          <p className="text-xs text-slate-500">
            <code className="text-emerald-400">ipc.app.ping(message)</code> — round-trip IPC call.
          </p>
          <div className="flex gap-2">
            <input
              value={pingMsg}
              onChange={(e) => setPingMsg(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={() => pingIpc.run(() => ipc.app.ping(pingMsg))}
              disabled={pingIpc.loading}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {pingIpc.loading ? 'Pinging…' : 'Ping'}
            </button>
          </div>
          {pingIpc.data && (
            <Code>{JSON.stringify(pingIpc.data, null, 2)}</Code>
          )}
        </Section>

        {/* ── 3. System Info ──────────────────────────────────────────────── */}
        <Section title="3. useIpc — system info">
          <p className="text-xs text-slate-500">
            <code className="text-emerald-400">ipc.system.getSystemInfo()</code>
          </p>
          <button
            onClick={() => systemIpc.run(() => ipc.system.getSystemInfo())}
            disabled={systemIpc.loading}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm transition-colors"
          >
            {systemIpc.loading ? 'Loading…' : 'Get System Info'}
          </button>
          {systemIpc.data && (
            <Code>{JSON.stringify(systemIpc.data, null, 2)}</Code>
          )}
        </Section>

        {/* ── 4. ipcInvokeSafe ────────────────────────────────────────────── */}
        <Section title="4. ipcInvokeSafe — no try/catch">
          <p className="text-xs text-slate-500">
            Returns <code className="text-emerald-400">{'{ data, error, ok }'}</code> — never throws.
          </p>
          <button
            onClick={handleSafeCall}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm transition-colors"
          >
            Run Safe Call
          </button>
          {safeResult && <Code>{safeResult}</Code>}
        </Section>

        {/* ── 5. IpcCallError ─────────────────────────────────────────────── */}
        <Section title="5. IpcCallError — typed error handling">
          <p className="text-xs text-slate-500">
            Triggers a <code className="text-emerald-400">NOT_FOUND</code> error by reading a missing file.
          </p>
          <button
            onClick={handleErrorDemo}
            className="px-4 py-2 rounded-lg bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-sm transition-colors"
          >
            Trigger NOT_FOUND Error
          </button>
          {errorDemo && <Code>{errorDemo}</Code>}
        </Section>
      </div>
    </div>
  );
};
