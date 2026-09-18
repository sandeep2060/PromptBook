export type Tab = 'for-you' | 'trending' | 'latest' | 'following'
export type Sort = 'latest' | 'copies' | 'saves' | 'likes' | 'views'
export type Visibility = 'public' | 'unlisted' | 'private'

export interface Creator {
  id: string
  username: string
  name: string
  avatar: string
  bio: string
  followers: number
  following: number
  posts: number
}

export interface PromptPost {
  id: string
  title: string
  description: string
  before: string
  after: string
  prompt: string
  negativePrompt?: string
  tool: string
  model: string
  category: string
  tags: string[]
  likes: number
  saves: number
  copies: number
  views: number
  comments: number
  remixes: number
  createdAt: string
  creator: Creator
  liked?: boolean
  saved?: boolean
}

export interface NotificationItem {
  id: string
  type: 'like' | 'save' | 'follow' | 'remix' | 'comment' | 'milestone' | 'copy'
  text: string
  time: string
  read: boolean
}
