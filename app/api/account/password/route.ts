import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { findUserByAuth, updatePassword, validatePassword } from '@/lib/users'

/**
 * Changes the signed-in account's password. An account that already has one
 * must prove it; an account that has only ever used Google sets its first
 * password here and can then sign in either way.
 */
export async function POST(request: NextRequest) {
  const auth = getAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { currentPassword = '', newPassword = '' } = await request.json()

    const user = await findUserByAuth(auth.sub)
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

    if (user.password && !(await bcrypt.compare(String(currentPassword), user.password))) {
      return NextResponse.json({ error: 'Your current password is not correct.' }, { status: 403 })
    }

    const weak = validatePassword(String(newPassword))
    if (weak) return NextResponse.json({ error: weak }, { status: 400 })

    if (user.password && (await bcrypt.compare(String(newPassword), user.password))) {
      return NextResponse.json({ error: 'Choose a password different from your current one.' }, { status: 400 })
    }

    await updatePassword(user._id, await bcrypt.hash(String(newPassword), 10))
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Changing the password failed:', err)
    return NextResponse.json({ error: 'Could not change your password. Please try again.' }, { status: 500 })
  }
}
