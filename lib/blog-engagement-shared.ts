/**
 * Types and limits shared by the engagement API routes and the client UI.
 * Kept free of `mongodb` imports so client components can import from it.
 */

export const MAX_NAME_LENGTH = 60
export const MAX_COMMENT_LENGTH = 1000
/** Cap on ids per batch lookup so a crafted query cannot ask for the whole collection. */
export const MAX_BATCH_IDS = 60

export interface BlogComment {
  _id: string
  /** Display name copied from the account at post time, so a later rename does
   *  not silently rewrite history in an existing thread. */
  name: string
  avatar: string
  text: string
  createdAt: string
  /** ISO timestamp of the last edit, or "" if never edited. */
  editedAt: string
  /**
   * Whether the account asking for this list may delete this comment: its
   * author, or an admin. Resolved on the server so the browser is never handed
   * other people's user ids to compare against.
   */
  canDelete: boolean
  /**
   * Whether they may edit it. Authors only — an admin moderating by rewriting
   * someone else's words would be worse than removing the comment outright,
   * so admins get delete without edit.
   */
  canEdit: boolean
}

/** Who is asking, for the purpose of resolving canDelete. */
export interface CommentViewer {
  userId: string
  isAdmin: boolean
}

export interface BlogEngagement {
  likes: number
  comments: number
  shares: number
  views: number
  /** Whether the calling visitor has already liked this post. */
  liked: boolean
}

/** Networks a share can be attributed to. `copy` covers link-copy and Instagram. */
export const SHARE_NETWORKS = ["facebook", "instagram", "x", "whatsapp", "copy"] as const
export type ShareNetwork = (typeof SHARE_NETWORKS)[number]

export function isShareNetwork(value: unknown): value is ShareNetwork {
  return typeof value === "string" && (SHARE_NETWORKS as readonly string[]).includes(value)
}

/**
 * Visitor ids are minted in the browser and stored in localStorage — they are a
 * de-duplication key, not an identity claim, so we only check the shape.
 */
const VISITOR_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

export function isValidVisitorId(value: unknown): value is string {
  return typeof value === "string" && VISITOR_ID_PATTERN.test(value)
}

export const EMPTY_ENGAGEMENT: BlogEngagement = {
  likes: 0,
  comments: 0,
  shares: 0,
  views: 0,
  liked: false,
}
