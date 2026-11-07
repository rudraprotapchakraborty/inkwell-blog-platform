import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { requireAdmin, getAuth } from '@/lib/auth'
import { sanitizeBlogInput, validateBlogInput } from '@/lib/blog-input'
import { listPublishedBlogs } from '@/lib/blogs-feed'
import { ensureBlogIndexes } from '@/lib/blog-db'

export async function GET() {
  try {
    return NextResponse.json(await listPublishedBlogs())
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch blogs' }, { status: 500 })
  }
}

/** Admins only; the admin who posts owns the result and is its byline. */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const auth = getAuth(request)!

  try {
    const db = await getDb()
    await ensureBlogIndexes()
    const input = sanitizeBlogInput(await request.json())

    const invalid = validateBlogInput(input)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

    const now = new Date()
    const doc = {
      ...input,
      // Stamped from the token, never from the body — this is what every later
      // edit and delete check is measured against.
      authorId: auth.sub,
      authorRole: auth.role,
      createdAt: now,
      updatedAt: now,
    }

    const result = await db.collection('blogs').insertOne(doc)
    return NextResponse.json({ ...doc, _id: result.insertedId }, { status: 201 })
  } catch (err: any) {
    if (err.code === 11000) return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    return NextResponse.json({ error: 'Failed to create blog' }, { status: 500 })
  }
}
