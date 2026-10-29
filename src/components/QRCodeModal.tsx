import React, { useState, useEffect } from 'react';
import { X, Download, Copy, Check, Printer, ExternalLink, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface QRCodeModalProps {
  batteryId: string;
  serialNumber?: string;
  onClose: () => void;
  onNavigateVerify: (id: string) => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  batteryId,
  serialNumber,
  onClose,
  onNavigateVerify,
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [casingSerial, setCasingSerial] = useState<string | null>(serialNumber || null);

  useEffect(() => {
    if (!casingSerial) {
      api.getPassport(batteryId)
        .then((p) => {
          if (p && p.serial_number) setCasingSerial(p.serial_number);
        })
        .catch(() => {});
    }
  }, [batteryId, casingSerial]);

  // Security check: Only encode the public verification link and battery ID
  // Strictly zero private keys, API secrets, or internal formulations
  const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(batteryId)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy verification link:', err);
    }
  };

  const handleDownloadPng = () => {
    const svg = document.getElementById('qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 100;
      canvas.height = img.height + 150;
      if (!ctx) return;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // EU Regulation Header
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EU 2023/1542 BATTERY PASSPORT', canvas.width / 2, 30);

      // Battery Serial
      ctx.fillStyle = '#14532D';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(batteryId, canvas.width / 2, canvas.height - 50);

      // Verification Footnote
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText('Scan to inspect tamper-evident SHA-256 ledger', canvas.width / 2, canvas.height - 25);

      const a = document.createElement('a');
      a.download = `BatteryPass-${batteryId}-QR.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-[#1F2937] dark:text-[#F1F5F9]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#1F2937] dark:hover:text-white border border-[#E5E7EB] dark:border-[#1E382B] transition-colors"
          title={t.qrClose}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/30 border border-[#D1FAE5] dark:border-[#065F46] text-[#059669] mb-3 shadow-xs">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h3 className="text-lg font-bold text-[#14532D] dark:text-[#34D399]">{t.qrModalTitle}</h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">{t.qrModalSubtitle}</p>
        </div>

        {/* Printable QR Sticker Container */}
        <div 
          id="qr-print-area"
          className="bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] p-5 rounded-2xl flex flex-col items-center justify-center mx-auto max-w-[340px] shadow-inner"
        >
          <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] shadow-xs">
            <QRCodeSVG 
              id="qr-svg"
              value={verifyUrl}
              size={180}
              level="H"
              includeMargin={false}
            />
          </div>
          <div className="mt-3 text-center">
            <div className="font-mono font-bold text-[#14532D] dark:text-[#34D399] text-sm tracking-wider">
              {batteryId}
            </div>
            <div className="text-[10px] text-[#059669] font-bold tracking-wider mt-0.5 uppercase">
              EU 2023/1542 Digital Passport QR
            </div>
          </div>

          {/* Permanent Engraved Physical Serial Number (Plain Text) */}
          {casingSerial && (
            <div className="w-full mt-4 pt-3.5 border-t border-[#E5E7EB] dark:border-[#1E382B] flex flex-col items-center">
              <div className="text-[10px] text-[#059669] dark:text-[#34D399] font-bold tracking-wider mb-1 uppercase">
                Permanently Engraved Casing Serial
              </div>
              <div className="bg-white dark:bg-[#121F17] px-4 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#1E382B] shadow-2xs font-mono font-extrabold text-sm text-[#14532D] dark:text-[#34D399] tracking-wider text-center select-all">
                {casingSerial}
              </div>
              <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono mt-1 text-center">
                Laser-engraved on casing • Manually verified in Step 2
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          <button
            onClick={handleDownloadPng}
            className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 py-2.5 px-2 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#1F2937] dark:text-[#F1F5F9] text-xs font-semibold border border-[#E5E7EB] dark:border-[#1E382B] hover:border-[#14532D] transition-all"
            title="Download QR Code PNG"
          >
            <Download className="w-3.5 h-3.5 text-[#059669]" />
            <span className="text-[11px] font-medium">QR PNG</span>
          </button>

          <button
            onClick={handleCopyLink}
            className={`flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
              copied
                ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 border-[#059669] text-[#059669]'
                : 'bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#1F2937] dark:text-[#F1F5F9] border-[#E5E7EB] dark:border-[#1E382B] hover:border-[#14532D]'
            }`}
            title={t.qrCopyLink}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />}
            <span className="text-[11px] font-medium">{copied ? t.qrLinkCopied : 'Copy Link'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 py-2.5 px-2 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#1F2937] dark:text-[#F1F5F9] text-xs font-semibold border border-[#E5E7EB] dark:border-[#1E382B] hover:border-[#14532D] transition-all"
            title={t.qrPrintSticker}
          >
            <Printer className="w-3.5 h-3.5 text-[#14532D] dark:text-[#34D399]" />
            <span className="text-[11px] font-medium">{t.qrPrintSticker}</span>
          </button>
        </div>

        {/* Public Verify Direct Gateway Link */}
        <button
          onClick={() => {
            onClose();
            onNavigateVerify(batteryId);
          }}
          className="mt-3 w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm"
        >
          <ExternalLink className="w-4 h-4" />
          <span>{t.qrPublicVerify}</span>
        </button>

        {/* Privacy & Safety Footnote */}
        <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] text-center mt-4">
          ✓ Contains zero secrets or proprietary chemistry. Safe for physical pack labeling.
        </p>
      </div>
    </div>
  );
};
