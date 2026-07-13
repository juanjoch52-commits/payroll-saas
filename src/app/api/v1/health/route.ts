import { NextResponse } from 'next/server'

/**
 * GET /api/v1/health — endpoint público para uptime checks.
 * No requiere autenticación.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'jova',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  })
}
