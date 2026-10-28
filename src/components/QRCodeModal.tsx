import React from 'react';
import { X, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeModalProps {
  batteryId: string;
  onClose: () => void;
  onNavigateVerify: (id: string) => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ batteryId, onClose, onNavigateVerify }) => {
  const verifyUrl = `${window.location.origin}/verify/${batteryId}`;

  const handleDownload = () => {
    const svg = document.getElementById('qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 80;
      canvas.height = img.height + 120;
      if (!ctx) return;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 40, 40);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(batteryId, canvas.width / 2, canvas.height - 40);
      ctx.font = '12px sans-serif';
      ctx.fillText('EU 2023/1542 Battery Passport', canvas.width / 2, canvas.height - 20);
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

        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Physical Battery QR Code</h3>
          <p className="text-xs text-slate-400 mt-1">
            Mandatory QR sticker complying with EU Regulation 2023/1542
          </p>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-6 rounded-2xl flex flex-col items-center justify-center shadow-inner mx-auto max-w-[280px]">
          <QRCodeSVG 
            id="qr-svg"
            value={verifyUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
          <div className="mt-3 text-center">
            <div className="font-mono font-bold text-slate-950 text-sm tracking-wider">{batteryId}</div>
            <div className="text-[10px] text-slate-600 font-medium">EU Digital Product Passport</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 grid grid-cols-2 gap-3">
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
            <span>Public Verify</span>
          </button>
        </div>
      </div>
    </div>
  );
};
