interface User {
  id: number
  fid: number
  username: string
  holder_address?: string | null
  connected_addresses?: string[]
}

interface NeynarUser {
  fid: number
  custodyAddress?: string
  username: string
  displayName: string
  pfp: { url: string }
  profile: { bio: { text: string; mentionedProfiles: any[] } }
  followerCount: number
  followingCount: number
  verifications: string[]
  activeStatus: string
}

interface NeynarNotification {
  hash: string
  parentHash: string
  parentUrl: null | string
  parentAuthor: { fid: string; username: string }
  author: NeynarUser
  text: string
  timestamp: string
  embeds: any[]
  mentionedProfiles: NeynarUser[]
  type: string
  reactions: { count: number; fids: number[] }
  recasts: { count: number; fids: number[] }
  recasters: any[]
  viewerContext: { liked: boolean; recasted: boolean }
  replies: { count: number }
  threadHash: null | string
}