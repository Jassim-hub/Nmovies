'use client';

import { useState, useEffect } from 'react';
import { Activity, AlertCircle, Bell, CheckCircle, RefreshCw, Send, Wifi, WifiOff } from 'lucide-react';

const PANEL_BASE = '/panel';

interface AppInfo {
  name?: string;
  players?: number; // legacy field for subscriber count
  messageable_players?: number;
  id?: string;
  errors?: string[];
}

interface DiagResult {
  ok: boolean;
  status: number;
  data?: AppInfo;
  error?: string;
}

interface SendResult {
  ok: boolean;
  status: number;
  requestPayload?: Record<string, unknown>;
  responseData?: {
    id?: string;
    recipients?: number;
    errors?: string[];
    [key: string]: unknown;
  };
  error?: string;
}

interface ServiceWorkerInfo {
  registered: boolean;
  scope?: string;
  scriptURL?: string;
  state?: string;
}

interface BrowserSubscription {
  supported: boolean;
  permission: string;
  subscriptionId: string | null;
  endpoint: string | null;
}

export default function DiagnosticsPage() {
  const [appInfo, setAppInfo] = useState<DiagResult | null>(null);
  const [subscriptions, setSubscriptions] = useState<DiagResult | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [swInfo, setSwInfo] = useState<ServiceWorkerInfo | null>(null);
  const [browserSub, setBrowserSub] = useState<BrowserSubscription | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [specificSubId, setSpecificSubId] = useState('');

  const setLoadingKey = (key: string, val: boolean) =>
    setLoading(prev => ({ ...prev, [key]: val }));

  // Check browser service worker and subscription state
  useEffect(() => {
    checkBrowserState();
  }, []);

  const checkBrowserState = async () => {
    const result: BrowserSubscription = {
      supported: 'serviceWorker' in navigator && 'PushManager' in window,
      permission: 'Notification' in window ? Notification.permission : 'unsupported',
      subscriptionId: null,
      endpoint: null,
    };

    try {
      if (result.supported) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          result.endpoint = sub.endpoint;
        }
      }
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      const win = window as any;
      // Try immediately first
      if (win.OneSignal?.User?.PushSubscription?.id) {
        result.subscriptionId = win.OneSignal.User.PushSubscription.id;
        setSpecificSubId(win.OneSignal.User.PushSubscription.id);
      } else {
        // Push into deferred queue — fires once SDK is ready
        win.OneSignalDeferred = win.OneSignalDeferred || [];
        win.OneSignalDeferred.push((OneSignal: any) => {
          const id = OneSignal?.User?.PushSubscription?.id;
          if (id) {
            setBrowserSub(prev => prev ? { ...prev, subscriptionId: id } : { ...result, subscriptionId: id });
            setSpecificSubId(id);
          }
        });
      }
    }

    setBrowserSub(result);

    // Get service worker info
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length > 0) {
          const sw = regs[0];
          setSwInfo({
            registered: true,
            scope: sw.scope,
            scriptURL: sw.active?.scriptURL || sw.installing?.scriptURL || sw.waiting?.scriptURL,
            state: sw.active?.state || 'waiting',
          });
        } else {
          setSwInfo({ registered: false });
        }
      } catch {
        setSwInfo({ registered: false });
      }
    }
  };

  const fetchAppInfo = async () => {
    setLoadingKey('app', true);
    try {
      const res = await fetch(`${PANEL_BASE}/api/notifications/diagnose?action=app-info`);
      const data = await res.json();
      setAppInfo(data);
    } catch (e) {
      setAppInfo({ ok: false, status: 0, error: String(e) });
    }
    setLoadingKey('app', false);
  };

  const fetchSubscriptions = async () => {
    setLoadingKey('subs', true);
    try {
      const res = await fetch(`${PANEL_BASE}/api/notifications/diagnose?action=subscriptions`);
      const data = await res.json();
      setSubscriptions(data);
    } catch (e) {
      setSubscriptions({ ok: false, status: 0, error: String(e) });
    }
    setLoadingKey('subs', false);
  };

  const sendTest = async (opts: { sendToAll?: boolean; subscriptionId?: string }) => {
    setLoadingKey('send', true);
    setSendResult(null);
    try {
      const res = await fetch(`${PANEL_BASE}/api/notifications/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      const data = await res.json();
      setSendResult(data);
    } catch (e) {
      setSendResult({ ok: false, status: 0, error: String(e) });
    }
    setLoadingKey('send', false);
  };

  const statusBadge = (ok: boolean, status: number) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
        ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
      }`}
    >
      {ok ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {status} {ok ? 'OK' : 'ERROR'}
    </span>
  );

  const card = (children: React.ReactNode, title: string, icon: React.ReactNode) => (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
        {icon}
        <h2 className="font-semibold text-white text-sm">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#E50914]" />
            Push Notification Diagnostics
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time tests using your OneSignal App ID:{' '}
            <code className="text-yellow-400 bg-white/10 px-1 rounded">30e1c461-bc97-4079-aa3d-874150082a38</code>
          </p>
        </div>

        {/* Browser State */}
        {card(
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Push API Supported</span>
              <span className={browserSub?.supported ? 'text-green-400' : 'text-red-400'}>
                {browserSub === null ? '...' : browserSub.supported ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Notification Permission</span>
              <span
                className={
                  browserSub?.permission === 'granted'
                    ? 'text-green-400'
                    : browserSub?.permission === 'denied'
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }
              >
                {browserSub?.permission ?? '...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Service Worker Registered</span>
              <span className={swInfo?.registered ? 'text-green-400' : 'text-red-400'}>
                {swInfo === null ? '...' : swInfo.registered ? '✅ Yes' : '❌ No — critical issue!'}
              </span>
            </div>
            {swInfo?.scriptURL && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-400 text-sm">SW Script</span>
                <code className="text-xs text-blue-300 break-all text-right">{swInfo.scriptURL}</code>
              </div>
            )}
            {swInfo?.scope && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-400 text-sm">SW Scope</span>
                <code className="text-xs text-blue-300">{swInfo.scope}</code>
              </div>
            )}
            <div className="flex items-start justify-between gap-4">
              <span className="text-gray-400 text-sm shrink-0">OneSignal Subscription ID</span>
              <code className="text-xs text-yellow-300 break-all text-right">
                {browserSub?.subscriptionId ?? '(none — this browser is NOT registered with OneSignal)'}
              </code>
            </div>
            <button
              onClick={checkBrowserState}
              className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>,
          'This Browser / Device',
          <Wifi className="w-4 h-4 text-blue-400" />
        )}

        {/* OneSignal App Info */}
        {card(
          <div className="space-y-3">
            {appInfo && (
              <>
                <div className="flex items-center gap-2">{statusBadge(appInfo.ok, appInfo.status)}</div>
                {appInfo.ok && appInfo.data && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">App Name</span>
                      <span className="text-white text-sm">{appInfo.data.name ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Total Subscribed Devices</span>
                      <span className="text-green-400 font-bold text-lg">
                        {appInfo.data.messageable_players ?? appInfo.data.players ?? '—'}
                      </span>
                    </div>
                  </>
                )}
                <pre className="mt-2 text-xs bg-black/40 p-3 rounded overflow-x-auto text-gray-300 max-h-48">
                  {JSON.stringify(appInfo.data ?? appInfo.error, null, 2)}
                </pre>
              </>
            )}
            <button
              onClick={fetchAppInfo}
              disabled={loading.app}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {loading.app ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              {appInfo ? 'Refresh' : 'Check OneSignal App'}
            </button>
          </div>,
          'OneSignal App Stats (API)',
          <Activity className="w-4 h-4 text-purple-400" />
        )}

        {/* Subscriptions */}
        {card(
          <div className="space-y-3">
            {subscriptions && (
              <>
                <div className="flex items-center gap-2">{statusBadge(subscriptions.ok, subscriptions.status)}</div>
                <pre className="mt-2 text-xs bg-black/40 p-3 rounded overflow-x-auto text-gray-300 max-h-64">
                  {JSON.stringify(subscriptions.data, null, 2)}
                </pre>
              </>
            )}
            <button
              onClick={fetchSubscriptions}
              disabled={loading.subs}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {loading.subs ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              {subscriptions ? 'Refresh' : 'List Subscriptions'}
            </button>
          </div>,
          'Registered Device Subscriptions',
          <Bell className="w-4 h-4 text-yellow-400" />
        )}

        {/* Send Test Notification */}
        {card(
          <div className="space-y-4">
            <p className="text-gray-400 text-xs">
              Send a real test push notification and see the complete raw API response from OneSignal.
            </p>

            {/* Send to all */}
            <button
              onClick={() => sendTest({ sendToAll: true })}
              disabled={loading.send}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#E50914] hover:bg-[#c20710] disabled:opacity-50 font-bold transition-colors"
            >
              {loading.send ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Test Push to ALL Subscribers
            </button>

            {/* Send to specific subscription ID */}
            <div className="flex gap-2">
              <input
                type="text"
                value={specificSubId}
                onChange={e => setSpecificSubId(e.target.value)}
                placeholder={browserSub?.subscriptionId ?? 'Enter OneSignal Subscription ID...'}
                className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => sendTest({ subscriptionId: specificSubId || browserSub?.subscriptionId || '' })}
                disabled={loading.send || (!specificSubId && !browserSub?.subscriptionId)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium transition-colors whitespace-nowrap"
              >
                Send to This Device
              </button>
            </div>

            {/* Raw API Response */}
            {sendResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">API Response</span>
                  {statusBadge(sendResult.ok, sendResult.status)}
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Request Payload Sent:</p>
                  <pre className="text-xs bg-black/40 p-3 rounded overflow-x-auto text-blue-300 max-h-48">
                    {JSON.stringify(sendResult.requestPayload, null, 2)}
                  </pre>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">OneSignal Response:</p>
                  <pre className={`text-xs bg-black/40 p-3 rounded overflow-x-auto max-h-48 ${
                    sendResult.ok ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {JSON.stringify(sendResult.responseData ?? sendResult.error, null, 2)}
                  </pre>
                </div>

                {sendResult.ok && sendResult.responseData?.recipients === 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-yellow-300 text-xs">
                      <strong>Recipients: 0</strong> — OneSignal accepted the request but has no subscribed devices
                      for this segment. This means users have not been captured by OneSignal even if they allowed
                      notifications in their browser. The <code>OneSignalSDKWorker.js</code> was likely missing or
                      incorrect when they first granted permission.
                    </p>
                  </div>
                )}

                {sendResult.ok && (sendResult.responseData?.recipients ?? 0) > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    <p className="text-green-300 text-xs">
                      ✅ Push delivered to <strong>{sendResult.responseData?.recipients}</strong> device(s).
                      Check the device now — the OS notification banner should appear!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>,
          'Send Test Notification',
          <Send className="w-4 h-4 text-red-400" />
        )}

        {/* Instructions */}
        {card(
          <div className="space-y-2 text-xs text-gray-400">
            <p>1. Click <strong className="text-white">Check OneSignal App</strong> to verify API key works and see total subscriber count.</p>
            <p>2. If subscriber count is 0 or low: users who previously allowed notifications need to re-visit the site so the new service worker can register them.</p>
            <p>3. Click <strong className="text-white">Send Test Push to ALL Subscribers</strong> — you should receive an OS banner immediately on this device.</p>
            <p>4. If <strong className="text-white">Recipients: 0</strong>: your OneSignal app has no registered devices yet. The service worker fix we deployed will capture new visitors.</p>
            <p>5. If Subscription ID above is <strong className="text-white">null</strong>: this browser is not registered with OneSignal. Try refreshing after a hard reload (Ctrl+Shift+R).</p>
          </div>,
          'How to Use',
          <AlertCircle className="w-4 h-4 text-gray-400" />
        )}
      </div>
    </div>
  );
}
