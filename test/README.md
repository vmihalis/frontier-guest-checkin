# Frontier Guest Check-in Testing Framework

A principled testing setup for the visitor management system with comprehensive edge case coverage.

## Quick Start

```bash
# Generate mock data from current database
npm run test:generate

# Run multi-guest check-in with 3 real guests
npm run test:multi valid_three_guests

# List all available scenarios
npm run test:scenarios

# Run comprehensive test suite
npm run test:all
```

## Architecture

### Directory Structure
```
test/
├── utils/           # Core testing utilities
│   ├── TestDataFactory.ts      # Generate test entities
│   ├── QRPayloadGenerator.ts   # QR code payloads & validation
│   └── DatabaseHelpers.ts      # DB operations & verification
├── scenarios/       # Test scenario implementations
│   └── MultiGuestCheckin.ts    # Multi-guest check-in flows
├── fixtures/        # Static test data
│   └── multi-checkin-real.json # Real database guest data
└── integration/     # End-to-end tests (future)
```

## Core Components

### TestDataFactory
Builder pattern for creating consistent test entities:
```typescript
// Create basic entities
const guest = TestDataFactory.createGuest()
const host = TestDataFactory.createHost()
const visit = TestDataFactory.createVisit(guest.id, host.id)

// Create edge cases
const blacklistedGuest = TestDataFactory.createBlacklistedGuest()
const guestWithoutTerms = TestDataFactory.createGuestWithoutTerms()

// Create batches
const guests = TestDataFactory.createGuestBatch(10)

// Create scenarios
const visits = TestDataFactory.createScenario('atLimit', guest, host)
```

### QRPayloadGenerator
Generate and validate QR code payloads:
```typescript
// Single guest
const qr = QRPayloadGenerator.createSingleGuestPayload(guest)

// Multiple guests with signing
const qr = QRPayloadGenerator.createMultiGuestPayload(guests, {
  hostId: host.id,
  expiresIn: 3600,
  sign: true
})

// Validation
const validation = QRPayloadGenerator.validatePayload(parsed)
// { valid: true, errors: [] }
```

### DatabaseHelpers
Database operations and verification:
```typescript
// Setup/teardown
await DatabaseHelpers.setupBasicData()
await DatabaseHelpers.cleanup()

// Create test scenarios
const { guest, visits } = await DatabaseHelpers.createGuestWithVisits(5)
const { host, activeVisits } = await DatabaseHelpers.createHostWithActiveGuests(3)

// Verify business rules
const monthlyCheck = await DatabaseHelpers.verifyGuestMonthlyLimit(guestId)
const concurrentCheck = await DatabaseHelpers.verifyHostConcurrentLimit(hostId)

// Get occupancy
const occupancy = await DatabaseHelpers.getCurrentOccupancy()
```

## Available Test Scenarios

### 1. `valid_three_guests`
- 3 valid guests from real database
- All have terms accepted
- None blacklisted
- Within monthly limits

### 2. `large_group`
- 10 guests from database
- Mix of valid and edge cases
- Tests system capacity

### 3. `duplicate_person_different_emails`
- Same person with multiple email addresses
- Tests duplicate detection logic

### 4. `stress_test_50`
- 50 generated guests
- Performance and concurrency testing
- Database transaction stress

## Business Rule Testing

The framework automatically tests:

### Guest Limitations
- Monthly visit limit (default: 3)
- Terms acceptance requirement
- Blacklist enforcement
- Duplicate email detection

### Host Limitations
- Concurrent guest limit (default: 3)
- Override scenarios
- Capacity management

### System Edge Cases
- Expired QR codes
- Invalid signatures
- Malformed payloads
- Concurrent check-ins
- Midnight boundary crossing

## Command Reference

### Basic Commands
```bash
# Show available scenarios
npm run test:scenarios

# Generate new mock file from database
npm run test:generate

# Run specific scenario
npm run test:multi [scenario_name]

# Run comprehensive suite
npm run test:all
```

### Scenario Examples
```bash
# Test with 3 valid guests
npm run test:multi valid_three_guests

# Test large group handling
npm run test:multi large_group

# Test duplicate detection
npm run test:multi duplicate_person_different_emails

# Performance test with 50 guests
npm run test:multi stress_test_50
```

## Output Analysis

Each test provides:

### 1. QR Payload Validation
- Structure verification
- Signature validation
- Expiration checking

### 2. Database Validation
- Guest existence check
- Terms acceptance status
- Blacklist verification
- Monthly limit verification

### 3. Check-in Results
- Successful check-ins
- Failed attempts with reasons
- Business rule violations

### 4. System State
- Current occupancy
- Long-staying guests (>24h)
- Host capacity utilization

## Integration with CI/CD

### Environment Variables
```bash
# Test database (recommended separate from dev)
TEST_DATABASE_URL="postgresql://..."

# Debug output
DEBUG=true

# QR signing key
QR_SECRET="test-secret-key"
```

### GitHub Actions Integration
```yaml
- name: Run multi-guest tests
  run: |
    npm run db:seed
    npm run test:all
```

## Extending the Framework

### Adding New Scenarios
1. Create scenario in `test/fixtures/`
2. Add to `MultiGuestCheckinScenario`
3. Update test runner

### Custom Test Data
```typescript
// Add to TestDataFactory
static createCustomScenario() {
  return {
    guests: this.createGuestBatch(5, { 
      termsAcceptedAt: new Date(),
      country: 'CA' 
    }),
    host: this.createHost({ role: UserRole.admin })
  }
}
```

### Edge Case Validation
```typescript
// Add to QRPayloadGenerator.createTestScenarios()
customEdgeCase: () => {
  const guests = TestDataFactory.createGuestBatch(3)
  return this.createMultiGuestPayload(guests, {
    customField: 'value',
    sign: true
  })
}
```

## Best Practices

1. **Always reset data** between test runs
2. **Use deterministic seeds** for reproducible results  
3. **Test both success and failure paths**
4. **Verify business rules** before and after operations
5. **Generate realistic edge cases** from actual usage patterns
6. **Monitor performance** with large datasets
7. **Validate QR payloads** before attempting check-in

This framework replaces ad-hoc JSON files with a comprehensive, maintainable testing system that scales with your application.