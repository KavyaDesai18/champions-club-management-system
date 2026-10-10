import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500/90 text-slate-950 font-semibold text-xs py-2 px-4 shadow-lg flex items-center justify-between sticky top-0 z-50 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 animate-pulse text-slate-950" />
          <span>You are currently working offline. Operating in offline mode until connection restores.</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-950/20 hover:bg-slate-950/30 rounded-lg text-slate-950 text-[11px] font-bold transition"
        >
          <RefreshCw className="w-3 h-3" />
          Retry Connection
        </button>
      </div>
    </div>
  );
}
