'use client';

import { useRef, useImperativeHandle, forwardRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';

interface SignaturePadProps {
  width?: number;
  height?: number;
  className?: string;
  onSignature?: (signature: string | null) => void;
}

export interface SignaturePadRef {
  clear: () => void;
  getSignature: () => string | null;
  isEmpty: () => boolean;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({
  width = 600,
  height = 200,
  className = '',
  onSignature,
}, ref) => {
  const canvasRef = useRef<SignatureCanvas>(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      if (canvasRef.current) {
        canvasRef.current.clear();
        onSignature?.(null);
      }
    },
    getSignature: () => {
      if (canvasRef.current && !canvasRef.current.isEmpty()) {
        return canvasRef.current.getTrimmedCanvas().toDataURL('image/png');
      }
      return null;
    },
    isEmpty: () => {
      return canvasRef.current ? canvasRef.current.isEmpty() : true;
    },
  }));

  const handleEnd = () => {
    if (canvasRef.current && !canvasRef.current.isEmpty()) {
      const signature = canvasRef.current.getTrimmedCanvas().toDataURL('image/png');
      onSignature?.(signature);
    } else {
      onSignature?.(null);
    }
  };

  const clearSignature = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
      onSignature?.(null);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="relative border-2 border-gray-300 rounded-lg bg-white overflow-hidden">
        <SignatureCanvas
          ref={canvasRef}
          canvasProps={{
            width,
            height,
            className: 'signature-canvas w-full h-full',
            style: { touchAction: 'none' }
          }}
          backgroundColor="rgb(255, 255, 255)"
          penColor="rgb(0, 0, 0)"
          minWidth={0.5}
          maxWidth={2.5}
          velocityFilterWeight={0.1}
          throttle={0}
          dotSize={0.5}
          onEnd={handleEnd}
        />
        
        {/* Signature prompt overlay when empty */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-lg font-medium">
          <span className="bg-white bg-opacity-80 px-4 py-2 rounded-lg border border-gray-200">
            ✍️ Sign here with your finger or stylus
          </span>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-3">
        <div className="text-sm text-gray-600">
          <span className="font-medium">📝 Digital Signature Required</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          🗑️ Clear
        </Button>
      </div>
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;