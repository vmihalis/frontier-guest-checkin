'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QrScanner from 'qr-scanner';
import { parseQRData, GuestData, type ParsedQRData } from '@/lib/qr-token';
import { GuestSelection } from '@/components/GuestSelection';
import { OverrideDialog } from '@/components/OverrideDialog';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/ui/logo';

interface CameraDevice {
  deviceId: string;
  label: string;
}

// Get appropriate error icon based on the error type
function getErrorIcon(errorMessage: string | null): string {
  if (!errorMessage) return '❌';
  
  if (errorMessage.includes('capacity') || errorMessage.includes('full')) return '👥';
  if (errorMessage.includes('monthly') || errorMessage.includes('limit')) return '📅'; 
  if (errorMessage.includes('Building hours') || errorMessage.includes('closed')) return '🌙';
  if (errorMessage.includes('expired') || errorMessage.includes('QR code')) return '🎫';
  if (errorMessage.includes('terms') || errorMessage.includes('email')) return '✉️';
  if (errorMessage.includes('security') || errorMessage.includes("can't access")) return '🔐';
  if (errorMessage.includes('technical') || errorMessage.includes('Connection')) return '🔧';
  if (errorMessage.includes('find') || errorMessage.includes('system')) return '🔍';
  
  return '❌';
}

// Get appropriate error title based on the error type
function getErrorTitle(errorMessage: string | null): string {
  if (!errorMessage) return 'Check-In Issue';
  
  if (errorMessage.includes('capacity') || errorMessage.includes('full')) return 'At Capacity';
  if (errorMessage.includes('monthly') || errorMessage.includes('limit')) return 'Visit Limit Reached'; 
  if (errorMessage.includes('Building hours') || errorMessage.includes('closed')) return 'Building Closed';
  if (errorMessage.includes('expired') || errorMessage.includes('QR code')) return 'QR Code Expired';
  if (errorMessage.includes('terms') || errorMessage.includes('email')) return 'Terms Needed';
  if (errorMessage.includes('security') || errorMessage.includes("can't access")) return 'Access Restricted';
  if (errorMessage.includes('technical') || errorMessage.includes('Connection')) return 'Technical Issue';
  if (errorMessage.includes('find') || errorMessage.includes('system')) return 'Guest Not Found';
  
  return 'Check-In Issue';
}

// Get contextual error messages based on the specific failure reason
function getContextualErrorMessage(result: { message?: string; error?: string }): string {
  // Check for specific error patterns in the message or result
  const message = result.message || result.error || '';
  
  // Blacklisted guest
  if (message.includes("not authorized") || message.includes("blacklist")) {
    return "Guest is not authorized for building access. Contact security for assistance.";
  }
  
  // Capacity limits
  if (message.includes("capacity") || message.includes("concurrent limit")) {
    return "Host is at capacity. Security can override if space is available.";
  }
  
  // Visit limits (monthly)
  if (message.includes("visits this month") || message.includes("30 days")) {
    return "Guest has reached monthly visit limit. Next visit available next month.";
  }
  
  // Time cutoff
  if (message.includes("closed for the night") || message.includes("11:59 PM")) {
    return "Building is closed for the night. Check-ins resume tomorrow morning.";
  }
  
  // QR code issues  
  if (message.includes("expired") || message.includes("QR code")) {
    return "QR code has expired. Please generate a new invitation.";
  }
  
  // Terms acceptance
  if (message.includes("visitor terms") || message.includes("acceptance")) {
    return "Guest needs to accept visitor terms before check-in. Email will be sent.";
  }
  
  // Guest not found
  if (message.includes("not found")) {
    return "Guest not found in system. Please verify QR code and try again.";
  }
  
  // Network/system errors
  if (message.includes("technical") || message.includes("unavailable") || message.includes("network")) {
    return "Service temporarily unavailable. Please try again.";
  }
  
  // Already checked in
  if (message.includes("already")) {
    return message; // These are already friendly from the API
  }
  
  // Default fallback with the original message
  return message || "Check-in failed. Please try again or contact support.";
}

export default function CheckInPage() {
  useAuth();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [parsedQRData, setParsedQRData] = useState<ParsedQRData | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<GuestData | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHttps, setIsHttps] = useState(true);
  const [checkInState, setCheckInState] = useState<'scanning' | 'guest-selection' | 'processing' | 'success' | 'error' | 'override-required'>('scanning');
  const [overrideData, setOverrideData] = useState<{
    guestData?: GuestData | string;
    currentCount: number;
    maxCount: number;
    errorMessage: string;
  } | null>(null);
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    guest?: { name: string; email: string };
    message?: string;
    reEntry?: boolean;
    visit?: Record<string, unknown>;
    host?: Record<string, unknown>;
    discountTriggered?: boolean;
    discountEmailSent?: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    const initializeScanner = async () => {
      try {
        // Check HTTPS requirement for iOS
        const isSecureContext = window.isSecureContext;
        const protocol = window.location.protocol;
        setIsHttps(isSecureContext || protocol === 'https:');
        
        if (!isSecureContext && protocol !== 'https:') {
          // Check if this is iOS/Safari
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          
          if (isIOS || isSafari) {
            setPermissionError('Camera access requires HTTPS on iOS devices. Please use HTTPS or see setup instructions.');
            setHasPermission(false);
            setIsLoading(false);
            return;
          }
        }
        
        // Check if QR scanner is supported
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          setPermissionError('No camera detected on this device.');
          setHasPermission(false);
          setIsLoading(false);
          return;
        }

        // Request camera permission explicitly for iOS
        try {
          // iOS Safari requires user interaction for camera permission
          // Try to get camera access
          const availableCameras = await QrScanner.listCameras(true);
          
          if (availableCameras.length === 0) {
            throw new Error('No cameras available');
          }
          
          const cameraDevices = availableCameras.map(camera => ({
            deviceId: camera.id,
            label: camera.label
          }));
          
          setCameras(cameraDevices);
          
          // Prefer back camera for mobile devices
          const backCamera = availableCameras.find(camera => 
            camera.label.toLowerCase().includes('back') || 
            camera.label.toLowerCase().includes('rear') ||
            camera.label.toLowerCase().includes('environment')
          );
          
          const preferredCamera = backCamera || availableCameras[0];
          setSelectedCamera(preferredCamera?.id || null);
          setHasPermission(true);
          setPermissionError(null);
        } catch (permError) {
          console.error('Camera permission error:', permError);
          
          // Provide specific error messages
          const error = permError as Error & { name?: string };
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            setPermissionError('Camera permission was denied. Please allow camera access in your browser settings.');
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            setPermissionError('No camera found. Please ensure your device has a working camera.');
          } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            setPermissionError('Camera is already in use by another application. Please close other apps using the camera.');
          } else {
            setPermissionError('Unable to access camera. Please check your browser settings.');
          }
          setHasPermission(false);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Scanner initialization error:', error);
        setPermissionError('Failed to initialize camera. Please refresh and try again.');
        setHasPermission(false);
        setIsLoading(false);
      }
    };

    initializeScanner();
  }, []);


  const handleScanSuccess = useCallback((result: QrScanner.ScanResult) => {
    try {
      const parsed = parseQRData(result.data);
      setScannedData(result.data);
      setParsedQRData(parsed);
      setIsScanning(false);
      qrScannerRef.current?.stop();
      
      if (parsed.type === 'batch') {
        setCheckInState('guest-selection');
      } else {
        setCheckInState('processing');
        processCheckIn(result.data);
      }
    } catch (error) {
      console.error('Failed to parse QR data:', error);
      // Instead of showing an error, try to process it as a raw token
      // This handles legacy formats or formats we don't recognize in frontend
      console.log('Attempting to process as raw token...');
      setScannedData(result.data);
      setParsedQRData(null);
      setIsScanning(false);
      qrScannerRef.current?.stop();
      setCheckInState('processing');
      processCheckIn(result.data);
    }
  }, []);

  const handleScanError = (error: string | Error) => {
    // Only log actual errors, not "No QR code found" messages
    const errorMessage = error.toString();
    if (!errorMessage.includes('No QR code found')) {
      console.error('QR Scanner Error:', error);
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setParsedQRData(null);
    setSelectedGuest(null);
    setCheckInResult(null);
    setErrorMessage(null);
    setOverrideData(null);
    setCheckInState('scanning');
    setIsScanning(true);
    startScanner();
  };

  const handleOverrideConfirm = (reason: string, password: string) => {
    if (overrideData?.guestData) {
      if (typeof overrideData.guestData === 'string') {
        // Regular QR token
        processCheckIn(overrideData.guestData, reason, password);
      } else {
        // Guest data
        processGuestCheckIn(overrideData.guestData, reason, password);
      }
    }
  };

  const handleOverrideCancel = () => {
    setOverrideData(null);
    resetScanner();
  };

  const handleGuestSelection = (guest: GuestData) => {
    setSelectedGuest(guest);
    setCheckInState('processing');
    // TODO: Process check-in for selected guest
    processGuestCheckIn(guest);
  };

  const processCheckIn = async (qrData: string, overrideReason?: string, overridePassword?: string) => {
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: qrData,
          overrideReason,
          overridePassword 
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Convert unified API response to expected format
        const guestResult = result.results?.[0];
        if (guestResult) {
          setCheckInResult({
            success: true,
            guest: {
              name: guestResult.guestName,
              email: guestResult.guestEmail
            },
            message: guestResult.message,
            reEntry: guestResult.reason === 're-entry',
            discountTriggered: guestResult.discountSent || false
          });
        } else {
          setCheckInResult({
            success: true,
            message: result.message
          });
        }
        setCheckInState('success');
        setOverrideData(null);
      } else if (response.status === 401 && result.passwordError) {
        // Wrong password - keep dialog open with error
        setOverrideData(prev => prev ? {...prev, errorMessage: 'Incorrect password. Please try again.'} : null);
      } else if (response.status === 409 && result.requiresOverride) {
        // Capacity exceeded - always show override option
        setOverrideData({
          guestData: qrData,
          currentCount: result.currentCount || 3,
          maxCount: result.maxCount || 3,
          errorMessage: result.message || result.error
        });
        setCheckInState('override-required');
      } else {
        // Handle specific error cases with contextual messages
        const errorMsg = getContextualErrorMessage(result);
        setErrorMessage(errorMsg);
        setCheckInState('error');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      setErrorMessage('Connection issue. Please try again.');
      setCheckInState('error');
    }
  };

  const processGuestCheckIn = async (guest: GuestData, overrideReason?: string, overridePassword?: string) => {
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          guest,
          overrideReason,
          overridePassword 
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Convert unified API response to expected format
        const guestResult = result.results?.[0];
        if (guestResult) {
          setCheckInResult({
            success: true,
            guest: {
              name: guestResult.guestName,
              email: guestResult.guestEmail
            },
            message: guestResult.message,
            reEntry: guestResult.reason === 're-entry',
            discountTriggered: guestResult.discountSent || false
          });
        } else {
          setCheckInResult({
            success: true,
            message: result.message
          });
        }
        setCheckInState('success');
        setOverrideData(null);
      } else if (response.status === 401 && result.passwordError) {
        // Wrong password - keep dialog open with error
        setOverrideData(prev => prev ? {...prev, errorMessage: 'Incorrect password. Please try again.'} : null);
      } else if (response.status === 409 && result.requiresOverride) {
        // Capacity exceeded - always show override option
        setOverrideData({
          guestData: guest,
          currentCount: result.currentCount || 3,
          maxCount: result.maxCount || 3,
          errorMessage: result.message || result.error
        });
        setCheckInState('override-required');
      } else {
        // Handle specific error cases with contextual messages
        const errorMsg = getContextualErrorMessage(result);
        setErrorMessage(errorMsg);
        setCheckInState('error');
      }
    } catch (error) {
      console.error('Guest check-in error:', error);
      setErrorMessage('Connection issue. Please try again.');
      setCheckInState('error');
    }
  };

  const startScanner = useCallback(async () => {
    if (!videoRef.current || !selectedCamera) return;

    try {
      // Clean up existing scanner
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }

      // iOS-specific: ensure video element is properly configured
      const video = videoRef.current;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.setAttribute('autoplay', 'true');

      // Create new scanner with iOS-optimized settings
      qrScannerRef.current = new QrScanner(
        video,
        handleScanSuccess,
        {
          onDecodeError: handleScanError,
          preferredCamera: selectedCamera,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          // iOS-specific: higher max scans for better performance
          maxScansPerSecond: 10,
        }
      );

      await qrScannerRef.current.start();
    } catch (error) {
      console.error('Failed to start scanner:', error);
      
      // Provide more specific error feedback
      const err = error as Error & { name?: string };
      if (err.name === 'NotAllowedError') {
        setPermissionError('Camera permission denied. Please allow camera access and refresh.');
      } else if (err.name === 'NotReadableError') {
        setPermissionError('Camera is in use by another app. Please close other camera apps.');
      } else {
        setPermissionError('Failed to start camera. Please refresh and try again.');
      }
      setHasPermission(false);
    }
  }, [selectedCamera, handleScanSuccess]);

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
  }, [isScanning, selectedCamera, hasPermission, startScanner]);

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
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-foreground">Checking camera permissions...</p>
        </div>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <div className="text-center p-8 bg-card rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-6xl mb-4">📷</div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Camera Access Required</h1>
          
          {permissionError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700 dark:text-red-400">{permissionError}</p>
            </div>
          )}
          
          {!isHttps && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2">📱 iPad/iOS Users:</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-500 mb-3">
                Safari requires HTTPS for camera access. To fix this:
              </p>
              <ol className="text-sm text-yellow-700 dark:text-yellow-500 space-y-2 list-decimal list-inside">
                <li>Run <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">npm run setup:https</code> on your computer</li>
                <li>Install the certificate on your iPad</li>
                <li>Access via <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">https://[computer-ip]:3000</code></li>
              </ol>
            </div>
          )}
          
          <p className="text-muted-foreground mb-6">
            {isHttps 
              ? "Please allow camera access when prompted or check your browser settings."
              : "Camera access requires proper setup for iOS devices."
            }
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium"
            >
              Retry Camera Access
            </button>
            
            {/* iOS specific help */}
            {/iPad|iPhone|iPod/.test(navigator.userAgent) && (
              <button 
                onClick={() => {
                  // Try to request permission again with user gesture
                  navigator.mediaDevices.getUserMedia({ video: true })
                    .then(() => window.location.reload())
                    .catch((err) => {
                      console.error('Permission request failed:', err);
                      alert('Please allow camera access in Settings > Safari > Camera');
                    });
                }}
                className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6 py-3 rounded-lg font-medium"
              >
                Request Permission
              </button>
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-border">
            <details className="text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Troubleshooting Guide
              </summary>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p><strong>iOS/Safari:</strong> Settings → Safari → Camera → Allow</p>
                <p><strong>Chrome:</strong> Click lock icon → Site settings → Camera → Allow</p>
                <p><strong>Still not working?</strong> Try opening in Safari or Chrome</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-2xl">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <Logo size="lg" priority className="h-12 sm:h-16 md:h-20 lg:h-24" />
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">Guest Check-In</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Scan QR code to check in guests</p>
        </div>

        <div className="w-full max-w-lg mx-auto">
          {checkInState === 'scanning' ? (
            <div className="bg-card border border-border rounded-lg shadow-lg p-4 sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Scan QR Code</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Position the QR code within the camera view
                </p>
                
                {cameras.length > 1 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Select Camera:
                    </label>
                    <select 
                      value={selectedCamera || ''}
                      onChange={(e) => handleCameraChange(e.target.value)}
                      className="w-full p-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
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
                  className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : checkInState === 'guest-selection' && parsedQRData?.guestBatch ? (
            <GuestSelection
              guests={parsedQRData.guestBatch.guests}
              onSelectGuest={handleGuestSelection}
              onCancel={resetScanner}
            />
          ) : checkInState === 'processing' ? (
            <div className="bg-card border border-border rounded-lg shadow-lg p-4 sm:p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Processing Check-In</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedGuest ? `Checking in ${selectedGuest.n}...` : 'Processing your check-in...'}
                </p>
              </div>
            </div>
          ) : checkInState === 'success' ? (
            <div className="bg-card border border-border rounded-lg shadow-lg p-4 sm:p-6">
              <div className="text-center mb-6">
                <div className="text-green-500 text-6xl mb-4">
                  ✨
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                  {checkInResult?.reEntry ? "Welcome Back!" : "You're All Set!"}
                </h2>
                {checkInResult?.guest && (
                  <p className="text-sm text-muted-foreground">
                    {checkInResult.reEntry ? `Good to see you again, ${checkInResult.guest.name}!` : `Enjoy your visit, ${checkInResult.guest.name}!`}
                  </p>
                )}
                {checkInResult?.discountTriggered && (
                  <p className="text-sm text-purple-600 font-medium mt-2">
                    Special surprise coming to your email!
                  </p>
                )}
              </div>

              {checkInResult?.message && (
                <div className="mb-6">
                  <div className="bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 dark:border-green-500/30 p-4 rounded-lg text-center">
                    <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">{checkInResult.message}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={resetScanner}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg"
                >
                  Check In Another Guest
                </button>
              </div>
            </div>
          ) : checkInState === 'error' ? (
            <div className="bg-card border border-border rounded-lg shadow-lg p-4 sm:p-6">
              <div className="text-center mb-6">
                <div className="text-red-500 text-6xl mb-4">{getErrorIcon(errorMessage)}</div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">{getErrorTitle(errorMessage)}</h2>
              </div>

              {errorMessage && (
                <div className="mb-6">
                  <div className="bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 p-4 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={resetScanner}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg shadow-lg p-4 sm:p-6">
              <div className="text-center mb-6">
                <div className="text-green-500 text-6xl mb-4">✅</div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">QR Code Scanned!</h2>
              </div>

              {scannedData && (
                <div className="mb-6">
                  <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">Scanned Data:</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <code className="text-sm text-muted-foreground break-all">
                      {scannedData}
                    </code>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={resetScanner}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg"
                >
                  Scan Another
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6 sm:mt-8">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">
            Compatible with QR codes, barcodes, and all major code formats
          </p>
          <p className="text-xs text-muted-foreground">
            Optimized for iPad Safari compatibility
          </p>
        </div>
      </div>

      {checkInState === 'override-required' && overrideData && (
        <OverrideDialog
          open={true}
          onConfirm={handleOverrideConfirm}
          onCancel={handleOverrideCancel}
          currentCount={overrideData.currentCount}
          maxCount={overrideData.maxCount}
          guestName={typeof overrideData.guestData === 'object' ? overrideData.guestData.n : undefined}
          errorMessage={overrideData.errorMessage}
        />
      )}
    </div>
  );
}