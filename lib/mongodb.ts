import { MongoClient, Db } from 'mongodb'

let clientPromise: Promise<MongoClient> | null = null

function getClientPromise(): Promise<MongoClient> {
  if (clientPromise) return clientPromise

  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI environment variable is not set')

  if (process.env.NODE_ENV === 'development') {
    if (!(global as any)._mongoClientPromise) {
      ;(global as any)._mongoClientPromise = new MongoClient(uri).connect()
    }
    clientPromise = (global as any)._mongoClientPromise
  } else {
    clientPromise = new MongoClient(uri).connect()
  }

  return clientPromise!
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise()
  return client.db()
}
