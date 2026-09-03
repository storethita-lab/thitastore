import React, { useEffect, useState } from 'react'
import { Check, Pencil, Plus, RefreshCw, Tag, X } from 'lucide-react'
import { supabase } from '../supabase'
const normalizar=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');

type Categoria = {
  id: string
  nome: string
  slug: string | null
  ordem: number
  ativo: boolean
}

export default function CategoriasAdmin() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [editing, setEditing] = useState<Categoria | null>(null)
  const [nome, setNome] = useState('')
  const [ordem, setOrdem] = useState(0)
  const [ativo, setAtivo] = useState(true)
  const [pesquisa,setPesquisa]=useState('')
  const filtradas=categorias.filter(c=>normalizar(`${c.nome} ${c.slug||''}`).includes(normalizar(pesquisa.trim())))

  async function carregar() {
    setLoading(true); setErro('')
    const { data, error } = await supabase
      .from('categorias')
      .select('id,nome,slug,ordem,ativo')
      .order('ordem')
      .order('nome')
    if (error) setErro(error.message)
    else setCategorias((data || []) as Categoria[])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function novo() {
    setEditing(null)
    setNome('')
    setOrdem(categorias.length ? Math.max(...categorias.map(c => Number(c.ordem)||0)) + 1 : 1)
    setAtivo(true)
    setErro(''); setOk('')
  }

  function editar(c: Categoria) {
    setEditing(c)
    setNome(c.nome)
    setOrdem(Number(c.ordem)||0)
    setAtivo(c.ativo)
    setErro(''); setOk('')
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setErro(''); setOk('')
    try {
      if (!nome.trim()) throw new Error('Informe o nome da categoria.')
      const { error } = await supabase.rpc('salvar_categoria', {
        p_id: editing?.id || null,
        p_nome: nome.trim(),
        p_ordem: Number(ordem)||0,
        p_ativo: ativo
      })
      if (error) throw error
      setOk(editing ? 'Categoria atualizada.' : 'Categoria cadastrada.')
      novo()
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a categoria.')
    } finally {
      setSaving(false)
    }
  }

  async function alternar(c: Categoria) {
    setErro(''); setOk('')
    const { error } = await supabase.rpc('salvar_categoria', {
      p_id: c.id,
      p_nome: c.nome,
      p_ordem: c.ordem,
      p_ativo: !c.ativo
    })
    if (error) setErro(error.message)
    else {
      setOk(c.ativo ? 'Categoria desativada.' : 'Categoria ativada.')
      await carregar()
    }
  }

  return <div className="grid lg:grid-cols-[340px_1fr] gap-5">
    <form onSubmit={salvar} className="bg-white border border-zinc-200 rounded-[22px] p-5 h-fit">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#fff0f8] text-[#c80082] grid place-items-center"><Tag size={18}/></div>
        <div>
          <p className="text-[10px] font-black tracking-[.18em] uppercase text-[#c80082]">Categorias</p>
          <h2 className="font-black">{editing ? 'Editar categoria' : 'Nova categoria'}</h2>
        </div>
      </div>

      {erro && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 text-red-700 p-3 text-xs font-semibold">{erro}</div>}
      {ok && <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 p-3 text-xs font-semibold">{ok}</div>}

      <label className="block">
        <span className="text-[11px] font-bold text-zinc-600 block mb-1.5">Nome da categoria</span>
        <input value={nome} onChange={e=>setNome(e.target.value)} className="input" placeholder="Ex: Moda Praia" />
      </label>

      <label className="block mt-3">
        <span className="text-[11px] font-bold text-zinc-600 block mb-1.5">Ordem no catálogo</span>
        <input type="number" min="0" value={ordem} onChange={e=>setOrdem(Number(e.target.value))} className="input" />
      </label>

      <label className="mt-4 flex items-center gap-2 text-xs font-bold">
        <input type="checkbox" checked={ativo} onChange={e=>setAtivo(e.target.checked)} className="accent-[#c80082]" />
        Categoria ativa
      </label>

      <div className="mt-5 flex gap-2">
        <button disabled={saving} className="flex-1 h-11 rounded-xl bg-[#c80082] text-white text-xs font-black inline-flex items-center justify-center gap-2 disabled:opacity-60">
          <Check size={15}/>{saving ? 'Salvando...' : editing ? 'Salvar' : 'Cadastrar'}
        </button>
        {editing && <button type="button" onClick={novo} className="h-11 px-4 rounded-xl border border-zinc-200 text-xs font-bold"><X size={15}/></button>}
      </div>
    </form>

    <div className="bg-white border border-zinc-200 rounded-[22px] overflow-hidden">
      <div className="p-5 flex items-center justify-between">
        <div><h2 className="font-black">Categorias cadastradas</h2><p className="text-xs text-zinc-500">{filtradas.length} de {categorias.length} registro(s)</p></div>
        <button onClick={carregar} className="w-10 h-10 rounded-xl border border-zinc-200 grid place-items-center"><RefreshCw size={16}/></button>
      </div>
      <div className="px-5 pb-4"><input className="input" value={pesquisa} onChange={e=>setPesquisa(e.target.value)} placeholder="Pesquisar categoria"/></div>
      {loading ? <div className="py-16 grid place-items-center"><RefreshCw className="animate-spin text-[#c80082]"/></div> :
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
        <thead className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="text-left px-5 py-3">Categoria</th><th>Ordem</th><th>Status</th><th className="pr-5"></th></tr></thead>
        <tbody>{filtradas.map(c=><tr key={c.id} className="border-t border-zinc-100">
          <td className="px-5 py-3 font-bold">{c.nome}</td>
          <td className="text-center">{c.ordem}</td>
          <td className="text-center"><button onClick={()=>alternar(c)} className={`px-3 py-1 rounded-full text-[10px] font-black ${c.ativo?'bg-emerald-50 text-emerald-700':'bg-zinc-100 text-zinc-500'}`}>{c.ativo?'ATIVA':'INATIVA'}</button></td>
          <td className="pr-5"><button onClick={()=>editar(c)} className="w-9 h-9 rounded-lg border border-zinc-200 grid place-items-center ml-auto"><Pencil size={14}/></button></td>
        </tr>)}</tbody>
      </table></div>}
    </div>
  </div>
}
