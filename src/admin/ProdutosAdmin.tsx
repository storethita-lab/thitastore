import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, ImagePlus, Package, Pencil, Plus, RefreshCw, Star, Trash2, UploadCloud, X } from 'lucide-react'
import { supabase } from '../supabase'
import { compressToWebp, safeFileName } from '../lib/images'

type Categoria = { id: string; nome: string }
type Fornecedor = { id: string; nome: string }
type Variante = { id: string; tamanho: string; sku: string | null; estoque: number; estoque_minimo: number; ativo: boolean }
type Imagem = { id: string; storage_path: string; url: string | null; ordem: number; capa: boolean }
type Produto = {
  id: string; sku: string | null; nome: string; descricao: string | null
  categoria_id: string | null; fornecedor_id: string | null; custo: number; preco: number
  preco_promocional: number | null; estoque_minimo: number; novo: boolean; promocao: boolean
  destaque: boolean; ativo: boolean; produto_variantes?: Variante[]; produto_imagens?: Imagem[]
}
type VariantDraft = { id?: string; tamanho: string; sku: string; estoque_minimo: number; estoque: number }
const tamanhosPadrao = ['PP','P','M','G','GG','G1','G2','Único','2','4','6','8','10','12','14','16']
const ordemTamanho = new Map(tamanhosPadrao.map((tamanho, indice) => [tamanho, indice]))
const ordenarVariantes = <T extends { tamanho: string }>(lista: T[]) => [...lista].sort((a,b)=>(ordemTamanho.get(a.tamanho)??999)-(ordemTamanho.get(b.tamanho)??999)||a.tamanho.localeCompare(b.tamanho,'pt-BR'))
const initialForm = { nome:'', sku:'', descricao:'', categoria_id:'', fornecedor_id:'', custo:0, margem:70, preco:0, preco_promocional:'', novo:true, promocao:false, destaque:false, ativo:true }

export default function ProdutosAdmin() {
  const [produtos,setProdutos]=useState<Produto[]>([])
  const [categorias,setCategorias]=useState<Categoria[]>([])
  const [fornecedores,setFornecedores]=useState<Fornecedor[]>([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [erro,setErro]=useState('')
  const [ok,setOk]=useState('')
  const [form,setForm]=useState(initialForm)
  const [variantes,setVariantes]=useState<VariantDraft[]>([])
  const [editing,setEditing]=useState<Produto|null>(null)
  const [pendingImages,setPendingImages]=useState<File[]>([])
  const [skuLoading,setSkuLoading]=useState(false)
  const [modalOpen,setModalOpen]=useState(false)
  const [skuPendente,setSkuPendente]=useState('')

  async function carregar(){
    setLoading(true); setErro('')
    const [p,c,f]=await Promise.all([
      supabase.from('produtos').select(`*, produto_variantes(id,tamanho,sku,estoque,estoque_minimo,ativo), produto_imagens(id,storage_path,url,ordem,capa)`).order('created_at',{ascending:false}),
      supabase.from('categorias').select('id,nome').eq('ativo',true).order('ordem'),
      supabase.from('fornecedores').select('id,nome').eq('ativo',true).order('nome')
    ])
    if(p.error)setErro(p.error.message); else setProdutos((p.data||[]) as Produto[])
    if(!c.error)setCategorias(c.data||[]); if(!f.error)setFornecedores(f.data||[])
    setLoading(false)
  }
  useEffect(()=>{
    carregar()
  },[])

  const estoqueTotal=useMemo(()=>produtos.reduce((acc,p)=>acc+(p.produto_variantes||[]).filter(v=>v.ativo).reduce((a,v)=>a+Number(v.estoque||0),0),0),[produtos])
  const currentImages=useMemo(()=>editing?[...(editing.produto_imagens||[])].sort((a,b)=>Number(b.capa)-Number(a.capa)||a.ordem-b.ordem):[],[editing])

  async function obterSkuAutomatico(){
    setSkuLoading(true)
    try{
      const {data,error}=await supabase.rpc('proximo_sku_produto')
      if(error)throw error
      return String(data||'')
    }finally{
      setSkuLoading(false)
    }
  }

  async function iniciarNovo(){
    setEditing(null)
    setVariantes([])
    setPendingImages([])
    setErro('')
    setOk('')
    setForm({...initialForm,sku:skuPendente})
    setModalOpen(true)
    if(skuPendente)return
    try{
      const sku=await obterSkuAutomatico()
      setSkuPendente(sku)
      setForm(prev=>({...prev,sku}))
    }catch(e){
      setErro(e instanceof Error?e.message:'Não foi possível gerar a referência automática.')
    }
  }

  function cancelar(){
    setModalOpen(false);setEditing(null);setVariantes([]);setPendingImages([]);setErro('');setOk('')
    setForm({...initialForm,sku:skuPendente})
  }
  function toggleSize(tamanho:string){
    setVariantes(prev=>{
      const found=prev.find(v=>v.tamanho===tamanho)
      if(found){
        if(found.estoque>0){setErro(`O tamanho ${tamanho} possui ${found.estoque} unidade(s) em estoque e não pode ser removido.`);return prev}
        return prev.filter(v=>v.tamanho!==tamanho)
      }
      return [...prev,{tamanho,sku:'',estoque_minimo:0,estoque:0}]
    })
  }
  function updateVar(tamanho:string,patch:Partial<VariantDraft>){setVariantes(prev=>prev.map(v=>v.tamanho===tamanho?{...v,...patch}:v))}
  function calcPreco(custo:number,margem:number){if(!Number.isFinite(custo)||!Number.isFinite(margem))return 0;return Number((custo*(1+margem/100)).toFixed(2))}
  function calcMargem(custo:number,preco:number){if(!custo||custo<=0||!Number.isFinite(preco))return 0;return Number((((preco/custo)-1)*100).toFixed(2))}
  function alterarCusto(custo:number){setForm(prev=>({...prev,custo,preco:calcPreco(custo,Number(prev.margem)||0)}))}
  function alterarMargem(margem:number){setForm(prev=>({...prev,margem,preco:calcPreco(Number(prev.custo)||0,margem)}))}
  function alterarPreco(preco:number){setForm(prev=>({...prev,preco,margem:calcMargem(Number(prev.custo)||0,preco)}))}

  async function uploadImages(produtoId:string,files:File[]){
    for(let i=0;i<files.length;i++){
      const file=files[i], webp=await compressToWebp(file)
      const base=safeFileName(file.name.replace(/\.[^.]+$/,''))||`imagem-${i+1}`
      const path=`produtos/${produtoId}/${Date.now()}-${i}-${base}.webp`
      const upload=await supabase.storage.from('catalogo').upload(path,webp,{contentType:'image/webp',upsert:false,cacheControl:'31536000'})
      if(upload.error)throw upload.error
      const {data:publicUrl}=supabase.storage.from('catalogo').getPublicUrl(path)
      const {error:regError}=await supabase.rpc('registrar_produto_imagem',{p_produto_id:produtoId,p_storage_path:path,p_url:publicUrl.publicUrl,p_capa:false})
      if(regError){await supabase.storage.from('catalogo').remove([path]);throw regError}
    }
  }

  function validar(){
    const faltando:string[]=[]
    if(!form.nome.trim())faltando.push('Nome')
    if(!form.sku.trim())faltando.push('SKU / Referência')
    if(!form.categoria_id)faltando.push('Categoria')
    if(!form.fornecedor_id)faltando.push('Fornecedor')
    if(!form.descricao.trim())faltando.push('Descrição')
    if(!(Number(form.custo)>0))faltando.push('Custo')
    if(!(Number(form.preco)>0))faltando.push('Preço de venda')
    if(form.promocao && !(Number(form.preco_promocional)>0))faltando.push('Preço promocional')
    if(variantes.length===0)faltando.push('Pelo menos um tamanho')
    if(!editing && pendingImages.length===0)faltando.push('Pelo menos uma imagem')
    if(editing && currentImages.length===0 && pendingImages.length===0)faltando.push('Pelo menos uma imagem')
    if(faltando.length)throw new Error(`Preencha os campos obrigatórios: ${faltando.join(', ')}.`)
    const invalidMin=variantes.find(v=>!Number.isFinite(Number(v.estoque_minimo))||Number(v.estoque_minimo)<0)
    if(invalidMin)throw new Error(`Estoque mínimo inválido no tamanho ${invalidMin.tamanho}.`)
  }

  async function salvar(e:React.FormEvent){
    e.preventDefault();setErro('');setOk('');setSaving(true)
    try{
      validar()
      if(!editing){
        const {data,error}=await supabase.rpc('criar_produto_v17_11',{
          p_nome:form.nome.trim(),p_sku:form.sku.trim(),p_descricao:form.descricao.trim(),p_categoria_id:form.categoria_id,p_fornecedor_id:form.fornecedor_id,
          p_custo:Number(form.custo),p_preco:Number(form.preco),p_preco_promocional:form.preco_promocional===''?null:Number(form.preco_promocional),p_estoque_minimo:0,
          p_novo:form.novo,p_promocao:form.promocao,p_destaque:form.destaque,
          p_variantes:variantes.map(v=>({tamanho:v.tamanho,sku:v.sku||null,estoque_minimo:Number(v.estoque_minimo)||0}))
        })
        if(error)throw error
        const produtoId=data as string
        await uploadImages(produtoId,pendingImages.slice(0,8))
        setOk('Produto cadastrado e sincronizado com a nuvem.')
        setSkuPendente('')
      }else{
        const {error}=await supabase.rpc('editar_produto_v17_11',{
          p_produto_id:editing.id,p_nome:form.nome.trim(),p_sku:form.sku.trim(),p_descricao:form.descricao.trim(),p_categoria_id:form.categoria_id,p_fornecedor_id:form.fornecedor_id,
          p_custo:Number(form.custo),p_preco:Number(form.preco),p_preco_promocional:form.preco_promocional===''?null:Number(form.preco_promocional),p_estoque_minimo:0,
          p_novo:form.novo,p_promocao:form.promocao,p_destaque:form.destaque,p_ativo:form.ativo
        })
        if(error)throw error
        const sync=await supabase.rpc('sincronizar_variantes_produto',{p_produto_id:editing.id,p_variantes:variantes.map(v=>({tamanho:v.tamanho,sku:v.sku||null,estoque_minimo:Number(v.estoque_minimo)||0}))})
        if(sync.error)throw sync.error
        if(pendingImages.length)await uploadImages(editing.id,pendingImages.slice(0,Math.max(0,8-currentImages.length)))
        setOk('Produto atualizado.')
      }
      await carregar();setModalOpen(false);setEditing(null);setVariantes([]);setPendingImages([]);setForm(initialForm)
    }catch(e){setErro(e instanceof Error?e.message:'Não foi possível salvar o produto.')}finally{setSaving(false)}
  }

  function editar(p:Produto){
    setEditing(p)
    setForm({nome:p.nome,sku:p.sku||'',descricao:p.descricao||'',categoria_id:p.categoria_id||'',fornecedor_id:p.fornecedor_id||'',custo:Number(p.custo)||0,margem:calcMargem(Number(p.custo)||0,Number(p.preco)||0),preco:Number(p.preco)||0,preco_promocional:p.preco_promocional==null?'':String(p.preco_promocional),novo:p.novo,promocao:p.promocao,destaque:p.destaque,ativo:p.ativo})
    setVariantes(ordenarVariantes((p.produto_variantes||[]).filter(v=>v.ativo)).map(v=>({id:v.id,tamanho:v.tamanho,sku:v.sku||'',estoque_minimo:Number(v.estoque_minimo)||0,estoque:Number(v.estoque)||0})))
    setPendingImages([]);setErro('');setOk('');setModalOpen(true)
  }
  async function marcarCapa(id:string){if(!editing)return;const {error}=await supabase.rpc('definir_imagem_capa',{p_imagem_id:id});if(error){setErro(error.message);return}setEditing(prev=>prev?({...prev,produto_imagens:(prev.produto_imagens||[]).map(img=>({...img,capa:img.id===id}))}):prev);await carregar()}
  async function removerImagem(img:Imagem){
    if(!editing)return
    if(currentImages.length<=1 && pendingImages.length===0){setErro('O produto precisa manter pelo menos uma imagem. Adicione outra antes de remover esta.');return}
    if(!confirm('Remover esta imagem?'))return
    const {data,error}=await supabase.rpc('remover_produto_imagem',{p_imagem_id:img.id});if(error){setErro(error.message);return}
    const path=(data as string)||img.storage_path;const removed=await supabase.storage.from('catalogo').remove([path]);if(removed.error)setErro(`Registro removido, mas o arquivo no Storage precisa ser revisado: ${removed.error.message}`)
    await carregar();setEditing(prev=>prev?({...prev,produto_imagens:(prev.produto_imagens||[]).filter(i=>i.id!==img.id)}):prev)
  }

  return <div className="space-y-5">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Produtos" value={produtos.length}/><Metric label="Estoque total" value={`${estoqueTotal} un.`}/><Metric label="Sem estoque" value={produtos.filter(p=>(p.produto_variantes||[]).reduce((a,v)=>a+v.estoque,0)===0).length}/><Metric label="Em promoção" value={produtos.filter(p=>p.promocao).length}/></div>

    <div className="flex justify-end"><button type="button" onClick={()=>{void iniciarNovo()}} className="h-11 px-5 rounded-xl bg-[#c80082] text-white text-sm font-black inline-flex items-center gap-2"><Plus size={16}/> Cadastrar produto</button></div>

    {modalOpen&&<div className="fixed inset-0 z-[100] bg-black/55 p-3 md:p-6 flex items-center justify-center" onMouseDown={e=>{if(e.target===e.currentTarget)cancelar()}}>
    <form onSubmit={salvar} noValidate className="bg-white rounded-[22px] border border-zinc-200 p-5 md:p-6 w-full max-w-6xl max-h-[94vh] overflow-y-auto shadow-2xl">
      <div className="flex items-start justify-between gap-4 mb-5"><div><p className="text-[10px] font-black tracking-[.18em] uppercase text-[#c80082]">Produtos</p><h2 className="text-xl font-black">{editing?'Editar produto':'Cadastrar produto'}</h2><p className="text-xs text-zinc-500 mt-1">Campos com <b className="text-red-500">*</b> são obrigatórios.</p></div><button type="button" onClick={cancelar} className="w-9 h-9 rounded-lg border border-zinc-200 grid place-items-center" aria-label="Fechar"><X size={16}/></button></div>
      {erro&&<Notice error>{erro}</Notice>}{ok&&<Notice>{ok}</Notice>}
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <Field label="Nome" required className="md:col-span-2"><input required value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className="input" placeholder="Ex: Baby Doll Elegance"/></Field>
        <Field label="SKU / Referência" required><input required readOnly value={skuLoading && !editing ? 'Gerando...' : form.sku} className="input bg-zinc-100 text-zinc-700 cursor-not-allowed" placeholder="THI-000001"/><span className="text-[10px] text-zinc-400 mt-1 block">Gerada automaticamente pelo Supabase e preservada na edição.</span></Field>
        <Field label="Categoria" required><select required value={form.categoria_id} onChange={e=>setForm({...form,categoria_id:e.target.value})} className="input"><option value="">Selecione</option>{categorias.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
        <Field label="Fornecedor" required><select required value={form.fornecedor_id} onChange={e=>setForm({...form,fornecedor_id:e.target.value})} className="input"><option value="">Selecione</option>{fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></Field>
        <Field label="Descrição" required className="md:col-span-3"><textarea required value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} className="input min-h-24 py-3" placeholder="Material, caimento, detalhes..."/></Field>
        <Field label="Custo (R$)" required><input required type="number" min="0.01" step="0.01" value={form.custo} onChange={e=>alterarCusto(Number(e.target.value))} className="input"/></Field>
        <Field label="Margem sobre custo (%)"><input type="number" step="0.01" value={form.margem} onChange={e=>alterarMargem(Number(e.target.value))} className="input"/><span className="text-[10px] text-zinc-400 mt-1 block">Alterar a margem recalcula o preço.</span></Field>
        <Field label="Preço de venda (R$)" required><input required type="number" min="0.01" step="0.01" value={form.preco} onChange={e=>alterarPreco(Number(e.target.value))} className="input"/><span className="text-[10px] text-zinc-400 mt-1 block">Alterar o preço recalcula a margem.</span></Field>
        <Field label="Preço promocional (R$)" required={form.promocao}><input required={form.promocao} type="number" min="0.01" step="0.01" value={form.preco_promocional} onChange={e=>setForm({...form,preco_promocional:e.target.value})} className="input" placeholder={form.promocao?'Obrigatório em promoção':'Opcional'}/></Field>
      </div>
      <div className="flex flex-wrap gap-4 mt-5 py-4 border-y border-zinc-100">{(['novo','promocao','destaque','ativo'] as const).map(k=><label key={k} className="flex items-center gap-2 text-xs font-bold capitalize"><input type="checkbox" checked={form[k]} onChange={e=>setForm({...form,[k]:e.target.checked})} className="accent-[#c80082]"/>{k==='promocao'?'Promoção':k}</label>)}</div>

      <div className="mt-5">
        <div className="mb-2"><p className="text-xs font-black">Tamanhos e estoque mínimo <b className="text-red-500">*</b></p><p className="text-[11px] text-zinc-500 mt-1">Estoque real só muda por Entrada/NF. Ao editar, tamanho com estoque não pode ser retirado.</p></div>
        <div className="flex flex-wrap gap-2">{tamanhosPadrao.map(t=><button key={t} type="button" onClick={()=>toggleSize(t)} className={`h-9 min-w-10 px-3 rounded-lg border text-xs font-black ${variantes.some(v=>v.tamanho===t)?'bg-zinc-950 text-white border-zinc-950':'bg-white border-zinc-200'}`}>{t}</button>)}</div>
        {variantes.length>0&&<div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-3">{ordenarVariantes(variantes).map(v=><div key={v.tamanho} className="rounded-xl border border-zinc-200 p-3 bg-zinc-50"><div className="flex items-center justify-between"><b className="text-sm">Tamanho {v.tamanho}</b><button type="button" onClick={()=>toggleSize(v.tamanho)} className={v.estoque>0?'opacity-30 cursor-not-allowed':''}><X size={14}/></button></div><label className="block mt-3"><span className="text-[10px] uppercase tracking-wider font-black text-zinc-500 block mb-1">Estoque mínimo</span><input type="number" min="0" value={v.estoque_minimo} onChange={e=>updateVar(v.tamanho,{estoque_minimo:Number(e.target.value)})} className="input" placeholder="Ex: 2"/></label><label className="block mt-2"><span className="text-[10px] uppercase tracking-wider font-black text-zinc-500 block mb-1">SKU do tamanho (opcional)</span><input value={v.sku} onChange={e=>updateVar(v.tamanho,{sku:e.target.value})} className="input" placeholder={`Ex: ${form.sku||'THI-001'}-${v.tamanho}`}/></label><div className="mt-2 rounded-lg bg-white border border-zinc-200 px-3 py-2 text-[10px] text-zinc-500"><b className="text-zinc-700">Estoque atual:</b> {v.estoque} un.</div></div>)}</div>}
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-zinc-300 p-4 bg-zinc-50">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 grid place-items-center text-[#c80082]"><ImagePlus size={18}/></div><div><p className="text-xs font-black">Fotos do produto <b className="text-red-500">*</b></p><p className="text-[11px] text-zinc-500">Até 8 imagens. Remover/trocar capa somente durante edição.</p></div></div>
        {editing&&currentImages.length>0&&<div className="mt-4 flex gap-2 overflow-x-auto">{currentImages.map(img=><div key={img.id} className="relative shrink-0"><img src={img.url||''} className={`w-20 h-20 object-cover rounded-lg border-2 ${img.capa?'border-[#c80082]':'border-white'}`}/><div className="absolute bottom-1 left-1 right-1 flex justify-between"><button type="button" onClick={()=>marcarCapa(img.id)} title="Tornar capa" className="w-7 h-7 rounded bg-white/95 grid place-items-center"><Star size={12} className={img.capa?'fill-[#c80082] text-[#c80082]':''}/></button><button type="button" onClick={()=>removerImagem(img)} title="Remover" className="w-7 h-7 rounded bg-white/95 text-red-600 grid place-items-center"><Trash2 size={12}/></button></div></div>)}</div>}
        <label className="mt-3 h-11 px-4 rounded-xl bg-white border border-zinc-200 inline-flex items-center gap-2 text-xs font-bold cursor-pointer"><UploadCloud size={16}/>{editing?'Adicionar novas imagens':'Selecionar imagens'}<input type="file" accept="image/*" multiple className="hidden" onChange={e=>setPendingImages(Array.from(e.target.files||[]).slice(0,8))}/></label>
        {pendingImages.length>0&&<p className="mt-2 text-xs text-emerald-700 font-semibold">{pendingImages.length} imagem(ns) pronta(s) para enviar.</p>}
      </div>
      <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={cancelar} disabled={saving} className="h-12 px-6 rounded-xl border border-zinc-200 bg-white font-black text-sm disabled:opacity-60">Cancelar</button><button disabled={saving||skuLoading} className="h-12 px-6 rounded-xl bg-[#c80082] text-white font-black text-sm inline-flex items-center gap-2 disabled:opacity-60">{(saving||skuLoading)?<RefreshCw size={16} className="animate-spin"/>:<Check size={16}/>} {skuLoading?'Gerando referência...':editing?'Salvar alterações':'Salvar produto'}</button></div>
    </form></div>}

    <div className="bg-white rounded-[22px] border border-zinc-200 overflow-hidden"><div className="p-5 flex items-center justify-between"><div><h2 className="font-black">Produtos cadastrados</h2><p className="text-xs text-zinc-500">{produtos.length} registro(s) no Supabase</p></div><button onClick={carregar} className="w-10 h-10 rounded-xl border border-zinc-200 grid place-items-center"><RefreshCw size={16}/></button></div>{loading?<div className="py-16 grid place-items-center"><RefreshCw className="animate-spin text-[#c80082]"/></div>:<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="text-left px-5 py-3">Produto</th><th className="text-left">Tamanhos</th><th>Estoque</th><th>Venda</th><th>Status</th><th className="pr-5"></th></tr></thead><tbody>{produtos.map(p=>{const imgs=[...(p.produto_imagens||[])].sort((a,b)=>Number(b.capa)-Number(a.capa)||a.ordem-b.ordem);const vars=ordenarVariantes((p.produto_variantes||[]).filter(v=>v.ativo));const est=vars.reduce((a,v)=>a+Number(v.estoque||0),0);return <tr key={p.id} className="border-t border-zinc-100"><td className="px-5 py-3"><div className="flex items-center gap-3">{imgs[0]?.url?<img src={imgs[0].url} className="w-12 h-14 rounded-lg object-cover"/>:<div className="w-12 h-14 rounded-lg bg-zinc-100 grid place-items-center"><Package size={17}/></div>}<div><b>{p.nome}</b><p className="text-[11px] text-zinc-400">{p.sku||'Sem SKU'}</p></div></div></td><td>{vars.map(v=>v.tamanho).join(', ')||'—'}</td><td className="text-center font-black">{est}</td><td className="text-center font-black">R$ {Number(p.preco).toFixed(2).replace('.',',')}</td><td className="text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-black ${p.ativo?'bg-emerald-50 text-emerald-700':'bg-zinc-100 text-zinc-500'}`}>{p.ativo?'ATIVO':'INATIVO'}</span></td><td className="pr-5"><button onClick={()=>editar(p)} className="w-9 h-9 rounded-lg border border-zinc-200 grid place-items-center ml-auto"><Pencil size={14}/></button></td></tr>})}</tbody></table></div>}</div>
  </div>
}
function Metric({label,value}:{label:string;value:string|number}){return <div className="bg-white border border-zinc-200 rounded-2xl p-4"><p className="text-[10px] uppercase tracking-wider font-black text-zinc-400">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>}
function Field({label,children,className='',required=false}:{label:string;children:React.ReactNode;className?:string;required?:boolean}){return <label className={className}><span className="text-[11px] font-bold text-zinc-600 block mb-1.5">{label}{required&&<b className="text-red-500"> *</b>}</span>{children}</label>}
function Notice({children,error=false}:{children:React.ReactNode;error?:boolean}){return <div className={`mb-3 rounded-xl border p-3 text-xs font-semibold flex items-center gap-2 ${error?'border-red-200 bg-red-50 text-red-700':'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error?<AlertCircle size={15}/>:<Check size={15}/>} {children}</div>}
