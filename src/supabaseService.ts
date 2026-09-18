import type { PromptPost } from './types'
import { supabase } from './lib'

export async function fetchUserState(): Promise<{ liked: string[]; saved: string[]; following: string[] }> {
  if (!supabase) return { liked: [], saved: [], following: [] }
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return { liked: [], saved: [], following: [] }
  const [{ data: likes, error: likesError }, { data: saves, error: savesError }, { data: follows, error: followsError }] = await Promise.all([
    supabase.from('likes').select('post_id').eq('user_id', user.id),
    supabase.from('saves').select('post_id').eq('user_id', user.id),
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
  ])
  if (likesError || savesError || followsError) throw likesError ?? savesError ?? followsError
  return {
    liked: (likes ?? []).map(row => row.post_id),
    saved: (saves ?? []).map(row => row.post_id),
    following: (follows ?? []).map(row => row.following_id),
  }
}

export async function fetchPublicPosts(): Promise<PromptPost[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('posts')
    .select('id,title,description,prompt,negative_prompt,ai_model,likes_count,saves_count,copies_count,views_count,comments_count,remixes_count,created_at,profiles(id,username,display_name,avatar_url, bio,followers_count,following_count,posts_count),ai_tools(name),categories(name),post_images(image_type,storage_path),post_tags(tags(name))')
    .eq('status', 'published')
    .in('visibility', ['public', 'unlisted'])
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) throw error
  return (data ?? []).map((row: any) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const tool = Array.isArray(row.ai_tools) ? row.ai_tools[0] : row.ai_tools
    const category = Array.isArray(row.categories) ? row.categories[0] : row.categories
    const images = row.post_images ?? []
    const url = (type: string) => { const item = images.find((x: any) => x.image_type === type); return item ? supabase!.storage.from('post-images').getPublicUrl(item.storage_path).data.publicUrl : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80' }
    const tags = (row.post_tags ?? []).map((x: any) => { const t = Array.isArray(x.tags) ? x.tags[0] : x.tags; return t?.name }).filter(Boolean)
    return { id: row.id, title: row.title, description: row.description ?? '', prompt: row.prompt, negativePrompt: row.negative_prompt ?? '', tool: tool?.name ?? 'Other', model: row.ai_model ?? '', category: category?.name ?? 'Other', tags, before: url('before'), after: url('after'), likes: Number(row.likes_count ?? 0), saves: Number(row.saves_count ?? 0), copies: Number(row.copies_count ?? 0), views: Number(row.views_count ?? 0), comments: Number(row.comments_count ?? 0), remixes: Number(row.remixes_count ?? 0), createdAt: new Date(row.created_at).toLocaleDateString(), creator: { id: profile?.id ?? '', username: profile?.username ?? 'creator', name: profile?.display_name ?? 'PromptBook Creator', avatar: (profile?.display_name ?? 'PB').slice(0,2).toUpperCase(), bio: profile?.bio ?? '', followers: Number(profile?.followers_count ?? 0), following: Number(profile?.following_count ?? 0), posts: Number(profile?.posts_count ?? 0) } }
  })
}

export async function toggleLike(postId: string, liked: boolean) {
  if (!supabase) return
  if (liked) { const { error } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? ''); if (error) throw error }
  else { const user = (await supabase.auth.getUser()).data.user; if (!user) throw new Error('Please sign in to like prompts.'); const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: user.id }); if (error) throw error }
}

export async function toggleSave(postId: string, saved: boolean) {
  if (!supabase) return
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Please sign in to save prompts.')
  if (saved) { const { error } = await supabase.from('saves').delete().eq('post_id', postId).eq('user_id', user.id); if (error) throw error }
  else { const { error } = await supabase.from('saves').insert({ post_id: postId, user_id: user.id }); if (error) throw error }
}

export async function recordCopy(postId: string) {
  if (!supabase) return
  const user = (await supabase.auth.getUser()).data.user
  const { error } = await supabase.from('prompt_copies').insert({ post_id: postId, user_id: user?.id ?? null })
  if (error) throw error
  const { error: rpcError } = await supabase.rpc('increment_post_metric', { p_post_id: postId, p_metric: 'copies_count' })
  if (rpcError) throw rpcError
}

export async function toggleFollow(userId: string, following: boolean) {
  if (!supabase) return
  const me = (await supabase.auth.getUser()).data.user
  if (!me) throw new Error('Please sign in to follow creators.')
  if (following) { const { error } = await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', userId); if (error) throw error }
  else { const { error } = await supabase.from('follows').insert({ follower_id: me.id, following_id: userId }); if (error) throw error }
}

export async function createSupabasePost(input: { title:string; description:string; prompt:string; negativePrompt:string; tool:string; model:string; category:string; tags:string[]; beforeFile?:File; afterFile?:File }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Please sign in before publishing.')
  const [{ data: tool }, { data: category }] = await Promise.all([
    supabase.from('ai_tools').select('id').eq('name', input.tool).maybeSingle(),
    supabase.from('categories').select('id').eq('name', input.category).maybeSingle(),
  ])
  const { data: post, error } = await supabase.from('posts').insert({ user_id:user.id, title:input.title, description:input.description, prompt:input.prompt, negative_prompt:input.negativePrompt, ai_tool_id:tool?.id ?? null, ai_model:input.model, category_id:category?.id ?? null, visibility:'public', post_type: input.beforeFile ? 'ai_edit' : 'ai_generation', status:'published' }).select('id').single()
  if (error || !post) throw error ?? new Error('Could not create post.')
  const files = [{ file: input.beforeFile, type:'before' }, { file:input.afterFile, type:'after' }].filter(x=>x.file) as {file:File;type:string}[]
  const uploadedPaths: string[] = []
  try {
    for (const item of files) {
      const ext = item.file.name.split('.').pop()?.toLowerCase() || 'webp'
      const path = `${user.id}/${post.id}/${item.type}.${ext}`
      const upload = await supabase.storage.from('post-images').upload(path, item.file, { upsert:true, contentType:item.file.type || 'image/webp' })
      if (upload.error) throw upload.error
      uploadedPaths.push(path)
      const { error: imageError } = await supabase.from('post_images').insert({ post_id:post.id, image_type:item.type, storage_path:path, file_size:item.file.size })
      if (imageError) throw imageError
    }
    for (const raw of input.tags) {
      const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
      if (!slug) continue
      const { data: tag, error: tagError } = await supabase.from('tags').upsert({name:raw,slug},{onConflict:'slug'}).select('id').single()
      if (tagError || !tag) continue
      await supabase.from('post_tags').upsert({post_id:post.id,tag_id:tag.id})
    }
  } catch (e) {
    if (uploadedPaths.length) await supabase.storage.from('post-images').remove(uploadedPaths)
    await supabase.from('posts').delete().eq('id',post.id)
    throw e
  }
  return post.id as string
}
