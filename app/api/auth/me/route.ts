import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const payload = getAuth(request)
  if (!payload) return NextResponse.json({ authenticated: false })

  return NextResponse.json({
    authenticated: true,
    user: payload,
    // A display name under its original key, which existing callers read.
    username: payload.name || payload.email,
    role: payload.role,
  })
}
