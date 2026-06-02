'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const detectedRef = useRef(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // BarcodeDetector API (Chrome Android + Desktop Chrome)
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
        });
        scanLoop(detector);
      } else {
        // Fallback: @zxing/browser
        try {
          const zxing = await import('@zxing/browser');
          const reader = new zxing.BrowserMultiFormatReader();
          if (videoRef.current) {
            reader.decodeFromVideoElement(videoRef.current, (result, err) => {
              if (result && !detectedRef.current) {
                detectedRef.current = true;
                stopCamera();
                onDetected(result.getText());
              }
            });
          }
        } catch {
          setError('Bu tarayıcıda barkot okuma desteklenmiyor. Lütfen Chrome kullanın.');
          setScanning(false);
        }
      }
    } catch (e: any) {
      setError('Kamera erişimi reddedildi veya desteklenmiyor.');
      setScanning(false);
    }
  }

  async function scanLoop(detector: any) {
    if (!videoRef.current || detectedRef.current) return;
    try {
      const results = await detector.detect(videoRef.current);
      if (results.length > 0 && !detectedRef.current) {
        detectedRef.current = true;
        stopCamera();
        onDetected(results[0].rawValue);
        return;
      }
    } catch {}
    requestAnimationFrame(() => scanLoop(detector));
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
        <p className="font-semibold text-sm">Barkot Tara</p>
        <button onClick={() => { stopCamera(); onClose(); }} className="text-white text-2xl leading-none">×</button>
      </div>

      {/* Kamera */}
      <div className="flex-1 relative flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        {/* Tarama çerçevesi */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-72 h-36">
            {/* Köşe çizgileri */}
            {[
              'top-0 left-0 border-t-4 border-l-4',
              'top-0 right-0 border-t-4 border-r-4',
              'bottom-0 left-0 border-b-4 border-l-4',
              'bottom-0 right-0 border-b-4 border-r-4',
            ].map((cls, i) => (
              <div key={i} className={`absolute w-8 h-8 border-brand-400 ${cls} rounded-sm`} />
            ))}
            {/* Tarama çizgisi animasyonu */}
            <div className="absolute left-2 right-2 h-0.5 bg-brand-400 opacity-80 animate-scan" />
          </div>
        </div>
        {/* Hata */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center text-white px-6">
              <p className="text-4xl mb-3">📷</p>
              <p className="text-sm">{error}</p>
              <p className="text-xs text-gray-400 mt-2">Tarayıcı ayarlarından kamera iznini açın</p>
            </div>
          </div>
        )}
      </div>

      {/* Alt bilgi */}
      <div className="px-4 py-4 bg-black/80 text-center">
        <p className="text-white text-sm">{scanning && !error ? '🔍 Barkotu çerçeve içine alın' : ''}</p>
        <p className="text-gray-400 text-xs mt-1">EAN-13, EAN-8, Code-128, QR desteklenir</p>
      </div>

      <style jsx>{`
        @keyframes scan {
          0%, 100% { top: 8px; }
          50% { top: calc(100% - 8px); }
        }
        .animate-scan { animation: scan 2s ease-in-out infinite; position: absolute; }
      `}</style>
    </div>
  );
}
