import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/mongodb'
import { canManageBlog, getAuth } from '@/lib/auth'
import { sanitizeBlogInput, validateBlogInput } from '@/lib/blog-input'

function toObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null
}

/**
 * Loads the post and decides whether the caller may change it. Returns the
 * response to send back on refusal, so PUT and DELETE stay in lockstep.
 *
 * A missing post reads as 404 only once the caller is known to be signed in —
 * an anonymous probe gets 401 either way and learns nothing about what exists.
 */
async function authorizeManage(request: NextRequest, id: string) {
  const auth = getAuth(request)
  if (!auth) return { denied: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const oid = toObjectId(id)
  if (!oid) return { denied: NextResponse.json({ error: 'Invalid id' }, { status: 400 }) }

  const db = await getDb()
  const blog = await db.collection('blogs').findOne({ _id: oid })
  if (!blog) return { denied: NextResponse.json({ error: 'Not found' }, { status: 404 }) }

  if (!canManageBlog(auth, blog)) {
    return { denied: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { db, oid, blog }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    const oid = toObjectId(id)

    const blog = await db.collection('blogs').findOne(
      oid ? { $or: [{ slug: id }, { _id: oid }] } : { slug: id }
    )

    if (!blog) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(blog)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const gate = await authorizeManage(request, id)
    if ('denied' in gate) return gate.denied
    const { db, oid } = gate

    const input = sanitizeBlogInput(await request.json())
    const invalid = validateBlogInput(input)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

    // `input` carries no `_id`, `authorId` or `createdAt`, so an edit can never
    // reassign ownership or backdate a post.
    const result = await db.collection('blogs').findOneAndUpdate(
      { _id: oid },
      { $set: { ...input, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const gate = await authorizeManage(request, id)
    if ('denied' in gate) return gate.denied
    const { db, oid } = gate

    await db.collection('blogs').deleteOne({ _id: oid })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
