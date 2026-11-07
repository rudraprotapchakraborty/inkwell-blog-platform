import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'
import { ObjectId, type Collection, type WithId } from 'mongodb'
import { getDb } from '@/lib/mongodb'
import type { AuthPayload, Role } from '@/lib/auth'

export type AuthProvider = 'password' | 'google'

export interface UserDoc {
  /** Lowercased, trimmed — the unique key for an account. */
  email?: string
  name?: string
  password?: string
  role: Role
  providers: AuthProvider[]
  googleId?: string
  avatar?: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

export interface OtpDoc {
  email: string
  purpose: OtpPurpose
  codeHash: string
  expiresAt: Date
  attempts: number
  lastSentAt: Date
  /** Registration details held until the code is confirmed, so an unverified email never becomes an account. */
  pending?: { name: string; password: string }
  /** For an email change: the account the new address is being confirmed for. */
  accountId?: string
}

export type OtpPurpose = 'verify' | 'reset' | 'email-change'

export const OTP_TTL_MS = 10 * 60 * 1000
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000
export const OTP_MAX_ATTEMPTS = 5

let indexesReady: Promise<void> | null = null

/** Mongo's codes for "an index on these keys/name already exists, with other options". */
const INDEX_CONFLICT_CODES = new Set([85, 86])

/**
 * Creates an index, rebuilding it when an older one with the same name exists
 * under different options — Mongo rejects rather than amends such a change, so
 * altering an index's options otherwise requires a manual drop against the
 * database before the app will start cleanly.
 */
async function ensureIndex(
  collection: Collection<any>,
  keys: Record<string, 1 | -1>,
  options: Parameters<Collection['createIndex']>[1],
): Promise<void> {
  try {
    await collection.createIndex(keys, options)
  } catch (err) {
    const code = (err as { code?: number }).code
    if (!code || !INDEX_CONFLICT_CODES.has(code)) throw err

    const name = Object.entries(keys).map(([field, dir]) => `${field}_${dir}`).join('_')
    await collection.dropIndex(name)
    await collection.createIndex(keys, options)
  }
}

async function ensureIndexes(): Promise<void> {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb()
      const users = db.collection('users')
      const otps = db.collection('auth_otps')

      // A partial filter so a document without an email cannot collide on null.
      await ensureIndex(users, { email: 1 }, {
        unique: true,
        partialFilterExpression: { email: { $type: 'string' } },
      })

      // Mongo drops expired codes on its own; no cleanup job to run.
      await ensureIndex(otps, { expiresAt: 1 }, { expireAfterSeconds: 0 })
      await ensureIndex(otps, { email: 1, purpose: 1 }, { unique: true })
    })().catch(err => {
      // Let a later call retry rather than caching the failure forever.
      indexesReady = null
      throw err
    })
  }
  return indexesReady
}

export async function usersCollection(): Promise<Collection<UserDoc>> {
  await ensureIndexes()
  const db = await getDb()
  return db.collection<UserDoc>('users')
}

async function otpsCollection(): Promise<Collection<OtpDoc>> {
  await ensureIndexes()
  const db = await getDb()
  return db.collection<OtpDoc>('auth_otps')
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(normaliseEmail(email))
}

/** Returns an error message when the password is too weak, or null when it passes. */
export function validatePassword(password: string): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  if (password.length > 200) return 'Password is too long.'
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number.'
  }
  return null
}

export async function findUserByEmail(email: string): Promise<WithId<UserDoc> | null> {
  const users = await usersCollection()
  return users.findOne({ email: normaliseEmail(email) })
}

/** The login form takes one field, and every account is keyed by its email. */
export async function findUserByIdentifier(identifier: string): Promise<WithId<UserDoc> | null> {
  const users = await usersCollection()
  return users.findOne({ email: normaliseEmail(identifier) })
}

/** Resolves the account behind a session, whose `sub` is always a Mongo id. */
export async function findUserByAuth(sub: string): Promise<WithId<UserDoc> | null> {
  if (!ObjectId.isValid(sub)) return null
  const users = await usersCollection()
  return users.findOne({ _id: new ObjectId(sub) })
}

/** Returns an error message when the display name is unusable, or null when it passes. */
export function validateName(name: unknown): string | null {
  if (typeof name !== 'string') return 'Name is required.'
  const trimmed = name.trim()
  if (trimmed.length < 1) return 'Name cannot be empty.'
  if (trimmed.length > 80) return 'Name must be 80 characters or fewer.'
  return null
}

export async function updateName(id: ObjectId, name: string): Promise<void> {
  const users = await usersCollection()
  await users.updateOne({ _id: id }, { $set: { name: name.trim(), updatedAt: new Date() } })
}

/** Sets the profile photo, or removes it (initials show instead) when `avatar` is null. */
export async function updateAvatar(id: ObjectId, avatar: string | null): Promise<void> {
  const users = await usersCollection()
  await users.updateOne(
    { _id: id },
    avatar ? { $set: { avatar, updatedAt: new Date() } } : { $unset: { avatar: "" }, $set: { updatedAt: new Date() } },
  )
}

/** Totals for the admin tabs in the account area. Counts only: no records leave the database. */
export async function countAccounts(): Promise<number> {
  const users = await usersCollection()
  return users.countDocuments()
}

/**
 * Moves the account to a confirmed new address and disconnects Google: the
 * Google login belonged to the old address, which is now free for someone to
 * register — so signing in with that Google account starts a new account
 * rather than reopening this one. The caller ensures a password exists first,
 * so the account always keeps a way in.
 */
export async function updateEmail(id: ObjectId, email: string): Promise<void> {
  const users = await usersCollection()
  await users.updateOne(
    { _id: id },
    {
      $set: { email: normaliseEmail(email), emailVerified: true, updatedAt: new Date() },
      $unset: { googleId: "" },
      $pull: { providers: "google" as AuthProvider },
    },
  )
}

/**
 * Stores a new password hash. An account that only signed in with Google gains
 * the password provider, so it can now sign in either way.
 */
export async function updatePassword(id: ObjectId, passwordHash: string): Promise<void> {
  const users = await usersCollection()
  await users.updateOne(
    { _id: id },
    { $set: { password: passwordHash, updatedAt: new Date() }, $addToSet: { providers: 'password' as AuthProvider } },
  )
}

export interface DirectoryEntry {
  id: string
  name: string
  email?: string
  role: Role
  providers: AuthProvider[]
  avatar?: string
  createdAt?: string
  lastLoginAt?: string
}

/**
 * Every account, for the admin dashboard. Explicitly projects the fields it
 * returns so a password hash can never reach the client by accident.
 */
export async function listAccounts(): Promise<DirectoryEntry[]> {
  const users = await usersCollection()
  const docs = await users
    .find({}, { projection: { password: 0 } })
    .sort({ createdAt: 1 })
    .toArray()

  return docs.map(doc => ({
    id: doc._id.toString(),
    name: doc.name || doc.email || 'Unknown',
    email: doc.email,
    role: doc.role,
    providers: doc.providers ?? ['password'],
    avatar: doc.avatar,
    createdAt: doc.createdAt?.toISOString(),
    lastLoginAt: doc.lastLoginAt?.toISOString(),
  }))
}

export function toAuthPayload(user: WithId<UserDoc>): AuthPayload {
  return {
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
    name: user.name || user.email,
    avatar: user.avatar,
  }
}

export async function touchLastLogin(id: ObjectId): Promise<void> {
  const users = await usersCollection()
  await users.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } })
}

/**
 * Creates the account for a confirmed email. New accounts are always `user` —
 * admin is only ever granted by promoting an account directly in the database.
 */
export async function createVerifiedUser(input: {
  email: string
  name: string
  password: string
}): Promise<WithId<UserDoc>> {
  const users = await usersCollection()
  const now = new Date()
  const doc: UserDoc = {
    email: normaliseEmail(input.email),
    name: input.name.trim() || normaliseEmail(input.email).split('@')[0],
    password: input.password,
    role: 'user',
    providers: ['password'],
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  }
  const result = await users.insertOne(doc as UserDoc)
  return { ...doc, _id: result.insertedId } as WithId<UserDoc>
}

/**
 * Signs in (or creates) the account behind a verified Google profile. When the
 * email already has a password account, Google is linked to it rather than
 * creating a duplicate — Google has verified the same address.
 */
export async function upsertGoogleUser(profile: {
  googleId: string
  email: string
  name?: string
  picture?: string
}): Promise<WithId<UserDoc>> {
  const users = await usersCollection()
  const email = normaliseEmail(profile.email)
  const now = new Date()

  // The Google id first, then the address. An email change unlinks Google, so
  // a Google login whose address moved away finds nothing and starts afresh.
  const existing =
    (await users.findOne({ googleId: profile.googleId })) ?? (await users.findOne({ email }))
  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      {
        $set: {
          googleId: profile.googleId,
          emailVerified: true,
          avatar: existing.avatar || profile.picture,
          name: existing.name || profile.name,
          updatedAt: now,
          lastLoginAt: now,
        },
        $addToSet: { providers: 'google' as AuthProvider },
      },
    )
    return (await users.findOne({ _id: existing._id })) as WithId<UserDoc>
  }

  const doc: UserDoc = {
    email,
    name: profile.name || email.split('@')[0],
    role: 'user',
    providers: ['google'],
    googleId: profile.googleId,
    avatar: profile.picture,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  }
  const result = await users.insertOne(doc as UserDoc)
  return { ...doc, _id: result.insertedId } as WithId<UserDoc>
}

function randomCode(): string {
  // randomInt keeps the code unguessable; Math.random would not.
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export interface IssueOtpResult {
  code: string
  retryAfterMs?: number
}

/**
 * Issues a code for an email, replacing any outstanding one. Returns
 * `retryAfterMs` instead of a code when the caller is inside the cooldown.
 */
export async function issueOtp(
  email: string,
  purpose: OtpPurpose,
  pending?: OtpDoc['pending'],
  accountId?: string,
): Promise<IssueOtpResult> {
  const otps = await otpsCollection()
  const key = { email: normaliseEmail(email), purpose }
  const now = new Date()

  const existing = await otps.findOne(key)
  if (existing) {
    const elapsed = now.getTime() - existing.lastSentAt.getTime()
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      return { code: '', retryAfterMs: OTP_RESEND_COOLDOWN_MS - elapsed }
    }
  }

  // A resend passes no `pending`, so carry the original signup details forward.
  const carried = pending ?? existing?.pending
  const owner = accountId ?? existing?.accountId

  const code = randomCode()
  await otps.replaceOne(
    key,
    {
      ...key,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      attempts: 0,
      lastSentAt: now,
      ...(carried ? { pending: carried } : {}),
      ...(owner ? { accountId: owner } : {}),
    },
    { upsert: true },
  )

  return { code }
}

/**
 * Discards an issued code. Used when the email fails to send, so a delivery
 * problem does not leave the visitor sitting through a resend cooldown for a
 * code that never arrived.
 */
export async function clearOtp(email: string, purpose: OtpPurpose): Promise<void> {
  const otps = await otpsCollection()
  await otps.deleteOne({ email: normaliseEmail(email), purpose })
}

/**
 * Lifts the resend cooldown without touching the pending signup details.
 *
 * Deleting the record outright would discard `pending` and bounce the visitor
 * back to the signup form; on a failed *resend* they should just be able to
 * press the button again.
 */
export async function allowOtpRetry(email: string, purpose: OtpPurpose): Promise<void> {
  const otps = await otpsCollection()
  await otps.updateOne({ email: normaliseEmail(email), purpose }, { $set: { lastSentAt: new Date(0) } })
}

export type OtpCheck =
  | { ok: true; pending?: OtpDoc['pending']; accountId?: string }
  | { ok: false; reason: 'missing' | 'expired' | 'too-many-attempts' | 'mismatch' }

/** Consumes a code. A correct code is deleted so it cannot be replayed. */
export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<OtpCheck> {
  const otps = await otpsCollection()
  const key = { email: normaliseEmail(email), purpose }

  const doc = await otps.findOne(key)
  if (!doc) return { ok: false, reason: 'missing' }

  if (doc.expiresAt.getTime() < Date.now()) {
    await otps.deleteOne(key)
    return { ok: false, reason: 'expired' }
  }

  if (doc.attempts >= OTP_MAX_ATTEMPTS) {
    await otps.deleteOne(key)
    return { ok: false, reason: 'too-many-attempts' }
  }

  if (!(await bcrypt.compare(String(code).trim(), doc.codeHash))) {
    await otps.updateOne(key, { $inc: { attempts: 1 } })
    return { ok: false, reason: 'mismatch' }
  }

  await otps.deleteOne(key)
  return { ok: true, pending: doc.pending, accountId: doc.accountId }
}

/** How many admins remain — the guard against demoting or deleting the last one. */
export async function countAdmins(): Promise<number> {
  const users = await usersCollection()
  return users.countDocuments({ role: 'admin' })
}

/** Promotes an account to admin or returns it to member. */
export async function setUserRole(id: ObjectId, role: Role): Promise<boolean> {
  const users = await usersCollection()
  const result = await users.updateOne({ _id: id }, { $set: { role, updatedAt: new Date() } })
  return result.matchedCount === 1
}

/**
 * Removes an account for good.
 *
 * Comments they wrote stay as history. Blog posts are deliberately left alone — they are published
 * site content, and deleting an author should not silently delete articles.
 */
export async function deleteUser(id: ObjectId): Promise<boolean> {
  const users = await usersCollection()
  const result = await users.deleteOne({ _id: id })
  if (result.deletedCount !== 1) return false

  const db = await getDb()
  try {
    await db.collection('cvs').deleteMany({ userId: id.toString() })
  } catch (err) {
    // The account is already gone; a failed cleanup should be visible in the
    // log rather than reported as a failed deletion.
    console.error('Deleted account but failed to remove its CVs:', err)
  }

  return true
}
