/**
 * Mock Builders for Unit Tests
 * Provides Jest-compatible mocks for testing isolated components
 */

// Use global jest object (available in Jest test environment)
declare const jest: any;

/**
 * Prisma Mock Builder
 * Creates comprehensive Prisma client mocks for unit tests
 */
export class PrismaMockBuilder {
  private mockPrisma: any;

  constructor() {
    this.mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      guest: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      visit: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      invitation: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      location: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      policy: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      acceptance: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      discount: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $queryRaw: jest.fn(),
    };
  }

  build(): any {
    return this.mockPrisma;
  }

  reset(): this {
    Object.values(this.mockPrisma).forEach(model => {
      if (typeof model === 'object' && model !== null) {
        Object.values(model).forEach(method => {
          if (jest.isMockFunction(method)) {
            (method as jest.Mock).mockReset();
          }
        });
      }
    });
    
    // Reset top-level methods
    if (jest.isMockFunction(this.mockPrisma.$transaction)) {
      (this.mockPrisma.$transaction as jest.Mock).mockReset();
    }
    if (jest.isMockFunction(this.mockPrisma.$connect)) {
      (this.mockPrisma.$connect as jest.Mock).mockReset();
    }
    if (jest.isMockFunction(this.mockPrisma.$disconnect)) {
      (this.mockPrisma.$disconnect as jest.Mock).mockReset();
    }
    
    return this;
  }

  // Helper methods for common scenarios
  withUser(user: any): this {
    (this.mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (this.mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(user);
    return this;
  }

  withGuest(guest: any): this {
    (this.mockPrisma.guest.findUnique as jest.Mock).mockResolvedValue(guest);
    (this.mockPrisma.guest.findFirst as jest.Mock).mockResolvedValue(guest);
    return this;
  }

  withPolicy(policy: any): this {
    (this.mockPrisma.policy.findFirst as jest.Mock).mockResolvedValue(policy);
    (this.mockPrisma.policy.findUnique as jest.Mock).mockResolvedValue(policy);
    return this;
  }

  withLocation(location: any): this {
    (this.mockPrisma.location.findUnique as jest.Mock).mockResolvedValue(location);
    (this.mockPrisma.location.findFirst as jest.Mock).mockResolvedValue(location);
    return this;
  }

  withVisitCount(count: number): this {
    (this.mockPrisma.visit.count as jest.Mock).mockResolvedValue(count);
    return this;
  }

  withVisits(visits: any[]): this {
    (this.mockPrisma.visit.findMany as jest.Mock).mockResolvedValue(visits);
    return this;
  }

  withAcceptance(acceptance: any): this {
    (this.mockPrisma.acceptance.findFirst as jest.Mock).mockResolvedValue(acceptance);
    return this;
  }
}

/**
 * NextJS Request Mock Builder
 * Creates mock NextRequest objects for API route testing
 */
export class NextRequestMockBuilder {
  private mockRequest: any;

  constructor() {
    this.mockRequest = {
      json: jest.fn(),
      text: jest.fn(),
      url: 'http://localhost:3001/api/test',
      method: 'GET',
      headers: new Map(),
      nextUrl: {
        pathname: '/api/test',
        searchParams: new URLSearchParams(),
      },
    };
  }

  withMethod(method: string): this {
    this.mockRequest.method = method;
    return this;
  }

  withUrl(url: string): this {
    this.mockRequest.url = url;
    return this;
  }

  withJson(data: any): this {
    (this.mockRequest.json as jest.Mock).mockResolvedValue(data);
    return this;
  }

  withHeaders(headers: Record<string, string>): this {
    this.mockRequest.headers = new Map(Object.entries(headers));
    return this;
  }

  withAuthToken(token: string): this {
    this.mockRequest.headers.set('authorization', `Bearer ${token}`);
    return this;
  }

  build(): any {
    return this.mockRequest;
  }
}

/**
 * Validation Result Mock Builder
 * Creates mock validation results for testing business rules
 */
export class ValidationResultBuilder {
  static success(data?: any) {
    return {
      isValid: true,
      error: undefined,
      ...data,
    };
  }

  static failure(error: string, data?: any) {
    return {
      isValid: false,
      error,
      ...data,
    };
  }

  static hostCapacityFailure(currentCount: number, maxCount: number, locationName = 'Test Location') {
    return this.failure(
      `Host at capacity with ${currentCount} guests. Maximum ${maxCount} concurrent guests allowed at ${locationName}.`,
      { currentCount, maxCount }
    );
  }

  static guestLimitFailure(count: number, limit: number, nextEligibleDate?: Date) {
    return this.failure(
      `Guest has reached ${count} visits this month. Limit: ${limit} visits per 30 days.`,
      { currentCount: count, maxCount: limit, nextEligibleDate }
    );
  }

  static blacklistFailure() {
    return this.failure('Guest is not authorized for building access. Contact security for assistance.');
  }

  static termsFailure() {
    return this.failure('Guest needs to accept visitor terms before check-in. Email will be sent.');
  }

  static expiredTermsFailure() {
    return this.failure("Guest's visitor agreement has expired. New terms acceptance required.");
  }

  static qrExpiredFailure() {
    return this.failure('This QR code has expired. Please generate a new invitation.');
  }

  static locationClosedFailure(locationName = 'Building') {
    return this.failure(`${locationName} is closed for the night. Check-ins resume tomorrow morning.`);
  }

  static capacityFailure(locationName = 'Location', current = 100, max = 100) {
    return this.failure(`${locationName} has reached daily capacity (${current}/${max} visitors)`);
  }
}

/**
 * API Response Mock Builder
 * Creates consistent API response mocks for integration testing
 */
export class ApiResponseBuilder {
  static success(data?: any, message = 'Operation successful') {
    return {
      success: true,
      message,
      ...data,
    };
  }

  static error(message: string, details?: any) {
    return {
      success: false,
      message,
      error: message,
      ...details,
    };
  }

  static checkinSuccess(results: any[], summary?: any) {
    return this.success({
      results,
      summary: summary || {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    });
  }

  static invitationSuccess(invitation: any) {
    return this.success({
      invitation,
      qrCode: `data:image/png;base64,mock-qr-code-${invitation.id}`,
    });
  }
}

// Convenience exports for commonly used builders
export const mockPrisma = () => new PrismaMockBuilder();
export const mockRequest = () => new NextRequestMockBuilder();
export const validationResult = ValidationResultBuilder;
export const apiResponse = ApiResponseBuilder;