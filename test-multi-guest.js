// Simple test script to verify multi-guest QR parsing
import { parseQRData } from './src/lib/qr-token.js';

// Test multi-guest QR data (as provided by user)
const multiGuestQR = JSON.stringify({
  "guests": [
    {
      "e": "Kiley18@hotmail.com",
      "n": "Fred Sanford"
    },
    {
      "e": "Kaley52@gmail.com", 
      "n": "Josh Denesik"
    },
    {
      "e": "Mallie_Zieme21@yahoo.com",
      "n": "Erma McCullough"
    }
  ]
});

console.log('Testing multi-guest QR parsing...');
console.log('Input data:', multiGuestQR);

try {
  const parsed = parseQRData(multiGuestQR);
  console.log('Parsed result:', JSON.stringify(parsed, null, 2));
  
  if (parsed.type === 'multi') {
    console.log('✅ Successfully detected multi-guest QR');
    console.log(`Found ${parsed.multiGuest.guests.length} guests:`);
    parsed.multiGuest.guests.forEach((guest, index) => {
      console.log(`  ${index + 1}. ${guest.n} (${guest.e})`);
    });
  } else {
    console.log('❌ Failed to detect multi-guest QR');
  }
} catch (error) {
  console.error('❌ Error parsing QR data:', error.message);
}

// Test single-guest format compatibility
console.log('\n\nTesting single-guest compatibility...');
const singleGuestToken = btoa(JSON.stringify({
  inviteId: 'test-123',
  guestEmail: 'test@example.com',
  hostId: 'host-123',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
}));

try {
  const parsed = parseQRData(singleGuestToken);
  console.log('Single guest parsed result:', JSON.stringify(parsed, null, 2));
  
  if (parsed.type === 'single') {
    console.log('✅ Successfully detected single-guest QR');
  } else {
    console.log('❌ Failed to detect single-guest QR');
  }
} catch (error) {
  console.error('❌ Error parsing single-guest QR:', error.message);
}