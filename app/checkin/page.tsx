'use client';

import { useState, useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';

interface CameraDevice {
  deviceId: string;
  label: string;
}

export default function CheckInPage() {
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    const initializeScanner = async () => {
      try {
        // Check if QR scanner is supported
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          setHasPermission(false);
          setIsLoading(false);
          return;
        }

        setHasPermission(true);
        
        // Get available cameras
        const availableCameras = await QrScanner.listCameras(true);
        const cameraDevices = availableCameras.map(camera => ({
          deviceId: camera.id,
          label: camera.label
        }));
        
        setCameras(cameraDevices);
        
        // Prefer back camera
        const backCamera = availableCameras.find(camera => 
          camera.label.toLowerCase().includes('back') || 
          camera.label.toLowerCase().includes('rear') ||
          camera.label.toLowerCase().includes('environment')
        );
        
        const preferredCamera = backCamera || availableCameras[0];
        setSelectedCamera(preferredCamera?.id || null);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Scanner initialization error:', error);
        setHasPermission(false);
        setIsLoading(false);
      }
    };

    initializeScanner();
  }, []);

  const handleScan = (result: any) => {
    if (result) {
      setScannedData(result[0]?.rawValue || result.text || JSON.stringify(result));
      setIsScanning(false);
    }
  };

  const handleScanSuccess = (result: QrScanner.ScanResult) => {
    setScannedData(result.data);
    setIsScanning(false);
    qrScannerRef.current?.stop();
  };

  const handleScanError = (error: string | Error) => {
    // Only log actual errors, not "No QR code found" messages
    const errorMessage = error.toString();
    if (!errorMessage.includes('No QR code found')) {
      console.error('QR Scanner Error:', error);
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setIsScanning(true);
    startScanner();
  };

  const startScanner = async () => {
    if (!videoRef.current || !selectedCamera) return;

    try {
      // Clean up existing scanner
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }

      // Create new scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        handleScanSuccess,
        {
          onDecodeError: handleScanError,
          preferredCamera: selectedCamera,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await qrScannerRef.current.start();
    } catch (error) {
      console.error('Failed to start scanner:', error);
      setHasPermission(false);
    }
  };

  const stopScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
  };

  // Start scanner when camera is selected and scanning is enabled
  useEffect(() => {
    if (isScanning && selectedCamera && hasPermission) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isScanning, selectedCamera, hasPermission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  // Handle camera switching
  const handleCameraChange = async (cameraId: string) => {
    setSelectedCamera(cameraId);
    if (qrScannerRef.current) {
      await qrScannerRef.current.setCamera(cameraId);
    }
  };

  if (hasPermission === null || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Checking camera permissions...</p>
        </div>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-6xl mb-4">📷</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Camera Access Required</h1>
          <p className="text-gray-600 mb-6">
            Please allow camera access to scan QR codes for guest check-in.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Retry Camera Access
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-2xl">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="mb-6">
            <img 
              src="/logo.JPG" 
              alt="Frontier Tower Logo" 
              className="h-12 sm:h-16 md:h-20 lg:h-24 mx-auto mb-4 object-contain"
            />
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">Guest Check-In</h1>
          <p className="text-sm sm:text-base text-gray-600">Scan QR code to check in guests</p>
        </div>

        <div className="w-full max-w-lg mx-auto">
          {isScanning ? (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Scan QR Code</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Position the QR code within the camera view
                </p>
                
                {cameras.length > 1 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Camera:
                    </label>
                    <select 
                      value={selectedCamera || ''}
                      onChange={(e) => handleCameraChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {cameras.map((camera) => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                          {camera.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden mb-4 max-w-sm mx-auto">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
                {!selectedCamera && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p>Initializing camera...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsScanning(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <div className="text-center mb-6">
                <div className="text-green-500 text-6xl mb-4">✅</div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">QR Code Scanned!</h2>
              </div>

              {scannedData && (
                <div className="mb-6">
                  <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-2">Scanned Data:</h3>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <code className="text-sm text-gray-700 break-all">
                      {scannedData}
                    </code>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={resetScanner}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Scan Another
                </button>
                <button
                  onClick={() => {
                    // TODO: Process check-in logic here
                    alert(`Processing check-in for: ${scannedData}`);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Check In
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6 sm:mt-8">
          <p className="text-xs sm:text-sm text-gray-500 mb-2">
            Compatible with QR codes, barcodes, and all major code formats
          </p>
          <p className="text-xs text-gray-400">
            Optimized for iPad Safari compatibility
          </p>
        </div>
      </div>
    </div>
  );
}