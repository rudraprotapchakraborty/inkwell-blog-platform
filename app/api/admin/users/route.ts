import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { listAccounts } from '@/lib/users'

/** Account directory for the admin dashboard. Admin-only. */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied

  try {
    const accounts = await listAccounts()
    return NextResponse.json({
      admins: accounts.filter(a => a.role === 'admin'),
      members: accounts.filter(a => a.role !== 'admin'),
      total: accounts.length,
    })
  } catch (err) {
    console.error('Listing accounts failed:', err)
    return NextResponse.json({ error: 'Could not load accounts.' }, { status: 500 })
  }
}
