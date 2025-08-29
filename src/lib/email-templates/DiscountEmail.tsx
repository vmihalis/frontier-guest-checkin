/**
 * React Email template for discount emails (3rd lifetime visit)
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
} from '@react-email/components';

interface DiscountEmailProps {
  guestName: string;
}

export default function DiscountEmail({ guestName }: DiscountEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f6f9fc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white' }}>
          {/* Header with gradient */}
          <Section
            style={{
              background: 'linear-gradient(135deg, #007bff, #0056b3)',
              color: 'white',
              padding: '30px',
              borderRadius: '8px 8px 0 0',
              textAlign: 'center',
            }}
          >
            <Heading style={{ margin: '0', fontSize: '28px' }}>
              🎉 Congratulations!
            </Heading>
            <Text style={{ margin: '10px 0 0 0', fontSize: '18px', opacity: '0.9' }}>
              You&apos;ve unlocked a special reward
            </Text>
          </Section>
          
          {/* Main content */}
          <Section
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            }}
          >
            <Text style={{ fontSize: '16px', color: '#333' }}>
              Hi {guestName},
            </Text>
            
            <Text style={{ fontSize: '16px', color: '#333' }}>
              Thank you for being a valued visitor to Frontier Tower! This was your{' '}
              <strong>3rd lifetime visit</strong>, and we&apos;d like to show our appreciation 
              with an exclusive offer.
            </Text>
            
            {/* Discount coupon */}
            <Section
              style={{
                background: '#fff3cd',
                border: '2px dashed #856404',
                padding: '20px',
                borderRadius: '8px',
                margin: '25px 0',
                textAlign: 'center',
              }}
            >
              <Heading
                as="h3"
                style={{ color: '#856404', marginTop: '0', fontSize: '18px' }}
              >
                🎁 Special Discount
              </Heading>
              <Text
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#856404',
                  margin: '10px 0',
                }}
              >
                20% OFF your next co-working day pass
              </Text>
              <Text
                style={{
                  color: '#856404',
                  marginBottom: '0',
                  fontSize: '14px',
                }}
              >
                Valid for 30 days from today
              </Text>
            </Section>
            
            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href="#"
                style={{
                  background: '#28a745',
                  color: 'white',
                  padding: '15px 30px',
                  textDecoration: 'none',
                  borderRadius: '5px',
                  display: 'inline-block',
                  fontWeight: 'bold',
                }}
              >
                Claim Your Discount
              </Button>
            </Section>
            
            <Text style={{ color: '#666', fontSize: '14px' }}>
              We&apos;re building a community of innovators, and regular visitors like you make 
              it special. Thank you for choosing Frontier Tower as your workspace destination!
            </Text>
          </Section>
          
          {/* Footer */}
          <Section style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '12px' }}>
            <Text style={{ margin: '0' }}>Frontier Tower | Building the Future Together</Text>
            <Text style={{ margin: '5px 0 0 0' }}>
              Questions? Contact us at support@frontiertower.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}