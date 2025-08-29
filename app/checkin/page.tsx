'use client';

import { useState, useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeInLA, TIMEZONE_DISPLAY } from '@/lib/timezone';

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface CheckInResult {
  success: boolean;
  reEntry?: boolean;
  visit?: {
    id: string;
    checkedInAt: string;
    expiresAt: string;
  };
  guest?: {
    id: string;
    name: string;
    email: string;
  };
  host?: {
    id: string;
    name: string;
  };
  discountTriggered?: boolean;
  message?: string;
  error?: string;
}

export default function CheckInPage() {
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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

  // Legacy unused handler - keeping for compatibility
  // const handleScan = (result: any) => {
  //   if (result) {
  //     setScannedData(result[0]?.rawValue || result.text || JSON.stringify(result));
  //     setIsScanning(false);
  //   }
  // };

  const handleScanSuccess = async (result: QrScanner.ScanResult) => {
    setScannedData(result.data);
    setIsScanning(false);
    qrScannerRef.current?.stop();
    
    // Process the scanned QR code
    await processCheckIn(result.data);
  };

  const processCheckIn = async (scannedData: string) => {
    setIsProcessing(true);
    try {
      // Extract token from scanned data (handle different formats)
      let token = scannedData;
      
      // If it's a URL format like "berlinhouse://checkin?token=...", extract token
      const urlMatch = scannedData.match(/[?&]token=([^&]+)/);
      if (urlMatch) {
        token = decodeURIComponent(urlMatch[1]);
      }
      
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setCheckInResult({
          success: true,
          ...result,
        });
      } else {
        setCheckInResult({
          success: false,
          error: result.error || 'Check-in failed',
        });
      }
    } catch (error) {
      console.error('Check-in error:', error);
      setCheckInResult({
        success: false,
        error: 'Network error. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanError = (error: string | Error) => {
    // Only log actual errors, not "No QR code found" messages
    if (error.toString() !== 'No QR code found') {
      console.error('QR Scanner Error:', error);
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setCheckInResult(null);
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
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Guest Check-In</h1>
          <p className="text-gray-600">Scan QR code to check in guests</p>
          {cameras.length > 0 && (
            <p className="text-sm text-blue-600 mt-2">
              {cameras.length} camera{cameras.length > 1 ? 's' : ''} detected
            </p>
          )}
        </div>

        <div className="max-w-md mx-auto">
          {isScanning ? (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Scan QR Code</h2>
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
              
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden mb-4">
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
            <div className="bg-white rounded-lg shadow-lg p-6">
              {isProcessing ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Processing Check-in...</h2>
                  <p className="text-gray-600">Please wait while we verify your QR code</p>
                </div>
              ) : checkInResult ? (
                <div className="text-center">
                  <div className={`text-6xl mb-4 ${checkInResult.success ? 'text-green-500' : 'text-red-500'}`}>
                    {checkInResult.success ? '✅' : '❌'}
                  </div>
                  
                  <h2 className={`text-xl font-semibold mb-2 ${
                    checkInResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {checkInResult.success ? 
                      (checkInResult.reEntry ? 'Welcome Back!' : 'Check-in Successful!') : 
                      'Check-in Failed'
                    }
                  </h2>

                  <p className="text-gray-600 mb-6">
                    {checkInResult.message}
                  </p>

                  {checkInResult.success && checkInResult.guest && (
                    <Card className="mb-6 text-left">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Guest Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="font-medium">Name:</span> {checkInResult.guest.name}
                        </div>
                        <div>
                          <span className="font-medium">Email:</span> {checkInResult.guest.email}
                        </div>
                        {checkInResult.visit && (
                          <>
                            <div>
                              <span className="font-medium">Check-in Time:</span>{' '}
                              {formatDateTimeInLA(new Date(checkInResult.visit.checkedInAt))}
                            </div>
                            <div>
                              <span className="font-medium">Valid Until:</span>{' '}
                              {formatDateTimeInLA(new Date(checkInResult.visit.expiresAt))}
                            </div>
                          </>
                        )}
                        {checkInResult.discountTriggered && (
                          <div className="pt-2">
                            <Badge variant="success" className="text-sm">
                              🎉 3rd Lifetime Visit - Discount Sent!
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {!checkInResult.success && checkInResult.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <p className="text-red-800 text-sm">{checkInResult.error}</p>
                    </div>
                  )}

                  <Button
                    onClick={resetScanner}
                    className="w-full"
                  >
                    Scan Another QR Code
                  </Button>
                </div>
              ) : (
                <div className="text-center mb-6">
                  <div className="text-green-500 text-6xl mb-4">📱</div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">QR Code Scanned!</h2>
                  <p className="text-gray-600">Processing check-in...</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 mb-2">
            Compatible with BerlinHouse invitation QR codes
          </p>
          <p className="text-xs text-gray-400 mb-1">
            Optimized for iPad Safari compatibility
          </p>
          <p className="text-xs text-gray-400">
            Times shown in {TIMEZONE_DISPLAY}
          </p>
        </div>
      </div>
    </div>
  );
}