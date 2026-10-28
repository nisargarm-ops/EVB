import React, { useState } from 'react';
import { Info, RotateCcw, Check, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface DemoDataBadgeProps {
  onReset?: () => void;
  onNavigateSettings?: () => void;
}

export const DemoDataBadge: React.FC<DemoDataBadgeProps> = ({ onReset, onNavigateSettings }) => {
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleReset = () => {
    setResetting(true);
    try {
      api.resetDemoData();
      setResetDone(true);
      setTimeout(() => {
        setResetDone(false);
        setResetting(false);
        if (onReset) onReset();
      }, 700);
    } catch {
      setResetting(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-1.5 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-bold">
            <Info className="w-3 h-3" />
            <span>METROLOGY TESTNET</span>
          </span>
          <span className="text-[11px] text-slate-300">
            Pre-seeded with compliant EU 2023/1542 battery records and SHA-256 genesis blocks.
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          {onNavigateSettings && (
            <button
              onClick={onNavigateSettings}
              className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors flex items-center space-x-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify SDK Connections</span>
            </button>
          )}

          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition-all disabled:opacity-50"
            title="Reset repository to initial European Union sample batteries"
          >
            {resetDone ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Restored</span>
              </>
            ) : (
              <>
                <RotateCcw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
                <span>Reset Demo State</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
