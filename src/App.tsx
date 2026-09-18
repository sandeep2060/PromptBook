import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Activity, ArrowLeft, ArrowRight, Bell, Bookmark, Check, ChevronDown, CircleUserRound, Clipboard,
  Compass, Copy, Download, Edit3, Eye, Flame, FolderHeart, Heart, Home, Image as ImageIcon, LayoutDashboard,
  LogIn, Menu, MessageCircle, MoreHorizontal, Plus, Search, Send, Settings, Share2, Sparkles, Star,
  Tag, TrendingUp, Upload, UserPlus, Users, X, Zap, BarChart3, ShieldCheck, Github, Mail
} from 'lucide-react'
import type { NotificationItem, PromptPost, Sort, Tab } from './types'
import { formatNumber, isSupabaseConfigured, supabase } from './lib'
import { fetchNotifications, fetchPublicPosts, fetchUserState, markAllNotificationsRead, recordCopy, toggleFollow as dbFollow, toggleLike as dbLike, toggleSave as dbSave, createSupabasePost } from './supabaseService'

const storageKey = 'promptbook-app-state-v1'

type LocalState = { posts: PromptPost[]; liked: string[]; saved: string[]; copied: Record<string, number>; following: string[]; comments: Record<string, string[]> }
const initialLocalState: LocalState = { posts: [], liked: [], saved: [], copied: {}, following: [], comments: {} }
const localCreator = { id: 'current-user', username: 'creator', name: 'PromptBook Creator', avatar: 'PB', bio: '', followers: 0, following: 0, posts: 0 }
const localNotifications: NotificationItem[] = []

function loadState(): LocalState {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return initialLocalState
    const parsed = JSON.parse(raw) as LocalState
    return { ...initialLocalState, ...parsed, posts: parsed.posts ?? [] }
  } catch { return initialLocalState }
}

function App() {
  const [state, setState] = useState<LocalState>(loadState)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup'
  const viewPosts = useMemo(() => state.posts.map(p => ({ ...p, liked: state.liked.includes(p.id), saved: state.saved.includes(p.id) })), [state.posts, state.liked, state.saved])

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(state)) }, [state])
  useEffect(() => { if (!isSupabaseConfigured) return; fetchPublicPosts().then(posts => setState(s => ({ ...s, posts }))).catch(() => setToast('Could not load Supabase posts')) }, [])
  useEffect(() => {
    if (!supabase) return
    const hydrateUserState = async () => {
      try {
        const userState = await fetchUserState()
        setState(s => ({ ...s, ...userState }))
      } catch {
        setToast('Could not restore your activity')
      }
    }
    hydrateUserState()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) hydrateUserState()
      else {
        setState(s => ({ ...s, liked: [], saved: [], following: [] }))
        navigate('/login')
      }
    })
  }, [navigate])
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 2400); return () => window.clearTimeout(t) }, [toast])

  const requireSignIn = async () => {
    const user = supabase ? (await supabase.auth.getUser()).data.user : null
    if (user) return true
    setToast('Please sign in to continue')
    navigate('/login')
    return false
  }
  const toggleLike = async (id: string) => { if (!await requireSignIn()) return; const liked = state.liked.includes(id); setState(s => ({ ...s, liked: liked ? s.liked.filter(x => x !== id) : [...s.liked, id] })); try { await dbLike(id, liked) } catch (e) { setState(s => ({ ...s, liked: liked ? [...s.liked, id] : s.liked.filter(x => x !== id) })); setToast(e instanceof Error ? e.message : 'Unable to update like') } }
  const toggleSave = async (id: string) => { if (!await requireSignIn()) return; const saved = state.saved.includes(id); setState(s => ({ ...s, saved: saved ? s.saved.filter(x => x !== id) : [...s.saved, id] })); try { await dbSave(id, saved) } catch (e) { setState(s => ({ ...s, saved: saved ? [...s.saved, id] : s.saved.filter(x => x !== id) })); setToast(e instanceof Error ? e.message : 'Unable to update save') } }
  const follow = async (id: string) => { if (!await requireSignIn()) return; const following = state.following.includes(id); setState(s => ({ ...s, following: following ? s.following.filter(x => x !== id) : [...s.following, id] })); try { await dbFollow(id, following) } catch (e) { setState(s => ({ ...s, following: following ? [...s.following, id] : s.following.filter(x => x !== id) })); setToast(e instanceof Error ? e.message : 'Unable to follow creator') } }
  const copyPrompt = async (post: PromptPost) => {
    if (!await requireSignIn()) return
    try { await navigator.clipboard.writeText(post.prompt) } catch {
      const area = document.createElement('textarea'); area.value = post.prompt; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove()
    }
    setState(s => ({ ...s, copied: { ...s.copied, [post.id]: (s.copied[post.id] ?? 0) + 1 } }))
    if (isSupabaseConfigured) { try { await recordCopy(post.id) } catch (e) { setToast(e instanceof Error ? e.message : 'Copy recorded locally') } }
    setToast('Prompt copied to clipboard')
  }
  const addPost = (post: PromptPost) => { setState(s => ({ ...s, posts: [post, ...s.posts] })); setToast('Prompt published successfully') }
  const deletePost = (id: string) => { setState(s => ({ ...s, posts: s.posts.filter(p => p.id !== id) })); setToast('Post deleted') }
  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setToast(error.message)
    else navigate('/login')
  }

  return <>
    {!isAuthRoute && <AppShell query={query} setQuery={setQuery} menuOpen={menuOpen} setMenuOpen={setMenuOpen} signOut={signOut} />}
    <Routes>
      <Route path="/" element={<HomePage posts={viewPosts} query={query} toggleLike={toggleLike} toggleSave={toggleSave} copyPrompt={copyPrompt} />} />
      <Route path="/explore" element={<ExplorePage posts={viewPosts} query={query} setQuery={setQuery} toggleLike={toggleLike} toggleSave={toggleSave} copyPrompt={copyPrompt} />} />
      <Route path="/trending" element={<ExplorePage posts={viewPosts} query={query} setQuery={setQuery} initialSort="copies" toggleLike={toggleLike} toggleSave={toggleSave} copyPrompt={copyPrompt} />} />
      <Route path="/create" element={<AuthGate><CreatePage onCreate={addPost} /></AuthGate>} />
      <Route path="/post/:id" element={<PostPage posts={viewPosts} copied={state.copied} toggleLike={toggleLike} toggleSave={toggleSave} copyPrompt={copyPrompt} follow={follow} deletePost={deletePost} />} />
      <Route path="/u/:username" element={<ProfilePage posts={viewPosts} following={state.following} follow={follow} toggleLike={toggleLike} toggleSave={toggleSave} copyPrompt={copyPrompt} />} />
      <Route path="/saved" element={<AuthGate><SavedPage posts={viewPosts} saved={state.saved} toggleSave={toggleSave} toggleLike={toggleLike} copyPrompt={copyPrompt} /></AuthGate>} />
      <Route path="/dashboard" element={<AuthGate><DashboardPage posts={viewPosts} copied={state.copied} /></AuthGate>} />
      <Route path="/notifications" element={<AuthGate><NotificationsPage /></AuthGate>} />
      <Route path="/settings" element={<AuthGate><SettingsPage /></AuthGate>} />
      <Route path="/login" element={isSupabaseConfigured ? <AuthPage mode="login" /> : <ConfigurationPage />} />
      <Route path="/signup" element={isSupabaseConfigured ? <AuthPage mode="signup" /> : <ConfigurationPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    {!isAuthRoute && <BottomNav />}
    {toast && <div className="toast"><Check size={16} />{toast}</div>}
  </>
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let active = true
    if (!supabase) {
      navigate('/login', { replace: true })
      return () => { active = false }
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      if (data.user) setAuthenticated(true)
      else navigate('/login', { replace: true })
      setChecking(false)
    })
    return () => { active = false }
  }, [navigate])

  if (checking || !authenticated) return null
  return <>{children}</>
}

function AppShell({ query, setQuery, menuOpen, setMenuOpen, signOut }: { query: string; setQuery: (v: string) => void; menuOpen: boolean; setMenuOpen: (v: boolean) => void; signOut: () => void }) {
  return <>
    <aside className="app-sidebar">
      <Link to="/" className="brand"><img src="/logo-mark.svg" alt="PromptBook" /><span>Prompt<span>Book</span></span></Link>
      <div className="sidebar-group"><small>Workspace</small><NavLink to="/"><Home/> Home</NavLink><NavLink to="/explore"><Compass/> Discover</NavLink><NavLink to="/trending"><Flame/> Trending</NavLink><NavLink to="/dashboard"><BarChart3/> Analytics</NavLink></div>
      <div className="sidebar-group"><small>Your space</small><NavLink to="/saved"><Bookmark/> Saved prompts</NavLink><NavLink to="/notifications"><Bell/> Activity</NavLink><NavLink to="/u/sandeep"><CircleUserRound/> Profile</NavLink></div>
      <div className="sidebar-bottom"><NavLink to="/settings"><Settings/> Settings</NavLink><Link to="/create" className="sidebar-create"><Plus/> New prompt</Link></div>
    </aside>
    <header className="topbar">
      <div className="topbar-inner">
        <button className="mobile-menu icon-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open navigation"><Menu/></button>
        <div className="mobile-brand"><Link to="/" className="brand"><img src="/logo-mark.svg" alt="PromptBook" /><span>Prompt<span>Book</span></span></Link></div>
        <div className="nav-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search prompts, creators, tags..."/><kbd>⌘ K</kbd></div>
        <div className="nav-actions">
          <Link className="create-btn" to="/create"><Plus size={18}/> Create</Link>
          <Link className="icon-btn notification-btn" to="/notifications" aria-label="Notifications"><Bell size={19}/><i/></Link>
          <button className="avatar-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Profile menu"><span>SG</span><ChevronDown size={14}/></button>
          {menuOpen && <div className="profile-menu"><Link to="/u/sandeep"><CircleUserRound/> Profile</Link><Link to="/saved"><Bookmark/> Saved</Link><Link to="/settings"><Settings/> Settings</Link><button onClick={signOut}><LogIn/> Sign out</button></div>}
        </div>
      </div>
      <div className={`mobile-drawer ${menuOpen ? 'open' : ''}`}><div className="mobile-drawer-head"><b>PromptBook</b><button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X/></button></div><nav><NavLink onClick={() => setMenuOpen(false)} to="/"><Home/> Home</NavLink><NavLink onClick={() => setMenuOpen(false)} to="/explore"><Compass/> Discover</NavLink><NavLink onClick={() => setMenuOpen(false)} to="/trending"><Flame/> Trending</NavLink><NavLink onClick={() => setMenuOpen(false)} to="/dashboard"><BarChart3/> Analytics</NavLink><NavLink onClick={() => setMenuOpen(false)} to="/saved"><Bookmark/> Saved prompts</NavLink><NavLink onClick={() => setMenuOpen(false)} to="/settings"><Settings/> Settings</NavLink></nav></div>
    </header>
  </>
}

function BottomNav() { return <nav className="bottom-nav"><NavLink to="/"><Home/><span>Home</span></NavLink><NavLink to="/explore"><Compass/><span>Explore</span></NavLink><Link to="/create" className="bottom-create"><Plus/></Link><NavLink to="/notifications"><Bell/><span>Alerts</span></NavLink><NavLink to="/u/sandeep"><CircleUserRound/><span>Profile</span></NavLink></nav> }

function HomePage({ posts, query, toggleLike, toggleSave, copyPrompt }: PageActions & { posts: PromptPost[]; query: string }) {
  const [tab, setTab] = useState<Tab>('for-you')
  const visible = useFilteredPosts(posts, query, tab, 'latest')
  return <main>
    <section className="hero container">
      <div className="hero-copy">
        <div className="eyebrow"><Sparkles size={15}/> AI prompt community</div>
        <h1>A calmer way to <em>work with prompts.</em></h1>
        <p>PromptBook helps you find useful prompts, understand why they work, and keep the best ideas close when you are ready to make something.</p>
        <div className="hero-actions"><Link to="/explore" className="primary-btn"><Compass size={18}/> Explore prompts</Link><Link to="/create" className="secondary-btn"><Plus size={18}/> Share a creation</Link></div>
        <div className="hero-trust"><span><Check/> Clear examples</span><span><Check/> Reusable prompts</span><span><Check/> Human creators</span></div>
      </div>
      <HeroVisual />
    </section>

    <section className="container intro-panel">
      <div className="intro-copy"><span className="section-kicker">How PromptBook helps</span><h2>Keep the useful part of the experiment.</h2><p>Most prompts disappear into chat history. PromptBook gives them a home: a place to learn from other people, save what works, and share the small details that make a result repeatable.</p></div>
      <div className="workflow-steps"><div><span>01</span><b>Find a starting point</b><p>Browse real examples instead of guessing at a blank page.</p></div><div><span>02</span><b>Understand the method</b><p>Read the exact prompt, model, notes, and before-and-after result.</p></div><div><span>03</span><b>Make it yours</b><p>Copy, save, remix, or publish a version that fits your work.</p></div></div>
    </section>

    <section className="container stat-strip">
      <StatPill label="Prompt library" value="8.4k" icon={<Sparkles size={15} />} />
      <StatPill label="Successful remixes" value="1.9k" icon={<TrendingUp size={15} />} />
      <StatPill label="Creator activity" value="94%" icon={<Users size={15} />} />
    </section>

    <section className="container section-space">
      <div className="section-head"><div><span className="section-kicker">Explore the community</span><h2>Fresh prompts, fresh ideas.</h2></div><Link to="/explore" className="text-link">View all <ArrowRight size={16}/></Link></div>
      <TabBar tab={tab} setTab={setTab}/>
      <PostGrid posts={visible} toggleLike={toggleLike} toggleSave={toggleSave} copyPrompt={copyPrompt}/>
    </section>

    <section className="container creator-strip">
      <div className="section-head"><div><span className="section-kicker">Featured creators</span><h2>Top operators this week.</h2></div></div>
      <div className="creator-list">
        {[...new Map(posts.map((post) => [post.creator.id, post.creator])).values()].map((creator) => (
          <Link key={creator.id} to={`/u/${creator.username}`} className="creator-card">
            <div className="creator-card-header">
              <span className="avatar-sm">{creator.avatar}</span>
              <div>
                <b>{creator.name}</b>
                <small>@{creator.username}</small>
              </div>
            </div>
            <p>{creator.bio}</p>
            <div className="creator-meta">
              <span>{creator.posts} posts</span>
              <span>{formatNumber(creator.followers)} followers</span>
            </div>
          </Link>
        ))}
      </div>
    </section>

    <section className="container feature-strip"><div><span className="section-kicker">A better prompt habit</span><h2>Less searching. More making.</h2><p className="feature-intro">PromptBook is built for the moment after inspiration: when you want to remember what worked and use it again.</p></div><div className="feature-grid"><Feature icon={<Copy/>} title="Keep the exact wording" text="Save the prompt behind a result, not just a screenshot."/><Feature icon={<ArrowRight/>} title="Learn from the process" text="See the choices, tools, and changes behind each idea."/><Feature icon={<BarChart3/>} title="Build your own library" text="Collect the workflows you want to return to."/></div></section>
  </main>
}

function StatPill({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="stat-pill"><span>{icon}</span><div><small>{label}</small><b>{value}</b></div></div>
}

function HeroVisual() {
  return <div className="hero-visual">
    <div className="glow g1"/>
    <div className="glow g2"/>
    <div className="hero-card hero-card-main">
      <div className="hero-card-head"><span className="live-dot"/> AI edit <span>•••</span></div>
      <div className="before-after-mini">
        <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1000&q=80" alt="Before"/>
        <div className="after-side"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1000&q=80" alt="After"/></div>
        <div className="divider"/>
      </div>
      <div className="hero-card-meta"><div><b>Cinematic Portrait Upgrade</b><small>ChatGPT · GPT Image</small></div><span className="mini-avatar">AE</span></div>
    </div>
    <div className="floating-stat"><Copy size={17}/><div><b>426</b><small>prompt copies</small></div></div>
    <div className="floating-tag"><Sparkles size={15}/> Natural DSLR look</div>
  </div>
}

function TabBar({ tab, setTab }: { tab: Tab; setTab: (v: Tab) => void }) { return <div className="tabs">{([['for-you','For you'],['trending','Trending'],['latest','Latest'],['following','Following']] as const).map(([v,l]) => <button key={v} className={tab === v ? 'active' : ''} onClick={() => setTab(v)}>{v === 'trending' && <Flame size={15}/>} {l}</button>)}</div> }

function ExplorePage({ posts, query, setQuery, initialSort = 'latest', toggleLike, toggleSave, copyPrompt }: PageActions & { posts: PromptPost[]; query: string; setQuery: (v:string)=>void; initialSort?: Sort }) {
  const [sort, setSort] = useState<Sort>(initialSort)
  const [category, setCategory] = useState('All')
  const [tool, setTool] = useState('All')
  const filtered = useMemo(() => posts.filter(p => (!query || `${p.title} ${p.prompt} ${p.tags.join(' ')} ${p.creator.username}`.toLowerCase().includes(query.toLowerCase())) && (category === 'All' || p.category === category) && (tool === 'All' || p.tool === tool)).sort((a,b) => sortValue(b, sort) - sortValue(a, sort)), [posts, query, category, tool, sort])
  return <main className="container page"><div className="page-heading"><div><span className="section-kicker">Discover</span><h1>Explore prompts</h1><p>Search real workflows from creators using today's AI tools.</p></div><Link to="/create" className="primary-btn"><Plus size={18}/> Create prompt</Link></div><div className="explore-toolbar"><div className="big-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search prompts, creators, tags..."/></div><select value={category} onChange={e=>setCategory(e.target.value)}>{['All','Portrait','Photography','Landscape','Product','Art'].map(x=><option key={x}>{x}</option>)}</select><select value={tool} onChange={e=>setTool(e.target.value)}>{['All','ChatGPT','Gemini','Midjourney','Flux','Leonardo AI'].map(x=><option key={x}>{x}</option>)}</select></div><div className="sort-row"><span>{filtered.length} prompts</span><div className="sort-pills">{([['latest','Latest'],['copies','Most copied'],['saves','Most saved'],['likes','Most liked']] as const).map(([v,l])=><button className={sort===v?'active':''} key={v} onClick={()=>setSort(v)}>{l}</button>)}</div></div><PostGrid posts={filtered} toggleLike={toggleLike} toggleSave={toggleSave} copyPrompt={copyPrompt}/></main>
}

function useFilteredPosts(posts: PromptPost[], query: string, tab: Tab, sort: Sort) { return useMemo(() => { let arr = posts.filter(p => !query || `${p.title} ${p.prompt} ${p.tags.join(' ')} ${p.creator.username}`.toLowerCase().includes(query.toLowerCase())); if (tab==='trending') arr = [...arr].sort((a,b)=>trendScore(b)-trendScore(a)); else if(tab==='latest') arr=[...arr].sort((a,b)=>sortValue(b,'latest')-sortValue(a,'latest')); else if(tab==='following') arr=arr.filter(p=>p.creator.id==='c1'||p.creator.id==='c2'); return arr.sort((a,b)=>sortValue(b,sort)-sortValue(a,sort)) }, [posts,query,tab,sort]) }
function trendScore(p: PromptPost) { return p.likes + p.saves*3 + p.copies*4 + p.comments*2 + p.remixes*5 + p.views*.1 }
function sortValue(p: PromptPost, sort: Sort) { if(sort==='copies') return p.copies; if(sort==='saves') return p.saves; if(sort==='likes') return p.likes; if(sort==='views') return p.views; return Date.parse(p.createdAt.replace('h ago','')) || p.views }

function PostGrid({ posts, toggleLike, toggleSave, copyPrompt }: PageActions & { posts: PromptPost[] }) { if(!posts.length) return <EmptyState icon={<Search/>} title="No prompts found" text="Try a different search or remove a filter."/>; return <div className="post-grid">{posts.map((post,i)=><PostCard key={post.id} post={post} index={i} toggleLike={toggleLike} toggleSave={toggleSave} copyPrompt={copyPrompt}/>)}</div> }

function PostCard({ post, index, toggleLike, toggleSave, copyPrompt }: PageActions & { post: PromptPost; index: number; key?: string }) { const liked = post.liked; return <article className="post-card" style={{'--delay': `${index*45}ms`} as React.CSSProperties}><Link to={`/post/${post.id}`} className="post-image-wrap"><img src={post.after} alt={post.title}/><span className="type-pill"><Sparkles size={12}/> AI result</span><span className="before-peek"><img src={post.before} alt="Original preview"/><b>Before</b></span></Link><div className="post-body"><div className="creator-row"><span className="avatar-sm">{post.creator.avatar}</span><div><Link to={`/u/${post.creator.username}`}><b>{post.creator.name}</b></Link><small>@{post.creator.username} · {post.createdAt}</small></div><button className="more-btn"><MoreHorizontal size={18}/></button></div><Link to={`/post/${post.id}`}><h3>{post.title}</h3></Link><div className="tool-line"><span>{post.tool}</span><i/> <span>{post.model}</span></div><div className="tag-row">{post.tags.slice(0,3).map(t=><span key={t}>#{t}</span>)}</div><div className="post-actions"><button className={post.liked?'active':''} onClick={()=>toggleLike(post.id)}><Heart size={17} fill={post.liked?'currentColor':'none'}/><span>{formatNumber(post.likes)}</span></button><button className={post.saved?'active':''} onClick={()=>toggleSave(post.id)}><Bookmark size={17} fill={post.saved?'currentColor':'none'}/><span>{formatNumber(post.saves)}</span></button><button onClick={()=>copyPrompt(post)}><Copy size={17}/><span>{formatNumber(post.copies)}</span></button><Link to={`/post/${post.id}`} className="open-link">View <ArrowRight size={15}/></Link></div></div></article> }

function PostPage({ posts, copied, toggleLike, toggleSave, copyPrompt, follow, deletePost }: PageActions & { posts: PromptPost[]; copied: Record<string,number>; follow:(id:string)=>void; deletePost:(id:string)=>void }) {
  const { id } = useParams(); const post = posts.find(p=>p.id===id); const [compare, setCompare] = useState(50); const [comment,setComment]=useState(''); const [comments,setComments]=useState<string[]>(['Which model did you use for this one?','The natural skin texture is a great touch.']); const ref=useRef<HTMLDivElement>(null); const nav=useNavigate();
  if(!post) return <NotFound />
  const onPointer=(e:React.PointerEvent)=>{ if(!ref.current) return; const r=ref.current.getBoundingClientRect(); setCompare(Math.min(100,Math.max(0,((e.clientX-r.left)/r.width)*100))) }
  const submitComment=()=>{if(comment.trim()){setComments(c=>[...c,comment.trim()]);setComment('')}}
  return <main className="container page detail-page"><button className="back-btn" onClick={()=>nav(-1)}><ArrowLeft size={17}/> Back</button><div className="detail-layout"><div><div className="compare" ref={ref} onPointerMove={e=>e.buttons===1&&onPointer(e)} onPointerDown={e=>{ref.current?.setPointerCapture(e.pointerId);onPointer(e)}}><img src={post.before} alt="Before"/><div className="after-clip" style={{width:`${compare}%`}}><img src={post.after} alt="After"/></div><span className="compare-label before">Before</span><span className="compare-label after">After</span><button className="compare-handle" style={{left:`${compare}%`}} aria-label="Drag to compare"><ArrowLeft size={12}/><ArrowRight size={12}/></button></div><div className="mobile-compare-hint">Drag the divider to compare</div></div><aside className="detail-info"><div className="creator-row detail-creator"><span className="avatar-md">{post.creator.avatar}</span><div><Link to={`/u/${post.creator.username}`}><b>{post.creator.name}</b></Link><small>@{post.creator.username}</small></div><button className="secondary-small" onClick={()=>follow(post.creator.id)}><UserPlus size={15}/> Follow</button></div><div className="detail-title"><span className="eyebrow">{post.category} · {post.tool}</span><h1>{post.title}</h1><p>{post.description}</p></div><div className="detail-stats"><Stat icon={<Eye/>} value={post.views} label="Views"/><Stat icon={<Copy/>} value={post.copies+(copied[post.id]??0)} label="Copies"/><Stat icon={<Bookmark/>} value={post.saves} label="Saves"/></div><div className="prompt-box"><div className="prompt-box-head"><span><Sparkles size={15}/> Prompt</span><button onClick={()=>copyPrompt(post)}><Copy size={15}/> Copy</button></div><p>{post.prompt}</p></div>{post.negativePrompt&&<div className="negative-box"><b>Negative prompt</b><p>{post.negativePrompt}</p></div>}<div className="tag-row detail-tags">{post.tags.map(t=><span key={t}>#{t}</span>)}</div><div className="detail-cta"><button className="primary-btn" onClick={()=>copyPrompt(post)}><Copy size={17}/> Copy prompt</button><button className="secondary-btn" onClick={async()=>{try{await navigator.clipboard.writeText(post.prompt)}catch{};setCompare(50);alert('Prompt copied. Start a new post and remix the wording.')}}><Sparkles size={17}/> Remix</button><button className="icon-btn" aria-label="Share prompt" onClick={async()=>{const url=window.location.href;if(navigator.share){try{await navigator.share({title:post.title,text:`${post.title} — PromptBook`,url})}catch{}}else{try{await navigator.clipboard.writeText(url);alert('Post link copied.')}catch{}}}}><Share2 size={18}/></button></div><div className="comment-box"><div className="comment-head"><h3>Discussion</h3><span>{comments.length} comments</span></div>{comments.map((c,i)=><div className="comment" key={`${c}-${i}`}><span className="avatar-sm">{i?'PW':'SG'}</span><div><b>{i?'PixelWizard':'You'}</b><p>{c}</p></div></div>)}<div className="comment-input"><input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitComment()} placeholder="Add a useful comment..."/><button onClick={submitComment}><Send size={16}/></button></div></div></aside></div></main>
}

function Stat({icon,value,label}:{icon:React.ReactNode;value:number;label:string}) { return <div><span>{icon}</span><b>{formatNumber(value)}</b><small>{label}</small></div> }

function CreatePage({ onCreate }: { onCreate: (p:PromptPost)=>void }) {
  const [title,setTitle]=useState(''); const [prompt,setPrompt]=useState(''); const [negativePrompt,setNegativePrompt]=useState(''); const [desc,setDesc]=useState(''); const [tool,setTool]=useState('ChatGPT'); const [category,setCategory]=useState('Photography'); const [tags,setTags]=useState(''); const [before,setBefore]=useState('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80'); const [after,setAfter]=useState('https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80'); const [step,setStep]=useState(1); const [beforeFile,setBeforeFile]=useState<File|undefined>(); const [afterFile,setAfterFile]=useState<File|undefined>(); const [publishing,setPublishing]=useState(false); const nav=useNavigate();
  const file=(setter:(v:string)=>void, setFile:(f?:File)=>void)=>(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(f){if(f.size>10*1024*1024){alert('Please choose an image under 10 MB.');return} setFile(f); setter(URL.createObjectURL(f))}}
  const valid=title.trim()&&prompt.trim()
  const publish=async()=>{if(!valid){alert('Add a title and prompt before publishing.');return} if(!afterFile){alert('Please upload the final AI result image before publishing.');setStep(1);return} setPublishing(true); try { await createSupabasePost({title,description:desc,prompt,negativePrompt,tool,model:tool==='Midjourney'?'V7':'Latest',category,tags:tags.split(',').map(x=>x.trim()).filter(Boolean),beforeFile,afterFile}); setPublishing(false); nav('/explore') } catch(e){ setPublishing(false); alert(e instanceof Error?e.message:'Could not publish') }}
  return <main className="container page create-page"><div className="page-heading"><div><span className="section-kicker">Create</span><h1>Publish a prompt</h1><p>Show the result, share the exact prompt, and let others remix your workflow.</p></div><span className="draft-chip"><Activity size={15}/> Autosave ready</span></div><div className="stepper">{['Images','Prompt','Details','Publish'].map((x,i)=><button key={x} className={step===i+1?'active':''} onClick={()=>setStep(i+1)}><span>{i+1}</span>{x}</button>)}</div><div className="create-layout"><div className="form-card">{step===1&&<><FieldLabel title="Before image" hint="Optional"/><ImageUpload value={before} setValue={setBefore} onFile={file(setBefore,setBeforeFile)} label="Original / before"/><FieldLabel title="After image" hint="Required"/><ImageUpload value={after} setValue={setAfter} onFile={file(setAfter,setAfterFile)} label="AI result / after"/><div className="form-nav"><span/> <button className="primary-btn" onClick={()=>setStep(2)}>Continue <ArrowRight size={17}/></button></div></>}{step===2&&<><FieldLabel title="Prompt title"/><input className="text-input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Cinematic motorcycle portrait" maxLength={100}/><FieldLabel title="Exact prompt"/><textarea className="prompt-textarea" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Paste the exact prompt you used..." rows={10}/><div className="char-count">{prompt.length}/5000</div><FieldLabel title="Negative prompt" hint="Optional"/><textarea className="text-input" value={negativePrompt} onChange={e=>setNegativePrompt(e.target.value)} placeholder="What should the model avoid?" rows={4}/><div className="form-nav"><button className="secondary-btn" onClick={()=>setStep(1)}><ArrowLeft size={17}/> Back</button><button className="primary-btn" onClick={()=>setStep(3)}>Continue <ArrowRight size={17}/></button></div></>}{step===3&&<><FieldLabel title="AI platform"/><div className="choice-grid">{['ChatGPT','Gemini','Midjourney','Flux','Leonardo AI','Other'].map(x=><button className={tool===x?'selected':''} key={x} onClick={()=>setTool(x)}><Sparkles size={15}/>{x}</button>)}</div><FieldLabel title="Category"/><select className="text-input" value={category} onChange={e=>setCategory(e.target.value)}>{['Photography','Portrait','Landscape','Product','Art','Automotive','Writing'].map(x=><option key={x}>{x}</option>)}</select><FieldLabel title="Tags" hint="Comma separated"/><input className="text-input" value={tags} onChange={e=>setTags(e.target.value)} placeholder="cinematic, dslr, natural, portrait"/><FieldLabel title="Description" hint="Optional"/><textarea className="text-input" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What makes this prompt useful?" rows={4}/><div className="form-nav"><button className="secondary-btn" onClick={()=>setStep(2)}><ArrowLeft size={17}/> Back</button><button className="primary-btn" onClick={()=>setStep(4)}>Preview <Eye size={17}/></button></div></>}{step===4&&<><div className="publish-preview"><div className="preview-images"><img src={before} alt="Before"/><img src={after} alt="After"/></div><span className="eyebrow">{category} · {tool}</span><h2>{title||'Untitled prompt'}</h2><p>{desc||'No description added.'}</p><div className="prompt-box"><div className="prompt-box-head"><span><Sparkles size={15}/> Prompt</span></div><p>{prompt||'Your exact prompt will appear here.'}</p></div></div><div className="form-nav"><button className="secondary-btn" onClick={()=>setStep(3)}><ArrowLeft size={17}/> Edit</button><button className="primary-btn" onClick={publish}><Upload size={17}/> {publishing?'Publishing...':'Publish prompt'}</button></div></>}</div><aside className="creation-tips"><div className="tips-icon"><Zap/></div><h3>Make your prompt useful</h3><ul><li><Check/> Keep the exact prompt, not a summary.</li><li><Check/> Show the real before/after when possible.</li><li><Check/> Add model + tool so others can reproduce it.</li><li><Check/> Explain one small trick that improved the result.</li></ul><div className="privacy-note"><ShieldCheck size={17}/><span>Images are only public when you publish a public post.</span></div></aside></div></main>
}

function FieldLabel({title,hint}:{title:string;hint?:string}) { return <div className="field-label"><b>{title}</b>{hint&&<span>{hint}</span>}</div> }
function ImageUpload({value,setValue,onFile,label}:{value:string;setValue:(v:string)=>void;onFile:(e:React.ChangeEvent<HTMLInputElement>)=>void;label:string}) { return <div className="upload-wrap"><label className="upload-card"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile}/>{value?<><img src={value} alt={label}/><span className="upload-overlay"><Upload size={17}/> Replace image</span></>:<span><ImageIcon size={28}/><b>Drop an image here</b><small>PNG, JPG or WEBP · max 10 MB</small></span>}</label>{value&&<button className="remove-upload" onClick={()=>setValue('')}><X size={15}/> Remove</button>}</div> }

function ProfilePage({ posts, following, follow, toggleLike, toggleSave, copyPrompt }: PageActions & { posts:PromptPost[]; following:string[]; follow:(id:string)=>void; }) { const {username}=useParams(); const creator=posts.find(p=>p.creator.username===username)?.creator ?? {...localCreator,username:username||'creator',name:username||'PromptBook Creator'}; const own=creator.username===username; const creatorPosts=posts.filter(p=>p.creator.username===creator.username); return <main className="container page"><section className="profile-hero"><div className="profile-avatar">{creator.avatar}</div><div className="profile-main"><div className="profile-name"><div><span className="section-kicker">Creator profile</span><h1>{creator.name}</h1><p>@{creator.username}</p></div>{!own&&<button className="primary-btn" onClick={()=>follow(creator.id)}><UserPlus size={17}/>{following.includes(creator.id)?'Following':'Follow'}</button>}</div><p className="bio">{creator.bio}</p><div className="profile-stats"><Stat icon={<ImageIcon/>} value={creator.posts} label="Posts"/><Stat icon={<Users/>} value={creator.followers} label="Followers"/><Stat icon={<UserPlus/>} value={creator.following} label="Following"/></div></div></section><div className="profile-tabs"><button className="active">Posts</button><button>Collections</button><button>About</button></div><PostGrid posts={creatorPosts} toggleLike={toggleLike} toggleSave={toggleSave} copyPrompt={copyPrompt}/></main> }

function SavedPage({ posts, saved, toggleSave, toggleLike, copyPrompt }: PageActions & { posts:PromptPost[]; saved:string[] }) { const list=posts.filter(p=>saved.includes(p.id)); return <main className="container page"><div className="page-heading"><div><span className="section-kicker">Library</span><h1>Your saved prompts</h1><p>Keep your best discoveries organized for later.</p></div><Link to="/explore" className="secondary-btn"><Compass size={17}/> Discover more</Link></div>{list.length?<PostGrid posts={list} toggleLike={toggleLike} toggleSave={toggleSave} copyPrompt={copyPrompt}/>:<EmptyState icon={<FolderHeart/>} title="Your library is empty" text="Save prompts you want to try and they'll appear here." action={<Link to="/explore" className="primary-btn">Explore prompts</Link>}/>}</main> }

function DashboardPage({posts,copied}:{posts:PromptPost[];copied:Record<string,number>}) { const exportData=()=>{const rows=[['Title','Creator','Tool','Copies','Likes','Saves','Views'],...posts.map(p=>[p.title,p.creator.username,p.tool,String(p.copies+(copied[p.id]??0)),String(p.likes),String(p.saves),String(p.views)])];const csv=rows.map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='promptbook-analytics.csv';a.click();URL.revokeObjectURL(url)}; const totalViews=posts.reduce((n,p)=>n+p.views,0), totalCopies=posts.reduce((n,p)=>n+p.copies+(copied[p.id]??0),0), totalLikes=posts.reduce((n,p)=>n+p.likes,0), totalSaves=posts.reduce((n,p)=>n+p.saves,0); return <main className="container page"><div className="page-heading"><div><span className="section-kicker">Creator studio</span><h1>Your analytics</h1><p>Understand which prompts people discover, save and copy.</p></div><button className="secondary-btn" onClick={exportData}><Download size={17}/> Export CSV</button></div><div className="metric-grid"><Metric title="Total views" value={totalViews} delta="+18.4%" icon={<Eye/>}/><Metric title="Prompt copies" value={totalCopies} delta="+24.8%" icon={<Copy/>}/><Metric title="Likes" value={totalLikes} delta="+12.1%" icon={<Heart/>}/><Metric title="Saves" value={totalSaves} delta="+9.7%" icon={<Bookmark/>}/></div><div className="dashboard-grid"><section className="chart-card"><div className="chart-head"><div><h3>Prompt copies</h3><span>Last 7 days</span></div><BarChart3/></div><div className="fake-chart"><div className="chart-line"/><div className="chart-bars">{[35,48,42,72,58,88,78].map((h,i)=><span key={i} style={{height:`${h}%`}}/>)}</div><div className="chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></section><section className="top-prompts"><div className="chart-head"><div><h3>Top prompts</h3><span>By copies</span></div><TrendingUp/></div>{[...posts].sort((a,b)=>b.copies-a.copies).slice(0,4).map((p,i)=><Link to={`/post/${p.id}`} className="top-row" key={p.id}><span className="rank">0{i+1}</span><img src={p.after} alt=""/><div><b>{p.title}</b><small>{p.tool} · {formatNumber(p.copies)} copies</small></div><ArrowRight size={16}/></Link>)}</section></div></main> }
function Metric({title,value,delta,icon}:{title:string;value:number;delta:string;icon:React.ReactNode}) { return <div className="metric"><span className="metric-icon">{icon}</span><small>{title}</small><b>{formatNumber(value)}</b><em><TrendingUp size={13}/> {delta}</em></div> }

function NotificationsPage(){const [items,setItems]=useState<NotificationItem[]>(localNotifications);const [loading,setLoading]=useState(Boolean(supabase));const [error,setError]=useState('');useEffect(()=>{if(!supabase){setLoading(false);return}fetchNotifications().then(setItems).catch(()=>setError('Could not load notifications.')).finally(()=>setLoading(false))},[]);const mark=async()=>{try{await markAllNotificationsRead();setItems(items.map(n=>({...n,read:true})))}catch{setError('Could not update notifications.')}};return <main className="container page narrow"><div className="page-heading"><div><span className="section-kicker">Activity</span><h1>Notifications</h1><p>Keep up with the conversations around your prompts.</p></div><button className="text-btn" onClick={mark} disabled={!items.some(n=>!n.read)}>Mark all read</button></div>{loading?<div className="notification-list"><div className="notification-skeleton"/><div className="notification-skeleton"/><div className="notification-skeleton"/></div>:error?<EmptyState icon={<Bell/>} title="Notifications unavailable" text={error}/>:<div className="notification-list">{items.length ? items.map(n=><div className={`notification ${n.read?'':'unread'}`} key={n.id}><span className={`notif-icon ${n.type}`}><Bell size={17}/></span><div><p>{n.text}</p><small>{n.time}</small></div>{!n.read&&<i/>}</div>) : <EmptyState icon={<Bell/>} title="No notifications yet" text="Activity around your prompts will appear here."/>}</div>}</main>}

function SettingsPage(){return <main className="container page narrow"><div className="page-heading"><div><span className="section-kicker">Account</span><h1>Settings</h1><p>Control your profile and PromptBook experience.</p></div></div><section className="settings-card"><Setting icon={<CircleUserRound/>} title="Profile" text="Update your name, username, avatar and bio."/><Setting icon={<Bell/>} title="Notifications" text="Choose which creator activity you want to receive."/><Setting icon={<ShieldCheck/>} title="Privacy" text="Manage public posts and account visibility."/><Setting icon={<Settings/>} title="Appearance" text="PromptBook uses a dark-first premium theme."/></section><div className="connection-card"><div><span className="status-dot"/><b>{isSupabaseConfigured?'Supabase connected':'Local mode active'}</b><p>{isSupabaseConfigured?'Your environment variables are configured.':'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to connect your project.'}</p></div><code>{isSupabaseConfigured?'CONNECTED':'LOCAL'}</code></div></main>}
function Setting({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="setting-row"><span>{icon}</span><div><b>{title}</b><p>{text}</p></div><ArrowRight/></div>}

function AuthPage({mode}:{mode:'login'|'signup'}) { const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [name,setName]=useState('');const [loading,setLoading]=useState(false);const [message,setMessage]=useState('');const nav=useNavigate(); const submit=async(e:React.FormEvent)=>{e.preventDefault();setLoading(true);setMessage('');if(supabase){const result=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password,options:{data:{display_name:name}}});setLoading(false);if(result.error){setMessage(result.error.message);return}setMessage(mode==='signup' && !result.data.session?'Check your email to confirm your account.':'');if(result.data.session)nav('/')}else{setLoading(false);nav('/')}}; const oauth=async(provider:'google'|'github')=>{if(!supabase){setMessage('Local mode is active. Add Supabase keys to enable social sign-in.');return}setLoading(true);setMessage('');const result=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin}});if(result.error){setLoading(false);setMessage(result.error.message)}}; return <main className="auth-page"><div className="auth-brand"><Link to="/" className="brand"><img src="/logo-mark.svg" alt=""/><span>Prompt<span>Book</span></span></Link></div><div className="auth-card"><div className="auth-head"><span className="eyebrow"><Sparkles size={14}/> Creator community</span><h1>{mode==='login'?'Welcome back.':'Create your account.'}</h1><p>{mode==='login'?'Sign in to keep your prompts, saves and creator activity in sync.':'Join creators sharing the prompts behind their best AI results.'}</p></div><form onSubmit={submit}>{mode==='signup'&&<label>Full name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}<label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input required type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label><button className="primary-btn auth-submit" disabled={loading}>{loading?'Please wait...':mode==='login'?'Log in':'Create account'}</button></form><div className="auth-divider"><span>or continue with</span></div><div className="oauth-row"><button type="button" onClick={()=>oauth('google')}><Mail size={16}/> Google</button><button type="button" onClick={()=>oauth('github')}><Github size={16}/> GitHub</button></div>{message&&<div className="auth-message">{message}</div>}<p className="auth-switch">{mode==='login'?<>Don't have an account? <Link to="/signup">Sign up</Link></>:<>Already have an account? <Link to="/login">Log in</Link></>}</p><div className="demo-note"><Zap size={15}/><span>{isSupabaseConfigured?'Connected to Supabase':'Demo mode: add Supabase env values to enable real accounts.'}</span></div></div></main>}

function Feature({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="feature"><span>{icon}</span><div><b>{title}</b><p>{text}</p></div></div>}
function EmptyState({icon,title,text,action}:{icon:React.ReactNode;title:string;text:string;action?:React.ReactNode}){return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{text}</p>{action}</div>}
function NotFound(){return <main className="container page"><EmptyState icon={<Compass/>} title="Page not found" text="The page you requested does not exist." action={<Link to="/" className="primary-btn">Back home</Link>}/></main>}

function ConfigurationPage(){return <main className="auth-page"><div className="auth-card"><div className="auth-head"><span className="eyebrow"><Sparkles size={14}/> Account access</span><h1>Connect PromptBook.</h1><p>Add your Supabase project settings to enable authentication, publishing and private workspace features.</p></div><Link to="/" className="primary-btn">Back to prompts</Link></div></main>}

type PageActions={toggleLike:(id:string)=>void;toggleSave:(id:string)=>void;copyPrompt:(p:PromptPost)=>void}

export default App

