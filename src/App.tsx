import React, { useEffect, useMemo, useState } from 'react'
import {
  Search, Heart, ShoppingBag, LogIn, LogOut, LayoutDashboard, Package,
  Users, Truck, ReceiptText, WalletCards, Menu, X, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, MessageCircle, Tag, BarChart3, Settings2, CircleDollarSign
} from 'lucide-react'
import { supabase } from './supabase'
import ProdutosAdmin from './admin/ProdutosAdmin'
import CategoriasAdmin from './admin/CategoriasAdmin'
import FornecedoresAdmin from './admin/FornecedoresAdmin'
import EntradasAdmin from './admin/EntradasAdminV161'
import RelatoriosAdmin from './admin/RelatoriosAdminV1621'
import ClientesAdmin from './admin/ClientesAdmin'
import VendasAdmin from './admin/VendasAdminV13'
import CrediarioAdmin from './admin/CrediarioAdmin'
import DashboardAdmin from './admin/DashboardAdmin'
import AjustesAdmin from './admin/AjustesAdmin'
import FinanceiroAdmin from './admin/FinanceiroAdminV18'
import ContasPagarAdmin from './admin/ContasPagarAdminV1711'
import CategoriasFinanceirasAdmin from './admin/CategoriasFinanceirasAdmin'
import CadastrosAdmin from './admin/CadastrosAdmin'
import FinanceirosAdmin from './admin/FinanceirosAdmin'

type Variante = { id: string; tamanho: string; disponivel: boolean }
type Imagem = { id: string; url: string | null; ordem: number; capa: boolean }
type ProdutoCatalogo = {
  id: string; sku: string | null; nome: string; descricao: string | null
  preco: number; preco_promocional: number | null; novo: boolean; promocao: boolean
  destaque: boolean; categoria_id: string | null; categoria: string | null
  estoque_total: number; status_estoque: 'disponivel'|'ultimas_unidades'|'indisponivel'
  variantes: Variante[]; imagens: Imagem[]; imagem_capa: string | null
}
type AdminProfile = { nome:string;role:'admin'|'operador';ativo:boolean;acesso_cadastros:boolean;acesso_entradas:boolean;acesso_vendas:boolean;acesso_relatorios:boolean;acesso_financeiros:boolean;acesso_ajustes:boolean }
type BannerCatalogo={id:string;titulo:string;subtitulo:string|null;imagem_url:string;imagem_mobile_url:string|null;texto_botao:string|null;link_url:string|null;ordem:number}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function App() {
  const [produtos, setProdutos] = useState<ProdutoCatalogo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [menu, setMenu] = useState(false)
  const [favoritos, setFavoritos] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('thita_favoritos') || '[]')) }
    catch { return new Set() }
  })
  const [sessionReady, setSessionReady] = useState(false)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loginErro, setLoginErro] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [recuperando, setRecuperando] = useState(()=>window.location.hash.includes('type=invite')||window.location.hash.includes('type=recovery')||window.location.search.includes('type=invite')||window.location.search.includes('type=recovery'))
  const [novaSenha, setNovaSenha] = useState('')
  const [produtoAberto, setProdutoAberto] = useState<ProdutoCatalogo | null>(null)
  const [imagemAtual, setImagemAtual] = useState(0)
  const [catalogoLogo,setCatalogoLogo]=useState('/logo-thita.png')
  const [banners,setBanners]=useState<BannerCatalogo[]>([])
  const [bannerAtual,setBannerAtual]=useState(0)

  async function carregarCatalogo() {
    setLoading(true); setErro('')
    const { data, error } = await supabase.from('catalogo_produtos').select('*')
      .order('destaque', { ascending: false }).order('created_at', { ascending: false })
    if (error) { setErro(error.message); setProdutos([]) }
    else setProdutos((data || []) as ProdutoCatalogo[])
    setLoading(false)
  }

  async function carregarAparencia(){const[c,b]=await Promise.all([supabase.from('catalogo_config_v17_22').select('logo_url').eq('id',1).maybeSingle(),supabase.from('banners_catalogo_v17_22').select('id,titulo,subtitulo,imagem_url,imagem_mobile_url,texto_botao,link_url,ordem').order('ordem')]);if(c.data?.logo_url)setCatalogoLogo(c.data.logo_url);if(!b.error)setBanners((b.data||[])as BannerCatalogo[])}

  async function carregarPerfil(userId?: string) {
    if (!userId) { setProfile(null); return }
    const { data, error } = await supabase.from('app_usuarios')
      .select('nome,role,ativo,acesso_cadastros,acesso_entradas,acesso_vendas,acesso_relatorios,acesso_financeiros,acesso_ajustes').eq('id', userId).single()
    if (error || !data?.ativo) { setProfile(null); return }
    setProfile(data as AdminProfile)
  }

  useEffect(() => {
    carregarCatalogo();void carregarAparencia()
    supabase.auth.getSession().then(async ({ data }) => {
      await carregarPerfil(data.session?.user.id); setSessionReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if(event === 'PASSWORD_RECOVERY') setRecuperando(true)
      window.setTimeout(async () => { await carregarPerfil(session?.user.id); setSessionReady(true) }, 0)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(()=>{if(banners.length<2)return;const timer=window.setInterval(()=>setBannerAtual(i=>(i+1)%banners.length),6000);return()=>window.clearInterval(timer)},[banners.length])

  useEffect(() => {
    localStorage.setItem('thita_favoritos', JSON.stringify([...favoritos]))
  }, [favoritos])

  useEffect(() => {
    setImagemAtual(0)
  }, [produtoAberto?.id])

  const categorias = useMemo(() =>
    ['Todos', ...Array.from(new Set(produtos.map(p => p.categoria).filter(Boolean) as string[])).sort()]
  , [produtos])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLocaleLowerCase('pt-BR')
    return produtos.filter(p => {
      const catOk = categoria === 'Todos' || p.categoria === categoria
      const buscaOk = !q || [p.nome, p.descricao || '', p.categoria || '', p.sku || '']
        .some(v => v.toLocaleLowerCase('pt-BR').includes(q))
      return catOk && buscaOk
    })
  }, [produtos, busca, categoria])

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoginErro(''); setLoginLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (error) { setLoginErro('E-mail ou senha inválidos.'); setLoginLoading(false); return }
    const { data: perfil, error: perfilErro } = await supabase.from('app_usuarios')
      .select('nome,role,ativo,acesso_cadastros,acesso_entradas,acesso_vendas,acesso_relatorios,acesso_financeiros,acesso_ajustes').eq('id', data.user.id).single()
    if (perfilErro || !perfil?.ativo) {
      await supabase.auth.signOut(); setLoginErro('Este usuário está sem acesso ao sistema.')
      setLoginLoading(false); return
    }
    setProfile(perfil as AdminProfile); setSenha(''); setAdminOpen(true); setLoginLoading(false)
  }

  async function logout() { await supabase.auth.signOut(); setProfile(null); setAdminOpen(false) }
  async function solicitarRecuperacao(){if(!email.trim()){setLoginErro('Informe seu e-mail primeiro.');return}const{error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:'https://www.thitastore.com.br'});setLoginErro(error?error.message:'Link de recuperação enviado para seu e-mail.')}
  async function atualizarSenha(e:React.FormEvent){e.preventDefault();if(novaSenha.length<8){setLoginErro('A senha deve ter pelo menos 8 caracteres.');return}const{error}=await supabase.auth.updateUser({password:novaSenha});if(error)setLoginErro(error.message);else{setRecuperando(false);setNovaSenha('');await supabase.auth.signOut();setLoginErro('Senha atualizada. Entre novamente.')}}

  function toggleFavorito(id: string) {
    setFavoritos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  if (!sessionReady) return <div className="min-h-screen grid place-items-center bg-[#fffafc]"><RefreshCw className="animate-spin text-[#c80082]" /></div>
  if (adminOpen && profile) return <AdminShell profile={profile} onLogout={logout} onVoltar={() => setAdminOpen(false)} />

  return <div className="min-h-screen bg-[#fffafc] text-zinc-900">
    {recuperando&&<div className="fixed inset-0 z-[150] bg-black/60 p-4 grid place-items-center"><form onSubmit={atualizarSenha} className="bg-white rounded-[24px] p-6 w-full max-w-md"><h2 className="text-xl font-black">Definir nova senha</h2><p className="mt-1 text-xs text-zinc-500">Use pelo menos 8 caracteres.</p><input type="password" required minLength={8} className="input mt-4" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} placeholder="Nova senha"/><button className="botao mt-4 w-full">Salvar nova senha</button></form></div>}
    <header className="sticky top-0 z-40 border-b border-rose-100/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
        <button className="md:hidden p-2" onClick={() => setMenu(true)} aria-label="Abrir menu"><Menu /></button>
        <div className="flex items-center gap-3">
          <img src={catalogoLogo} alt="THITA" className="h-14 w-auto object-contain" />
          <div className="hidden sm:block"><p className="text-[10px] uppercase tracking-[.28em] text-zinc-400">Moda & estilo</p><p className="text-xs font-semibold text-zinc-700">Catálogo online</p></div>
        </div>
        <div className="hidden md:flex items-center gap-2 rounded-full bg-zinc-50 border border-zinc-200 px-4 h-11 w-[390px]">
          <Search size={17} className="text-zinc-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto, categoria ou referência..." className="w-full bg-transparent outline-none text-sm" />
        </div>
        <button onClick={() => profile ? setAdminOpen(true) : document.getElementById('login')?.scrollIntoView({behavior:'smooth'})}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 h-10 text-xs font-semibold hover:border-[#c80082] hover:text-[#c80082] transition">
          {profile ? <LayoutDashboard size={16}/> : <LogIn size={16}/>}<span className="hidden sm:inline">{profile ? 'Painel' : 'Admin'}</span>
        </button>
      </div>
    </header>

    <main>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-8">{banners.length>0?(()=>{const b=banners[Math.min(bannerAtual,banners.length-1)];return <div className="relative overflow-hidden rounded-[28px] bg-zinc-950 min-h-[300px] md:min-h-[390px]"><picture><source media="(max-width: 640px)" srcSet={b.imagem_mobile_url||b.imagem_url}/><img src={b.imagem_url} alt={b.titulo} className="absolute inset-0 w-full h-full object-cover"/></picture><div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent"/><div className="relative min-h-[300px] md:min-h-[390px] p-7 md:p-12 max-w-2xl text-white flex flex-col justify-end"><span className="inline-flex self-start rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] font-bold tracking-widest uppercase">Destaque THITA</span><h1 className="mt-4 text-4xl md:text-6xl font-black tracking-[-0.04em] leading-[.95]">{b.titulo}</h1>{b.subtitulo&&<p className="mt-4 max-w-lg text-sm md:text-base text-zinc-100 leading-relaxed">{b.subtitulo}</p>}{b.texto_botao&&b.link_url&&<a href={b.link_url} className="mt-5 self-start h-11 px-5 rounded-full bg-white text-zinc-950 font-black text-xs flex items-center">{b.texto_botao}</a>}</div>{banners.length>1&&<div className="absolute bottom-4 right-5 flex gap-2">{banners.map((x,i)=><button key={x.id} aria-label={`Banner ${i+1}`} onClick={()=>setBannerAtual(i)} className={`h-2 rounded-full transition-all ${i===bannerAtual?'w-8 bg-white':'w-2 bg-white/50'}`}/>)}</div>}</div>})():<div className="relative overflow-hidden rounded-[28px] bg-zinc-950 min-h-[300px] md:min-h-[390px] flex items-end"><div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_75%_20%,#c80082,transparent_38%)]"/><div className="relative p-7 md:p-12 max-w-2xl text-white"><span className="inline-flex rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold tracking-widest uppercase">THITA Store</span><h1 className="mt-5 text-4xl md:text-6xl font-black tracking-[-0.04em] leading-[.95]">Seu estilo,<br/><span className="text-[#ff70c8]">do seu jeito.</span></h1><p className="mt-5 max-w-lg text-sm md:text-base text-zinc-300 leading-relaxed">Conheça as novidades, encontre seu tamanho e fale conosco para garantir sua peça.</p></div></div>}</section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-7">
        <div className="md:hidden flex items-center gap-2 rounded-2xl bg-white border border-zinc-200 px-4 h-12 mb-4">
          <Search size={17} className="text-zinc-400" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar no catálogo..." className="w-full bg-transparent outline-none text-sm" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categorias.map(cat => <button key={cat} onClick={() => setCategoria(cat)}
            className={`shrink-0 rounded-full px-4 h-9 text-xs font-semibold border transition ${categoria === cat ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>{cat}</button>)}
        </div>
      </section>

      <section id="produtos" className="mx-auto max-w-7xl px-4 sm:px-6 pb-16">
        <div className="flex items-end justify-between mb-5"><div><p className="text-[11px] uppercase tracking-[.2em] font-bold text-[#c80082]">Catálogo</p><h2 className="text-2xl font-black tracking-tight">{categoria === 'Todos' ? 'Todos os produtos' : categoria}</h2></div><span className="text-xs text-zinc-400">{filtrados.length} produto(s)</span></div>
        {erro && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Não foi possível carregar o catálogo: {erro}</div>}
        {loading && <div className="py-20 grid place-items-center"><RefreshCw className="animate-spin text-[#c80082]" /></div>}
        {!loading && !erro && filtrados.length === 0 && <div className="rounded-[24px] bg-white border border-zinc-200 py-20 text-center"><ShoppingBag className="mx-auto text-zinc-300" size={34}/><h3 className="mt-3 font-bold">Nenhum produto por aqui ainda</h3><p className="mt-1 text-sm text-zinc-500">Assim que novos produtos forem cadastrados, eles aparecerão automaticamente.</p></div>}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {filtrados.map(p => {
            const preco = p.promocao && p.preco_promocional != null ? Number(p.preco_promocional) : Number(p.preco)
            const tamanhos = (p.variantes || []).filter(v => v.disponivel)
            return <article key={p.id} onClick={() => setProdutoAberto(p)} role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setProdutoAberto(p) }}
              className="group bg-white rounded-[22px] border border-zinc-200 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#c80082]/40">
              <div className="relative aspect-[4/5] bg-zinc-100 overflow-hidden">
                {p.imagem_capa ? <img src={p.imagem_capa} alt={p.nome} className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500" /> : <div className="w-full h-full grid place-items-center text-zinc-300"><Package size={34}/></div>}
                <button onClick={(e) => { e.stopPropagation(); toggleFavorito(p.id) }} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 grid place-items-center shadow-sm"><Heart size={17} className={favoritos.has(p.id) ? 'fill-[#c80082] text-[#c80082]' : 'text-zinc-600'} /></button>
                <div className="absolute top-3 left-3 flex flex-col gap-1">{p.novo && <span className="rounded-full bg-zinc-950 text-white px-2.5 py-1 text-[9px] font-black">NOVO</span>}{p.promocao && <span className="rounded-full bg-[#c80082] text-white px-2.5 py-1 text-[9px] font-black">OFERTA</span>}</div>
              </div>
              <div className="p-3.5 md:p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">{p.categoria || 'THITA'}</p><h3 className="mt-1 font-bold text-sm md:text-base leading-tight">{p.nome}</h3>
                <div className="mt-3 flex flex-wrap gap-1 min-h-6">{tamanhos.slice(0,5).map(v => <span key={v.id} className="px-2 py-1 rounded-md bg-zinc-50 border border-zinc-200 text-[10px] font-bold">{v.tamanho}</span>)}</div>
                <div className="mt-3">{p.promocao && p.preco_promocional != null && <p className="text-[11px] text-zinc-400 line-through">{money.format(Number(p.preco))}</p>}<p className="text-lg font-black">{money.format(preco)}</p><p className={`mt-1 text-[10px] font-semibold ${p.status_estoque === 'indisponivel' ? 'text-red-500' : p.status_estoque === 'ultimas_unidades' ? 'text-amber-600' : 'text-emerald-600'}`}>{p.status_estoque === 'indisponivel' ? 'Indisponível' : p.status_estoque === 'ultimas_unidades' ? 'Últimas unidades' : 'Disponível'}</p></div>
              </div>
            </article>
          })}
        </div>
      </section>

      {!profile && <section id="login" className="border-t border-zinc-200 bg-white"><div className="mx-auto max-w-7xl px-4 sm:px-6 py-14"><div className="max-w-md mx-auto rounded-[26px] border border-zinc-200 p-6 md:p-8 shadow-sm">
        <div className="w-11 h-11 rounded-2xl bg-[#fff0f8] text-[#c80082] grid place-items-center"><ShieldCheck /></div><h2 className="mt-4 text-xl font-black">Área administrativa</h2><p className="mt-1 text-sm text-zinc-500">Acesso protegido pelo Supabase Auth.</p>
        <form onSubmit={login} className="mt-5 space-y-3"><input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail" className="w-full h-12 rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#c80082]" /><input type="password" required autoComplete="current-password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Senha" className="w-full h-12 rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#c80082]" />{loginErro && <p className="text-xs text-red-600">{loginErro}</p>}<button disabled={loginLoading} className="w-full h-12 rounded-xl bg-zinc-950 text-white text-sm font-bold hover:bg-[#c80082] disabled:opacity-60 transition">{loginLoading ? 'Entrando...' : 'Entrar no painel'}</button><button type="button" onClick={solicitarRecuperacao} className="w-full text-xs font-bold text-[#c80082]">Esqueci minha senha</button></form>
      </div></div></section>}
    </main>


    {produtoAberto && (() => {
      const imagens = (produtoAberto.imagens || [])
        .filter(i => !!i.url)
        .sort((a,b) => Number(b.capa) - Number(a.capa) || a.ordem - b.ordem)
      const galeria = imagens.length
        ? imagens.map(i => i.url as string)
        : (produtoAberto.imagem_capa ? [produtoAberto.imagem_capa] : [])
      const atual = Math.min(imagemAtual, Math.max(0, galeria.length - 1))
      const precoAtual = produtoAberto.promocao && produtoAberto.preco_promocional != null
        ? Number(produtoAberto.preco_promocional)
        : Number(produtoAberto.preco)
      const tamanhos = (produtoAberto.variantes || []).filter(v => v.disponivel)
      const prev = () => setImagemAtual(i => galeria.length ? (i - 1 + galeria.length) % galeria.length : 0)
      const next = () => setImagemAtual(i => galeria.length ? (i + 1) % galeria.length : 0)
      const waMsg = encodeURIComponent(`Olá! Vim pelo catálogo THITA e gostaria de saber mais sobre ${produtoAberto.nome}${produtoAberto.sku ? ` (Ref. ${produtoAberto.sku})` : ''}.`)
      return <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm p-3 md:p-6 overflow-y-auto" onClick={() => setProdutoAberto(null)}>
        <div className="min-h-full grid place-items-center">
          <div className="w-full max-w-5xl bg-white rounded-[26px] overflow-hidden shadow-2xl grid md:grid-cols-[1.08fr_.92fr]" onClick={e => e.stopPropagation()}>
            <div className="bg-zinc-100 min-h-[360px] md:min-h-[650px] flex flex-col">
              <div className="relative flex-1 min-h-[360px] md:min-h-[540px] overflow-hidden">
                {galeria.length > 0
                  ? <img src={galeria[atual]} alt={produtoAberto.nome} className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 grid place-items-center text-zinc-300"><Package size={48}/></div>
                }

                <button onClick={() => setProdutoAberto(null)} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/95 shadow grid place-items-center md:hidden"><X size={18}/></button>

                {galeria.length > 1 && <>
                  <button onClick={prev} aria-label="Imagem anterior" className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow grid place-items-center hover:bg-white"><ChevronLeft size={20}/></button>
                  <button onClick={next} aria-label="Próxima imagem" className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow grid place-items-center hover:bg-white"><ChevronRight size={20}/></button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 text-white text-[11px] font-bold px-3 py-1.5">{atual + 1} / {galeria.length}</div>
                </>}
              </div>

              {galeria.length > 1 && <div className="bg-white border-t border-zinc-200 p-3">
                <div className="flex gap-2 overflow-x-auto">
                  {galeria.map((src, idx) => <button key={`${src}-${idx}`} onClick={() => setImagemAtual(idx)}
                    className={`shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 ${idx === atual ? 'border-[#c80082]' : 'border-transparent'}`}>
                    <img src={src} alt={`Foto ${idx+1}`} className="w-full h-full object-cover"/>
                  </button>)}
                </div>
              </div>}
            </div>

            <div className="p-6 md:p-8 flex flex-col">
              <div className="hidden md:flex justify-end"><button onClick={() => setProdutoAberto(null)} className="w-10 h-10 rounded-full bg-zinc-100 grid place-items-center hover:bg-zinc-200"><X size={18}/></button></div>

              <div className="mt-1">
                <p className="text-[11px] uppercase tracking-[.18em] font-bold text-[#c80082]">{produtoAberto.categoria || 'THITA'}</p>
                <h2 className="mt-2 text-2xl md:text-3xl font-black tracking-tight leading-tight">{produtoAberto.nome}</h2>
                {produtoAberto.sku && <p className="mt-2 text-xs text-zinc-400">Ref. {produtoAberto.sku}</p>}
              </div>

              {produtoAberto.descricao && <p className="mt-5 text-sm leading-relaxed text-zinc-600">{produtoAberto.descricao}</p>}

              <div className="mt-6">
                <p className="text-xs font-bold text-zinc-700 mb-2">Tamanhos disponíveis</p>
                <div className="flex flex-wrap gap-2">
                  {tamanhos.length > 0
                    ? tamanhos.map(v => <span key={v.id} className="min-w-10 h-10 px-3 rounded-xl border border-zinc-300 bg-white grid place-items-center text-xs font-black">{v.tamanho}</span>)
                    : <span className="text-sm text-zinc-400">Sem tamanhos disponíveis no momento.</span>
                  }
                </div>
              </div>

              <div className="mt-7 border-t border-zinc-100 pt-6">
                {produtoAberto.promocao && produtoAberto.preco_promocional != null && <p className="text-sm text-zinc-400 line-through">{money.format(Number(produtoAberto.preco))}</p>}
                <p className="text-3xl font-black">{money.format(precoAtual)}</p>
                <p className={`mt-2 text-xs font-bold ${produtoAberto.status_estoque === 'indisponivel' ? 'text-red-500' : produtoAberto.status_estoque === 'ultimas_unidades' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {produtoAberto.status_estoque === 'indisponivel' ? 'Indisponível' : produtoAberto.status_estoque === 'ultimas_unidades' ? 'Últimas unidades' : 'Disponível'}
                </p>
              </div>

              <div className="mt-auto pt-7">
                <a href={`https://wa.me/5575999304778?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
                  className="w-full h-12 rounded-xl bg-[#25D366] text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition">
                  <MessageCircle size={18}/> Consultar pelo WhatsApp
                </a>
                <p className="mt-2 text-center text-[11px] text-zinc-400">Informe o tamanho desejado no atendimento.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    })()}


    <footer className="bg-zinc-950 text-zinc-400"><div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs"><img src={catalogoLogo} alt="THITA" className="h-14 w-auto object-contain"/><p>THITA Store • Catálogo conectado à nuvem</p></div></footer>

    {menu && <div className="fixed inset-0 z-50 bg-black/30" onClick={()=>setMenu(false)}><aside className="h-full w-[82%] max-w-sm bg-white p-5" onClick={e=>e.stopPropagation()}><div className="flex justify-between items-center"><img src={catalogoLogo} className="h-14 w-auto object-contain"/><button onClick={()=>setMenu(false)}><X/></button></div><div className="mt-7 space-y-2">{categorias.map(cat => <button key={cat} onClick={()=>{setCategoria(cat);setMenu(false)}} className="w-full text-left py-3 border-b border-zinc-100 text-sm font-semibold">{cat}</button>)}</div></aside></div>}
  </div>
}

function AdminShell({ profile, onLogout, onVoltar }: { profile: AdminProfile; onLogout: () => void; onVoltar: () => void }) {
  const primeiraAba=profile.role==='admin'?'Dashboard':profile.acesso_cadastros?'Cadastros':profile.acesso_entradas?'Entradas':profile.acesso_relatorios?'Relatórios':profile.acesso_vendas?'Vendas':profile.acesso_financeiros?'Financeiros':profile.acesso_ajustes?'Ajustes':''
  const [tab, setTab] = useState(primeiraAba)
  const itens = ([
    [LayoutDashboard,'Dashboard'], [Users,'Cadastros'], [ReceiptText,'Entradas'], [BarChart3,'Relatórios'], [ShoppingBag,'Vendas'], [CircleDollarSign,'Financeiros'], [Settings2,'Ajustes']
  ] as const).filter(([,label])=>profile.role==='admin'||(label==='Cadastros'&&profile.acesso_cadastros)||(label==='Entradas'&&profile.acesso_entradas)||(label==='Relatórios'&&profile.acesso_relatorios)||(label==='Vendas'&&profile.acesso_vendas)||(label==='Financeiros'&&profile.acesso_financeiros)||(label==='Ajustes'&&profile.acesso_ajustes))

  return <div className="min-h-screen bg-[#f7f7f8]">
    <header className="h-16 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3"><img src="/logo-thita.png" className="h-9" alt="THITA"/><span className="hidden sm:block text-xs font-bold text-zinc-400 border-l pl-3">GESTÃO</span></div>
      <div className="flex items-center gap-2"><button onClick={onVoltar} className="h-9 px-3 rounded-lg border border-zinc-200 text-xs font-semibold">Ver catálogo</button><button onClick={onLogout} className="h-9 px-3 rounded-lg bg-zinc-950 text-white text-xs font-semibold inline-flex items-center gap-2"><LogOut size={14}/> Sair</button></div>
    </header>

    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2">
        {itens.map(([Icon,label]) => <button key={label} onClick={()=>setTab(label)} className={`shrink-0 h-10 px-4 rounded-xl border inline-flex items-center gap-2 text-xs font-bold ${tab===label?'bg-zinc-950 border-zinc-950 text-white':'bg-white border-zinc-200 text-zinc-600'}`}><Icon size={15}/>{label}</button>)}
      </div>

      {tab === 'Dashboard' && <DashboardAdmin nome={profile.nome}/>} 
      {tab === 'Cadastros' && <CadastrosAdmin admin={profile.role==='admin'} />}
      {tab === 'Financeiros' && <FinanceirosAdmin />}
      {tab === 'Produtos' && <ProdutosAdmin />}
      {tab === 'Categorias' && <CategoriasAdmin />}
      {tab === 'Fornecedores' && <FornecedoresAdmin />}
      {tab === 'Entradas' && <EntradasAdmin />}
      {tab === 'Relatórios' && <RelatoriosAdmin />}
      {tab === 'Clientes' && <ClientesAdmin />}
      {tab === 'Vendas' && <VendasAdmin />}
      {tab === 'Crediário' && <CrediarioAdmin />}
      {tab === 'Ajustes' && <AjustesAdmin admin={profile.role==='admin'} />}
      {tab === 'Financeiro' && <FinanceiroAdmin />}
      {tab === 'Contas a Pagar' && <ContasPagarAdmin />}
      {tab === 'Categorias Financeiras' && <CategoriasFinanceirasAdmin />}
      {!tab&&<div className="rounded-[24px] bg-white border border-zinc-200 p-10 text-center"><ShieldCheck className="mx-auto text-zinc-300"/><h2 className="mt-3 font-black">Nenhum módulo liberado</h2><p className="mt-1 text-sm text-zinc-500">Peça ao administrador para configurar suas permissões.</p></div>}
      {!['Dashboard','Cadastros','Financeiros','Produtos','Categorias','Fornecedores','Entradas','Relatórios','Clientes','Vendas','Crediário','Financeiro','Contas a Pagar','Categorias Financeiras','Ajustes',''].includes(tab) && <div className="rounded-[24px] bg-white border border-zinc-200 p-10 text-center"><Package className="mx-auto text-zinc-300"/><h2 className="mt-3 font-black">{tab}</h2><p className="mt-1 text-sm text-zinc-500">Este módulo entra nas próximas etapas da migração.</p></div>}
    </div>
  </div>
}
