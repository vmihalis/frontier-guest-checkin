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
        <Card className="max-w-md w-full mx-4 p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Validating invitation...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error && !validToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-6">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-6">
          <div className="text-center">
            <div className="text-green-500 text-4xl mb-4">✅</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Terms Accepted!</h1>
            <p className="text-gray-600 mb-4">{result.message}</p>
            {result.invitation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Your host <strong>{result.invitation.hostName}</strong> can now generate your QR code for your visit.
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-4">
              You can close this page now.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Card className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to Frontier Tower
            </h1>
            <p className="text-gray-600">
              Before your visit, please review and accept our Terms and Visitor Agreement
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Terms and Conditions */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Terms and Conditions
              </h2>
              <div className="bg-gray-50 p-4 rounded border max-h-60 overflow-y-auto text-sm text-gray-700">
                <h3 className="font-semibold mb-2">1. General</h3>
                <p className="mb-3">
                  By visiting Frontier Tower, you agree to comply with all building policies, 
                  security procedures, and applicable laws. This agreement is effective for 
                  the duration of your visit.
                </p>
                
                <h3 className="font-semibold mb-2">2. Security and Safety</h3>
                <p className="mb-3">
                  You agree to follow all security protocols, including but not limited to: 
                  wearing visitor badges, being escorted by your host, and complying with 
                  building staff instructions.
                </p>
                
                <h3 className="font-semibold mb-2">3. Confidentiality</h3>
                <p className="mb-3">
                  You acknowledge that you may be exposed to confidential information during 
                  your visit and agree to maintain strict confidentiality.
                </p>
                
                <h3 className="font-semibold mb-2">4. Photography and Recording</h3>
                <p className="mb-3">
                  Photography, video recording, or audio recording is strictly prohibited 
                  without prior written authorization.
                </p>
                
                <h3 className="font-semibold mb-2">5. Liability</h3>
                <p>
                  You visit Frontier Tower at your own risk. The building management is not 
                  liable for personal injuries or property damage unless caused by gross negligence.
                </p>
              </div>
              
              <div className="mt-4 flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                />
                <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                  I have read and agree to the Terms and Conditions
                </label>
              </div>
            </div>

            {/* Visitor Agreement */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Visitor Agreement
              </h2>
              <div className="bg-gray-50 p-4 rounded border max-h-60 overflow-y-auto text-sm text-gray-700">
                <h3 className="font-semibold mb-2">Visitor Responsibilities</h3>
                <p className="mb-3">
                  As a visitor to Frontier Tower, you agree to:
                </p>
                <ul className="list-disc pl-5 space-y-1 mb-3">
                  <li>Check in and out properly using the designated systems</li>
                  <li>Wear your visitor badge visibly at all times</li>
                  <li>Stay with your host or designated escort</li>
                  <li>Respect other tenants and building occupants</li>
                  <li>Report any security concerns immediately</li>
                  <li>Follow all emergency procedures if announced</li>
                </ul>
                
                <h3 className="font-semibold mb-2">Prohibited Items and Activities</h3>
                <p className="mb-3">
                  The following are strictly prohibited:
                </p>
                <ul className="list-disc pl-5 space-y-1 mb-3">
                  <li>Weapons or dangerous items of any kind</li>
                  <li>Illegal substances</li>
                  <li>Recording devices without authorization</li>
                  <li>Solicitation or distribution of materials</li>
                  <li>Disruptive behavior</li>
                </ul>
                
                <h3 className="font-semibold mb-2">Data Collection</h3>
                <p>
                  Your visit information may be recorded for security and compliance purposes. 
                  This data is handled in accordance with our privacy policy and applicable laws.
                </p>
              </div>
              
              <div className="mt-4 flex items-start space-x-2">
                <Checkbox
                  id="visitor-agreement"
                  checked={visitorAgreementAccepted}
                  onCheckedChange={(checked) => setVisitorAgreementAccepted(checked === true)}
                />
                <label htmlFor="visitor-agreement" className="text-sm text-gray-700 cursor-pointer">
                  I have read and agree to the Visitor Agreement
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="text-center">
              <Button
                type="submit"
                disabled={!termsAccepted || !visitorAgreementAccepted || submitting}
                className="w-full sm:w-auto px-8 py-3"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Accept Terms and Continue'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}