import { NextRequest } from 'next/server';
import { clearSessionResponse } from '@/lib/auth';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  return clearSessionResponse();
}