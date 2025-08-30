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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-mono text-xl font-bold">ft</span>
            </div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-800">Validating invitation...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error && !validToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">Invalid Invitation</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-green-600 text-4xl">✅</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Terms Accepted!</h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800 font-medium">{result.message}</p>
            </div>
            {result.invitation && (
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Your host <strong>{result.invitation.hostName}</strong> can now generate your QR code for your visit.
                </p>
              </div>
            )}
            <p className="text-sm text-gray-600 mt-4">
              You can close this page now.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="bg-white border border-gray-300 rounded-lg shadow-xl p-8">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
              <span className="text-white font-mono text-2xl font-bold">ft</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Welcome to Frontier Tower
            </h1>
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4 max-w-2xl mx-auto">
              <p className="text-lg text-blue-800">
                Before your visit, please review and accept our Terms and Visitor Agreement.
                <br />
                <span className="font-semibold">Your safety and security are our top priority.</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Terms and Conditions */}
            <div className="bg-white border-2 border-blue-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-bold">📋</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Terms and Conditions
                </h2>
              </div>
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-lg border-2 border-gray-200 max-h-80 overflow-y-auto text-sm text-gray-800 leading-relaxed">
                <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-4">
                  <h3 className="font-bold text-blue-800 mb-2 flex items-center">
                    <span className="mr-2">🏢</span> 1. General Agreement
                  </h3>
                  <p className="text-blue-800">
                    By visiting Frontier Tower, you agree to comply with all building policies, 
                    security procedures, and applicable laws. This agreement is effective for 
                    the duration of your visit.
                  </p>
                </div>
                
                <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-4">
                  <h3 className="font-bold text-green-800 mb-2 flex items-center">
                    <span className="mr-2">🔒</span> 2. Security and Safety
                  </h3>
                  <p className="text-green-800">
                    You agree to follow all security protocols, including but not limited to: 
                    wearing visitor badges, being escorted by your host, and complying with 
                    building staff instructions. <strong>Your cooperation ensures everyone&apos;s safety.</strong>
                  </p>
                </div>
                
                <div className="bg-purple-100 border-l-4 border-purple-500 p-4 mb-4">
                  <h3 className="font-bold text-purple-800 mb-2 flex items-center">
                    <span className="mr-2">🤐</span> 3. Confidentiality
                  </h3>
                  <p className="text-purple-800">
                    You acknowledge that you may be exposed to confidential information during 
                    your visit and agree to maintain strict confidentiality. <strong>Protecting our 
                    intellectual property is crucial.</strong>
                  </p>
                </div>
                
                <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
                  <h3 className="font-bold text-yellow-800 mb-2 flex items-center">
                    <span className="mr-2">📷</span> 4. Photography and Recording
                  </h3>
                  <p className="text-yellow-800">
                    Photography, video recording, or audio recording is <strong>strictly prohibited</strong> 
                    without prior written authorization. Please ask your host if you need to take photos.
                  </p>
                </div>
                
                <div className="bg-red-100 border-l-4 border-red-500 p-4">
                  <h3 className="font-bold text-red-800 mb-2 flex items-center">
                    <span className="mr-2">⚖️</span> 5. Liability
                  </h3>
                  <p className="text-red-800">
                    You visit Frontier Tower at your own risk. The building management is not 
                    liable for personal injuries or property damage unless caused by gross negligence.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 bg-gray-50 border-2 border-blue-300 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    className="mt-1 h-5 w-5 text-blue-600"
                  />
                  <label htmlFor="terms" className="text-base font-medium text-gray-800 cursor-pointer leading-relaxed">
                    ✅ I have <strong>carefully read and understand</strong> the Terms and Conditions above, 
                    and I agree to comply with all stated policies.
                  </label>
                </div>
              </div>
            </div>

            {/* Visitor Agreement */}
            <div className="bg-white border-2 border-green-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-bold">🤝</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Visitor Agreement
                </h2>
              </div>
              <div className="bg-gradient-to-r from-gray-50 to-green-50 p-6 rounded-lg border-2 border-gray-200 max-h-80 overflow-y-auto text-sm text-gray-800 leading-relaxed">
                <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-4">
                  <h3 className="font-bold text-blue-800 mb-3 flex items-center">
                    <span className="mr-2">👤</span> Your Responsibilities as a Visitor
                  </h3>
                  <p className="text-blue-800 mb-3 font-medium">
                    As a visitor to Frontier Tower, you commit to:
                  </p>
                  <ul className="space-y-2 text-blue-800">
                    <li className="flex items-start"><span className="text-blue-600 mr-2">✓</span>Check in and out properly using the designated systems</li>
                    <li className="flex items-start"><span className="text-blue-600 mr-2">✓</span>Wear your visitor badge <strong>visibly at all times</strong></li>
                    <li className="flex items-start"><span className="text-blue-600 mr-2">✓</span>Stay with your host or designated escort</li>
                    <li className="flex items-start"><span className="text-blue-600 mr-2">✓</span>Respect other tenants and building occupants</li>
                    <li className="flex items-start"><span className="text-blue-600 mr-2">✓</span>Report any security concerns immediately</li>
                    <li className="flex items-start"><span className="text-blue-600 mr-2">✓</span>Follow all emergency procedures if announced</li>
                  </ul>
                </div>
                
                <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
                  <h3 className="font-bold text-red-800 mb-3 flex items-center">
                    <span className="mr-2">🚫</span> Strictly Prohibited Items & Activities
                  </h3>
                  <p className="text-red-800 mb-3 font-medium">
                    For everyone&apos;s safety, the following are <strong>strictly prohibited</strong>:
                  </p>
                  <ul className="space-y-2 text-red-800">
                    <li className="flex items-start"><span className="text-red-600 mr-2">✗</span>Weapons or dangerous items of any kind</li>
                    <li className="flex items-start"><span className="text-red-600 mr-2">✗</span>Illegal substances</li>
                    <li className="flex items-start"><span className="text-red-600 mr-2">✗</span>Recording devices without authorization</li>
                    <li className="flex items-start"><span className="text-red-600 mr-2">✗</span>Solicitation or distribution of materials</li>
                    <li className="flex items-start"><span className="text-red-600 mr-2">✗</span>Disruptive behavior</li>
                  </ul>
                </div>
                
                <div className="bg-gray-100 border-l-4 border-gray-500 p-4">
                  <h3 className="font-bold text-gray-800 mb-2 flex items-center">
                    <span className="mr-2">🔐</span> Data Collection & Privacy
                  </h3>
                  <p className="text-gray-800">
                    Your visit information may be recorded for security and compliance purposes. 
                    This data is handled in accordance with our privacy policy and applicable laws.
                    <strong> We respect your privacy while maintaining building security.</strong>
                  </p>
                </div>
              </div>
              
              <div className="mt-6 bg-gray-50 border-2 border-green-300 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="visitor-agreement"
                    checked={visitorAgreementAccepted}
                    onCheckedChange={(checked) => setVisitorAgreementAccepted(checked === true)}
                    className="mt-1 h-5 w-5 text-green-600"
                  />
                  <label htmlFor="visitor-agreement" className="text-base font-medium text-gray-800 cursor-pointer leading-relaxed">
                    ✅ I have <strong>thoroughly reviewed and understand</strong> the Visitor Agreement above, 
                    and I commit to following all visitor responsibilities and restrictions.
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
                <div className="flex items-center">
                  <span className="text-red-500 text-xl mr-2">⚠️</span>
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              </div>
            )}

            <div className="text-center pt-6">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-1">
                <Button
                  type="submit"
                  disabled={!termsAccepted || !visitorAgreementAccepted || submitting}
                  className={`w-full sm:w-auto px-12 py-4 text-lg font-bold rounded-lg transition-all ${
                    !termsAccepted || !visitorAgreementAccepted || submitting
                      ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                      : 'bg-white text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 hover:bg-gray-50'
                  }`}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500 mr-2 inline-block"></div>
                      Processing Your Acceptance...
                    </>
                  ) : (
                    <>🚀 Accept Terms and Continue to Frontier Tower</>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                By clicking above, you confirm that you have read, understood, and agree to both documents.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}