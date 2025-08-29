/**
 * React Email template for invitation emails
 */

import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
} from '@react-email/components';

interface InvitationEmailProps {
  guestName: string;
  hostName: string;
  acceptanceUrl: string;
}

export default function InvitationEmail({
  guestName,
  hostName,
  acceptanceUrl,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f6f9fc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white' }}>
          <Section style={{ padding: '30px' }}>
            <Heading
              style={{
                color: '#333',
                borderBottom: '2px solid #007bff',
                paddingBottom: '10px',
                marginTop: '0',
              }}
            >
              Welcome to Frontier Tower
            </Heading>
            
            <Text style={{ fontSize: '16px', color: '#333' }}>
              Hi {guestName},
            </Text>
            
            <Text style={{ fontSize: '16px', color: '#333' }}>
              You&apos;ve been invited to visit Frontier Tower by <strong>{hostName}</strong>.
            </Text>
            
            <Section
              style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                margin: '20px 0',
              }}
            >
              <Heading
                as="h3"
                style={{ marginTop: '0', color: '#007bff', fontSize: '18px' }}
              >
                Next Steps:
              </Heading>
              <Text style={{ margin: '10px 0', color: '#333' }}>
                1. Click the link below to accept our Terms and Visitor Agreement<br />
                2. Once accepted, your host will generate your QR code<br />
                3. Present the QR code at the Frontier Tower check-in kiosk
              </Text>
            </Section>
            
            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={acceptanceUrl}
                style={{
                  background: '#007bff',
                  color: 'white',
                  padding: '15px 30px',
                  textDecoration: 'none',
                  borderRadius: '5px',
                  display: 'inline-block',
                  fontWeight: 'bold',
                }}
              >
                Accept Terms & Continue
              </Button>
            </Section>
            
            <Text
              style={{
                color: '#666',
                fontSize: '14px',
                backgroundColor: '#fff3cd',
                padding: '15px',
                borderRadius: '5px',
                border: '1px solid #ffeaa7',
              }}
            >
              <strong>Important:</strong> You must accept the Terms and Visitor Agreement before your visit. 
              Your host will generate the QR code once you have completed the acceptance process.
            </Text>
            
            <Hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '30px 0' }} />
            
            <Text style={{ color: '#888', fontSize: '12px' }}>
              This invitation was sent by {hostName}. If you have questions about your visit, 
              please contact them directly.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}