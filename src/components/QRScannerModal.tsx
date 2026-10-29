import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles,
  SwitchCamera
} from 'lucide-react';
import jsQR from 'jsqr';
import { useLanguage } from '../context/LanguageContext';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (batteryId: string) => void;
  title?: string;
  allowAnyText?: boolean;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title,
  allowAnyText = false,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [detectedId, setDetectedId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Helper to extract clean Battery ID or Serial from URL or text
  const extractBatteryId = (rawText: string): string | null => {
    if (!rawText) return null;
    const trimmed = rawText.trim();
    if (allowAnyText) {
      return trimmed;
    }
    // 1. Direct match: BAT-XXX-XXXXXXXX
    const directMatch = trimmed.match(/BAT-[A-Z0-9]+-[A-F0-9]+/i);
    if (directMatch) return directMatch[0].toUpperCase();

    // 2. URL path: .../verify/BAT-...
    const urlMatch = trimmed.match(/\/verify\/([^/?#]+)/i);
    if (urlMatch && urlMatch[1]) {
      return decodeURIComponent(urlMatch[1]).toUpperCase();
    }

    // 3. Fallback check for any string starting with BAT-
    if (trimmed.toUpperCase().startsWith('BAT-')) {
      return trimmed.toUpperCase();
    }

    return null;
  };

  // Decode from Image Data using Native BarcodeDetector or jsQR
  const decodeImageData = async (imageData: ImageData): Promise<string | null> => {
    // 1. Try Native BarcodeDetector if available in browser
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'data_matrix', 'code_128', 'code_39', 'ean_13'],
        });
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(imageData, 0, 0);
          const barcodes = await barcodeDetector.detect(canvas);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            return barcodes[0].rawValue;
          }
        }
      } catch (e) {
        // Fallback to jsQR on any detector error
      }
    }

    // 2. Universal offline fallback: jsQR
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (code && code.data) {
        return code.data;
      }
    } catch (e) {
      console.warn('jsQR decoding notice:', e);
    }

    return null;
  };

  // Continuous Camera Frame Processing Loop
  const scanCameraFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const rawResult = await decodeImageData(imageData);

        if (rawResult) {
          const batteryId = extractBatteryId(rawResult);
          if (batteryId) {
            setDetectedId(batteryId);
            stopCamera();
            setTimeout(() => {
              onScanSuccess(batteryId);
              onClose();
            }, 600);
            return;
          }
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanCameraFrame);
  };

  // Start Camera Stream
  const startCamera = async () => {
    setErrorMsg(null);
    setDetectedId(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg(t.scannerCameraDenied);
      } else {
        setErrorMsg('Unable to access camera: ' + (err.message || 'Device in use or unsupported.'));
      }
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Toggle Rear / Front Camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  useEffect(() => {
    if (cameraActive) {
      animationFrameRef.current = requestAnimationFrame(scanCameraFrame);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive]);

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode]);

  // Handle Image File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setScanning(true);
    setDetectedId(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setErrorMsg('Failed to create canvas context.');
          setScanning(false);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const rawResult = await decodeImageData(imageData);

        setScanning(false);
        if (rawResult) {
          const batteryId = extractBatteryId(rawResult);
          if (batteryId) {
            setDetectedId(batteryId);
            setTimeout(() => {
              onScanSuccess(batteryId);
              onClose();
            }, 600);
          } else {
            setErrorMsg(`QR detected (${rawResult}), but does not match a valid BatteryPass format.`);
          }
        } else {
          setErrorMsg(t.scannerInvalidCode);
        }
      };
      img.onerror = () => {
        setScanning(false);
        setErrorMsg('Failed to parse uploaded image file.');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs select-none">
      <div className="bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-[#1F2937] dark:text-[#F1F5F9]">
        {/* Close Button */}
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#1F2937] dark:hover:text-white border border-[#E5E7EB] dark:border-[#1E382B] transition-colors"
          title={t.close}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/30 border border-[#D1FAE5] dark:border-[#065F46] text-[#059669] mb-2 shadow-xs">
            <Camera className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h3 className="text-xl font-bold text-[#14532D] dark:text-[#34D399]">{title || t.scannerTitle}</h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">{t.scannerSubtitle}</p>
        </div>

        {/* Tab Switcher: Camera vs Image Upload */}
        <div className="flex p-1 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] mb-5">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'camera'
                ? 'bg-[#14532D] text-white shadow-sm'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1F2937] dark:hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{t.scannerCameraTab}</span>
          </button>
          <button
            onClick={() => {
              stopCamera();
              setActiveTab('upload');
            }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-[#14532D] text-white shadow-sm'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1F2937] dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t.scannerUploadTab}</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 border border-[#FECACA] dark:border-[#991B1B] text-[#DC2626] dark:text-[#F87171] text-xs flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Success Detection Banner */}
        {detectedId && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 border border-[#A7F3D0] dark:border-[#059669] text-[#065F46] dark:text-[#34D399] text-xs flex items-center space-x-2.5 animate-pulse">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#059669]" />
            <div className="font-semibold">
              {t.scannerSuccessNotice} <span className="font-mono underline">{detectedId}</span>
            </div>
          </div>
        )}

        {/* TAB 1: Camera Scanner */}
        {activeTab === 'camera' && (
          <div className="space-y-4">
            <div className="relative aspect-4/3 w-full max-w-sm mx-auto bg-black rounded-2xl overflow-hidden border-2 border-[#14532D] shadow-lg flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                autoPlay
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target Overlay */}
              {cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-dashed border-[#10B981] rounded-2xl relative flex items-center justify-center shadow-lg">
                    {/* Viewfinder Corner Accents */}
                    <span className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#059669] rounded-tl-lg" />
                    <span className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#059669] rounded-tr-lg" />
                    <span className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#059669] rounded-bl-lg" />
                    <span className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#059669] rounded-br-lg" />
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-black/60 px-2 py-0.5 rounded-full tracking-wider">
                      ALIGN QR HERE
                    </span>
                  </div>
                </div>
              )}

              {/* Inactive Camera Placeholder */}
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-4 text-center space-y-2">
                  <Camera className="w-10 h-10 text-slate-500" />
                  <p className="text-xs">{t.scannerCameraNotice}</p>
                </div>
              )}
            </div>

            {/* Camera Action Buttons */}
            <div className="flex items-center justify-center space-x-3 pt-1">
              {cameraActive ? (
                <>
                  <button
                    onClick={stopCamera}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 border border-[#FECACA] dark:border-[#991B1B] text-[#DC2626] dark:text-[#F87171] text-xs font-semibold hover:bg-[#FEE2E2] transition-colors"
                  >
                    <span>{t.scannerStopCam}</span>
                  </button>
                  <button
                    onClick={toggleFacingMode}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-[#1F2937] dark:text-[#F1F5F9] text-xs font-semibold hover:bg-[#ECFDF3] transition-colors"
                  >
                    <SwitchCamera className="w-3.5 h-3.5 text-[#059669]" />
                    <span>{t.scannerSwitchCam}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={startCamera}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t.scannerStartCam}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Image File Upload */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <label className="border-2 border-dashed border-[#CBD5E1] dark:border-[#233B2E] hover:border-[#14532D] dark:hover:border-[#059669] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-[#F8FAF7] dark:bg-[#16261D] transition-colors text-center group">
              <Upload className="w-10 h-10 text-[#059669] mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9]">
                {t.scannerDropImage}
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                {t.scannerChooseFile}
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {scanning && (
              <div className="flex items-center justify-center space-x-2 text-xs text-[#059669] font-medium py-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{t.scannerAnalyzing}</span>
              </div>
            )}
          </div>
        )}

        {/* Mandatory EU Physical Authenticity Protocol Disclaimer */}
        <div className="mt-5 p-3.5 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-xs space-y-1">
          <div className="font-semibold text-[#14532D] dark:text-[#34D399] flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4 text-[#D97706] flex-shrink-0" />
            <span>{t.scannerDisclaimerTitle}</span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            {t.scannerDisclaimerText}
          </p>
        </div>
      </div>
    </div>
  );
};
