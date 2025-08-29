'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeComponentProps {
  value: string;
  size?: number;
  className?: string;
  onError?: (error: Error) => void;
}

export function QRCodeComponent({ 
  value, 
  size = 256, 
  className = '', 
  onError 
}: QRCodeComponentProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setError('No QR code value provided');
      setIsLoading(false);
      return;
    }

    const generateQR = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const dataUrl = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'M',
        });

        setQrDataUrl(dataUrl);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate QR code';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    };

    generateQR();
  }, [value, size, onError]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="text-red-500 text-4xl mb-2">❌</div>
        <p className="text-sm text-red-600 text-center">{error}</p>
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div className={`flex items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <p className="text-sm text-gray-500">No QR code generated</p>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src={qrDataUrl}
        alt="QR Code"
        className="max-w-full h-auto rounded-lg"
        style={{ width: size, height: size }}
      />
    </div>
  );
}