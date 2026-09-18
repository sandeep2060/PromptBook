import type { Creator, NotificationItem, PromptPost } from './types'

export const seedCreators: Creator[] = [
  {
    id: 'c1',
    username: 'sandeep',
    name: 'Sandeep Gaire',
    avatar: 'SG',
    bio: 'Building AI experiences that turn raw ideas into practical creative systems.',
    followers: 18420,
    following: 286,
    posts: 42,
  },
  {
    id: 'c2',
    username: 'lena',
    name: 'Lena Park',
    avatar: 'LP',
    bio: 'Visual storyteller and prompt engineer for cinematic portrait workflows.',
    followers: 9320,
    following: 198,
    posts: 27,
  },
  {
    id: 'c3',
    username: 'marin',
    name: 'Marin Vale',
    avatar: 'MV',
    bio: 'Commercial photography prompts with a premium editorial finish.',
    followers: 12840,
    following: 164,
    posts: 31,
  },
  {
    id: 'c4',
    username: 'nora',
    name: 'Nora Quinn',
    avatar: 'NQ',
    bio: 'Landscape and travel imagery with realistic lighting and color grading.',
    followers: 7610,
    following: 143,
    posts: 19,
  },
]

const cinematicPrompt =
  'Transform the portrait into a cinematic editorial image with realistic skin texture, soft directional light, premium DSLR depth, rich color contrast, subtle film grain, and natural detail. Preserve identity, clothing, and the original composition while making the result feel polished and authentic.'

export const seedPosts: PromptPost[] = [
  {
    id: 'p1',
    title: 'Cinematic portrait upgrade',
    description: 'A premium editorial polish that stays natural and believable.',
    before:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80',
    after:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80',
    prompt: cinematicPrompt,
    negativePrompt:
      'plastic skin, exaggerated features, over-sharpening, artificial HDR, extra fingers',
    tool: 'ChatGPT',
    model: 'GPT Image',
    category: 'Portrait',
    tags: ['cinematic', 'portrait', 'editorial', 'retouch'],
    likes: 248,
    saves: 86,
    copies: 426,
    views: 1284,
    comments: 32,
    remixes: 18,
    createdAt: '2h ago',
    creator: seedCreators[0],
  },
  {
    id: 'p2',
    title: 'Golden-hour travel scene',
    description: 'Enhance landscape depth and atmosphere without losing realism.',
    before:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
    after:
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80',
    prompt:
      'Create a polished travel-photography landscape with warm golden-hour light, realistic atmospheric depth, rich mountain textures, balanced highlights and shadows, and natural colors. Keep the composition faithful to the original frame while increasing drama and clarity.',
    negativePrompt: 'oversaturation, flat lighting, muddy shadows, ghost details',
    tool: 'Gemini',
    model: 'Imagen 3',
    category: 'Landscape',
    tags: ['travel', 'landscape', 'golden-hour', 'nature'],
    likes: 756,
    saves: 210,
    copies: 612,
    views: 3240,
    comments: 76,
    remixes: 44,
    createdAt: '5h ago',
    creator: seedCreators[3],
  },
  {
    id: 'p3',
    title: 'Studio product hero',
    description: 'A premium commercial setup with clean light and stronger product storytelling.',
    before:
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
    after:
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
    prompt:
      'Create a polished studio product shot with soft directional lighting, elegant reflections, premium neutral tones, realistic material detail, and controlled negative space. Keep the product geometry exact while improving the commercial presentation.',
    negativePrompt: 'warped edges, harsh reflections, artificial highlights, overblown shadows',
    tool: 'Flux',
    model: 'Flux Pro',
    category: 'Product',
    tags: ['product', 'commercial', 'studio', 'brand'],
    likes: 642,
    saves: 294,
    copies: 721,
    views: 6190,
    comments: 58,
    remixes: 39,
    createdAt: '2d ago',
    creator: seedCreators[2],
  },
  {
    id: 'p4',
    title: 'Natural color restoration',
    description: 'Bring back realism and tonal balance without flattening the image.',
    before:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    after:
      'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80',
    prompt:
      'Restore the image with balanced exposure, natural white balance, realistic color grading, preserved details, and soft contrast. Keep the mood grounded and authentic while making colors feel alive again.',
    negativePrompt: 'oversaturation, false colors, washed-out skin, blurry details',
    tool: 'ChatGPT',
    model: 'GPT Image',
    category: 'Photography',
    tags: ['restoration', 'color', 'photography', 'natural'],
    likes: 512,
    saves: 168,
    copies: 508,
    views: 2710,
    comments: 41,
    remixes: 21,
    createdAt: '3d ago',
    creator: seedCreators[1],
  },
]

export const seedNotifications: NotificationItem[] = [
  { id: 'n1', type: 'copy', text: 'Your “Cinematic portrait upgrade” hit 400 prompt copies.', time: '12 min ago', read: false },
  { id: 'n2', type: 'like', text: 'Lena liked your latest portrait prompt.', time: '1h ago', read: false },
  { id: 'n3', type: 'remix', text: 'Marin remixed your product hero workflow.', time: '3h ago', read: true },
  { id: 'n4', type: 'follow', text: 'Nora started following your profile.', time: 'Yesterday', read: true },
]
