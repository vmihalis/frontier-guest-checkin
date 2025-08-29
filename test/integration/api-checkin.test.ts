import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { POST as multiGuestPOST } from '../../app/api/checkin/multi-guest/route';  // Adjust paths as needed
import { POST as singleGuestPOST } from '../../app/api/checkin/route';  // Assuming single guest route

// Helper to create mock request
function mockRequest(body: any): NextRequest {
  return {
    json: async () => body,
  } as NextRequest;
}

// Test suite
async function runTests() {
  console.log('🧪 Running API integration tests for check-in endpoints...');

  // Test multi-guest check-in
  try {
    const mockBody = {
      guest: { e: 'test@example.com', n: 'Test Guest' }
    };
    const req = mockRequest(mockBody);
    const res = await multiGuestPOST(req);
    
    assert.strictEqual(res.status, 200, 'Should return 200 OK');
    const data = await res.json();
    assert.strictEqual(data.success, true, 'Should succeed');
    console.log('✅ Multi-guest check-in passed');
  } catch (error) {
    console.error('❌ Multi-guest test failed:', (error as Error).message);
    process.exit(1);
  }

  // Test single-guest check-in (expand similarly)
  try {
    const mockBody = { /* single guest payload */ };
    const req = mockRequest(mockBody);
    const res = await singleGuestPOST(req);
    
    assert.strictEqual(res.status, 200, 'Should return 200 OK');
    // Add more assertions
    console.log('✅ Single-guest check-in passed');
  } catch (error) {
    console.error('❌ Single-guest test failed:', (error as Error).message);
    process.exit(1);
  }

  // Add more tests: error cases, validation failures, etc.

  console.log('🏆 All API check-in tests passed!');
  process.exit(0);
}

if (require.main === module) {
  runTests();
}
