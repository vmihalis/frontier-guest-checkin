'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface InvitationDetails {
  id: string;
  hostName: string;
  guestName: string;
  inviteDate: string;
}

interface AcceptanceResult {
  success: boolean;
  message: string;
  invitation?: InvitationDetails;
}

export default function AcceptTermsPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [visitorAgreementAccepted, setVisitorAgreementAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AcceptanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError('No acceptance token provided');
        setLoading(false);
        return;
      }

      try {
        // For initial validation, we'll just check token format
        // The actual validation happens on form submission
        if (token.length > 10) {
          setValidToken(true);
        } else {
          setError('Invalid token format');
        }
      } catch {
        setError('Invalid token');
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted || !visitorAgreementAccepted) {
      setError('Please accept both Terms and Conditions and Visitor Agreement');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          termsAccepted,
          visitorAgreementAccepted,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          invitation: data.invitation,
        });
      } else {
        setError(data.error || 'Failed to process acceptance');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 bg-card border border-border rounded-lg shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-mono text-xl font-bold">ft</span>
            </div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium text-foreground">Validating invitation...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error && !validToken) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 bg-card border border-border rounded-lg shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/10 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 dark:text-red-400 text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Invalid Invitation</h1>
            <div className="bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 bg-card border border-border rounded-lg shadow-lg">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500/10 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-green-600 dark:text-green-400 text-4xl">✅</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">Terms Accepted!</h1>
            <div className="bg-green-50 border border-green-500/20 dark:border-green-500/30 rounded-lg p-4 mb-4">
              <p className="text-green-700 dark:text-green-400 font-medium">{result.message}</p>
            </div>
            {result.invitation && (
              <div className="bg-blue-500/10 dark:bg-blue-500/20 border-l-4 border-blue-500 rounded-r-lg p-4 mb-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Your host <strong>{result.invitation.hostName}</strong> can now generate your QR code for your visit.
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              You can close this page now.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted to-blue-50/50 dark:from-background dark:to-blue-950/20 py-4 md:py-12">
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <Card className="bg-card border border-border rounded-lg shadow-xl p-4 md:p-8">
          <div className="text-center mb-6 md:mb-10">
            <div className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 flex items-center justify-center">
              <img 
                src="/logo.JPG" 
                alt="Frontier Tower Logo" 
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4 px-2">
              Welcome to Frontier Tower
            </h1>
            <div className="bg-blue-500/10 dark:bg-blue-500/20 border-l-4 border-blue-500 rounded-r-lg p-3 md:p-4 max-w-2xl mx-auto">
              <p className="text-base md:text-lg text-blue-700 dark:text-blue-400">
                Before your visit, please review and accept our Terms and Visitor Agreement.
                <br className="hidden sm:block" />
                <span className="block sm:inline font-semibold">Your safety and security are our top priority.</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Terms and Conditions */}
            <div className="bg-card border-2 border-blue-500/20 dark:border-blue-500/30 rounded-xl p-4 md:p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4 md:mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-bold">📋</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  Terms and Conditions
                </h2>
              </div>
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 md:p-6 rounded-lg border-2 border-border max-h-60 md:max-h-80 overflow-y-auto text-sm text-foreground leading-normal">
                <div className="bg-blue-500/10 dark:bg-blue-500/20 border-l-4 border-blue-500 p-4 mb-4">
                  <h3 className="font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center">
                    <span className="mr-2">🏢</span> 1. General Agreement
                  </h3>
                  <p className="text-blue-700 dark:text-blue-400">
                    By visiting Frontier Tower, you agree to comply with all building policies, 
                    security procedures, and applicable laws. This agreement is effective for 
                    the duration of your visit.
                  </p>
                </div>
                
                <div className="bg-green-500/10 dark:bg-green-500/20 border-l-4 border-green-500 p-4 mb-4">
                  <h3 className="font-bold text-green-700 dark:text-green-400 mb-2 flex items-center">
                    <span className="mr-2">🔒</span> 2. Security and Safety
                  </h3>
                  <p className="text-green-700 dark:text-green-400">
                    You agree to follow all security protocols, including but not limited to: 
                    wearing visitor badges, being escorted by your host, and complying with 
                    building staff instructions. <strong>Your cooperation ensures everyone&apos;s safety.</strong>
                  </p>
                </div>
                
                <div className="bg-purple-500/10 dark:bg-purple-500/20 border-l-4 border-purple-500 p-4 mb-4">
                  <h3 className="font-bold text-purple-700 dark:text-purple-400 mb-2 flex items-center">
                    <span className="mr-2">🤐</span> 3. Confidentiality
                  </h3>
                  <p className="text-purple-700 dark:text-purple-400">
                    You acknowledge that you may be exposed to confidential information during 
                    your visit and agree to maintain strict confidentiality. <strong>Protecting our 
                    intellectual property is crucial.</strong>
                  </p>
                </div>
                
                <div className="bg-yellow-500/10 dark:bg-yellow-500/20 border-l-4 border-yellow-500 p-4 mb-4">
                  <h3 className="font-bold text-yellow-700 dark:text-yellow-400 mb-2 flex items-center">
                    <span className="mr-2">📷</span> 4. Photography and Recording
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-400">
                    Photography, video recording, or audio recording is <strong>strictly prohibited</strong> 
                    without prior written authorization. Please ask your host if you need to take photos.
                  </p>
                </div>
                
                <div className="bg-red-500/10 dark:bg-red-500/20 border-l-4 border-red-500 p-4">
                  <h3 className="font-bold text-red-700 dark:text-red-400 mb-2 flex items-center">
                    <span className="mr-2">⚖️</span> 5. Liability
                  </h3>
                  <p className="text-red-700 dark:text-red-400">
                    You visit Frontier Tower at your own risk. The building management is not 
                    liable for personal injuries or property damage unless caused by gross negligence.
                  </p>
                </div>
              </div>
              
              <div className="mt-4 md:mt-6 bg-muted border-2 border-blue-300 rounded-lg p-3 md:p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    className="mt-1 h-6 w-6 md:h-5 md:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
                  />
                  <label htmlFor="terms" className="text-sm md:text-base font-medium text-foreground cursor-pointer leading-normal">
                    I have <strong>carefully read and understand</strong> the Terms and Conditions above, 
                    and I agree to comply with all stated policies.
                  </label>
                </div>
              </div>
            </div>

            {/* Visitor Agreement */}
            <div className="bg-card border-2 border-green-500/20 dark:border-green-500/30 rounded-xl p-4 md:p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4 md:mb-6">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-bold">🤝</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  Visitor Agreement
                </h2>
              </div>
              <div className="bg-gradient-to-r from-gray-50 to-green-50 p-4 md:p-6 rounded-lg border-2 border-border max-h-60 md:max-h-80 overflow-y-auto text-sm text-foreground leading-normal">
                <div className="bg-blue-500/10 dark:bg-blue-500/20 border-l-4 border-blue-500 p-4 mb-4">
                  <h3 className="font-bold text-blue-700 dark:text-blue-400 mb-3 flex items-center">
                    <span className="mr-2">👤</span> Your Responsibilities as a Visitor
                  </h3>
                  <p className="text-blue-700 dark:text-blue-400 mb-3 font-medium">
                    As a visitor to Frontier Tower, you commit to:
                  </p>
                  <ul className="space-y-2 text-blue-700 dark:text-blue-400">
                    <li className="flex items-start"><span className="text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0">•</span><span>Check in and out properly using the designated systems</span></li>
                    <li className="flex items-start"><span className="text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0">•</span><span>Wear your visitor badge <strong>visibly at all times</strong></span></li>
                    <li className="flex items-start"><span className="text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0">•</span><span>Stay with your host or designated escort</span></li>
                    <li className="flex items-start"><span className="text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0">•</span><span>Respect other tenants and building occupants</span></li>
                    <li className="flex items-start"><span className="text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0">•</span><span>Report any security concerns immediately</span></li>
                    <li className="flex items-start"><span className="text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0">•</span><span>Follow all emergency procedures if announced</span></li>
                  </ul>
                </div>
                
                <div className="bg-red-500/10 dark:bg-red-500/20 border-l-4 border-red-500 p-4 mb-4">
                  <h3 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center">
                    <span className="mr-2">🚫</span> Strictly Prohibited Items & Activities
                  </h3>
                  <p className="text-red-700 dark:text-red-400 mb-3 font-medium">
                    For everyone&apos;s safety, the following are <strong>strictly prohibited</strong>:
                  </p>
                  <ul className="space-y-2 text-red-700 dark:text-red-400">
                    <li className="flex items-start"><span className="text-red-600 dark:text-red-400 mr-2 flex-shrink-0">•</span><span>Weapons or dangerous items of any kind</span></li>
                    <li className="flex items-start"><span className="text-red-600 dark:text-red-400 mr-2 flex-shrink-0">•</span><span>Illegal substances</span></li>
                    <li className="flex items-start"><span className="text-red-600 dark:text-red-400 mr-2 flex-shrink-0">•</span><span>Recording devices without authorization</span></li>
                    <li className="flex items-start"><span className="text-red-600 dark:text-red-400 mr-2 flex-shrink-0">•</span><span>Solicitation or distribution of materials</span></li>
                    <li className="flex items-start"><span className="text-red-600 dark:text-red-400 mr-2 flex-shrink-0">•</span><span>Disruptive behavior</span></li>
                  </ul>
                </div>
                
                <div className="bg-orange-500/10 dark:bg-orange-500/20 border-l-4 border-orange-500 p-4 mb-4">
                  <h3 className="font-bold text-orange-700 dark:text-orange-400 mb-3 flex items-center">
                    <span className="mr-2">👥</span> Guest Access Terms & Conditions
                  </h3>
                  <p className="text-orange-700 dark:text-orange-400 mb-3 font-medium">
                    As a guest at Frontier Tower, you must understand and comply with the following:
                  </p>
                  <ul className="space-y-2 text-orange-700 dark:text-orange-400">
                    <li className="flex items-start"><span className="text-orange-600 dark:text-orange-400 mr-2 flex-shrink-0">•</span><span><strong>Frequency Limit:</strong> You may enter the Tower a maximum of three (3) times per month</span></li>
                    <li className="flex items-start"><span className="text-orange-600 dark:text-orange-400 mr-2 flex-shrink-0">•</span><span><strong>Floor Access:</strong> You are not permitted on community floors unless explicit permission has been granted by the respective floor leads</span></li>
                    <li className="flex items-start"><span className="text-orange-600 dark:text-orange-400 mr-2 flex-shrink-0">•</span><span><strong>Check-In Required:</strong> You must check in at the entrance and will only be admitted once picked up by your hosting member (&quot;citizen&quot;)</span></li>
                    <li className="flex items-start"><span className="text-orange-600 dark:text-orange-400 mr-2 flex-shrink-0">•</span><span><strong>Accompaniment:</strong> You must remain with your hosting citizen at all times and may not move about the Tower independently</span></li>
                    <li className="flex items-start"><span className="text-orange-600 dark:text-orange-400 mr-2 flex-shrink-0">•</span><span><strong>Citizen-Only Events:</strong> You are not allowed to attend events designated as &quot;citizen-only&quot;</span></li>
                    <li className="flex items-start"><span className="text-orange-600 dark:text-orange-400 mr-2 flex-shrink-0">•</span><span><strong>Host Responsibility:</strong> Your hosting citizen is responsible for your conduct and compliance at all times</span></li>
                  </ul>
                </div>
                
                <div className="bg-muted border-l-4 border-muted-foreground p-4">
                  <h3 className="font-bold text-foreground mb-2 flex items-center">
                    <span className="mr-2">🔐</span> Data Collection & Privacy
                  </h3>
                  <p className="text-foreground">
                    Your visit information may be recorded for security and compliance purposes. 
                    This data is handled in accordance with our privacy policy and applicable laws.
                    <strong> We respect your privacy while maintaining building security.</strong>
                  </p>
                </div>
              </div>
              
              <div className="mt-4 md:mt-6 bg-muted border-2 border-green-500/30 dark:border-green-500/40 rounded-lg p-3 md:p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="visitor-agreement"
                    checked={visitorAgreementAccepted}
                    onCheckedChange={(checked) => setVisitorAgreementAccepted(checked === true)}
                    className="mt-1 h-6 w-6 md:h-5 md:w-5 text-green-600 dark:text-green-400 flex-shrink-0"
                  />
                  <label htmlFor="visitor-agreement" className="text-sm md:text-base font-medium text-foreground cursor-pointer leading-normal">
                    I have <strong>thoroughly reviewed and understand</strong> the Visitor Agreement above, 
                    and I commit to following all visitor responsibilities and restrictions.
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 dark:bg-red-500/20 border-l-4 border-red-500 rounded-r-lg p-3 md:p-4 mx-2 md:mx-0">
                <div className="flex items-center">
                  <span className="text-red-500 text-xl mr-2">⚠️</span>
                  <p className="text-red-700 dark:text-red-400 font-medium text-sm md:text-base">{error}</p>
                </div>
              </div>
            )}

            <div className="text-center pt-4 md:pt-6">
              <Button
                type="submit"
                disabled={!termsAccepted || !visitorAgreementAccepted || submitting}
                className={`w-full md:w-auto px-8 md:px-12 py-4 md:py-4 text-base md:text-lg font-bold rounded-lg transition-all opacity-100 min-h-[48px] ${
                  !termsAccepted || !visitorAgreementAccepted || submitting
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2 inline-block"></div>
                    Processing Your Acceptance...
                  </>
                ) : (
                  <>Accept Terms and Continue</>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                By clicking above, you confirm that you have read, understood, and agree to both documents.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}