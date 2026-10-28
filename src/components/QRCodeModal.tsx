import React, { useState } from 'react';
import { X, Download, ExternalLink, ShieldCheck, AlertCircle, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeModalProps {
  batteryId: string;
  onClose: () => void;
  onNavigateVerify: (id: string) => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ batteryId, onClose, onNavigateVerify }) => {
  const verifyUrl = `${window.location.origin}/verify/${batteryId}`;
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = document.getElementById('qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 80;
      canvas.height = img.height + 140;
      if (!ctx) return;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 40, 40);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(batteryId, canvas.width / 2, canvas.height - 60);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('EU 2023/1542 Battery Passport Pointer', canvas.width / 2, canvas.height - 40);
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText('Physical QR is a lookup pointer only. Authenticity verified online.', canvas.width / 2, canvas.height - 20);
      const a = document.createElement('a');
      a.download = `BatteryPass-${batteryId}-QR.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass-panel border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Physical Battery QR Code</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            EU Regulation 2023/1542 Certified Metrology Identifier
          </p>
        </div>

        {/* Security Disclosure */}
        <div className="mb-4 p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 text-[11px] text-amber-300/90 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Authenticity Notice:</strong> A physical QR sticker is strictly an opaque pointer to the canonical registry record. 
            Scanning does not grant ownership, alter history, or trust data encoded on external labels.
          </span>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-5 rounded-2xl flex flex-col items-center justify-center shadow-inner mx-auto max-w-[280px]">
          <QRCodeSVG 
            id="qr-svg"
            value={verifyUrl}
            size={180}
            level="H"
            includeMargin={true}
          />
          <div className="mt-2 text-center">
            <div className="font-mono font-bold text-slate-950 text-sm tracking-wider">{batteryId}</div>
            <div className="text-[10px] text-slate-600 font-medium">EU Digital Product Passport</div>
          </div>
        </div>

        {/* Lookup URL copy helper */}
        <div className="mt-4 flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400">
          <span className="truncate max-w-[260px] text-[11px]">{verifyUrl}</span>
          <button
            onClick={handleCopyUrl}
            className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] ml-2"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onNavigateVerify(batteryId);
            }}
            className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Verify Online</span>
          </button>
        </div>
      </div>
    </div>
  );
};
