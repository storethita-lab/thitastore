import React,{useEffect,useState}from'react'
import{Check,CircleDollarSign}from'lucide-react'
import{supabase}from'../supabase'
import{dataLoja}from'../utils/dataLoja'
import FinanceiroBase from'./FinanceiroAdmin'

type C={id:string;nome:string}
const brl=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)

export default function FinanceiroAdminV18(){
 const[cats,setCats]=useState<C[]>([]),[data,setData]=useState(dataLoja()),[cat,setCat]=useState(''),[descricao,setDescricao]=useState(''),[forma,setForma]=useState('Pix'),[valor,setValor]=useState(0),[situacao,setSituacao]=useState('paga'),[parcelas,setParcelas]=useState(1),[vencimento,setVencimento]=useState(''),[obs,setObs]=useState(''),[erro,setErro]=useState(''),[ok,setOk]=useState(''),[saving,setSaving]=useState(false)
 const cartaoCredito=forma==='Cartão de Crédito',parcelada=cartaoCredito||situacao==='pendente',valorParcela=parcelas>0?valor/parcelas:0

 useEffect(()=>{supabase.from('categorias_financeiras_v17_18').select('id,nome').eq('ativo',true).order('nome').then(({data,error})=>{if(error)setErro(error.message);else{setCats(data||[]);if(data?.[0])setCat(data[0].id)}})},[])

 function mudarForma(novaForma:string){setForma(novaForma);if(novaForma==='Cartão de Crédito')setSituacao('pendente')}

 async function salvar(e:React.FormEvent){
  e.preventDefault();setSaving(true);setErro('');setOk('')
  try{
   if(parcelada&&(!vencimento||parcelas<1))throw new Error('Informe o número de parcelas e o primeiro vencimento.')
   const{error}=await supabase.rpc('salvar_despesa_v17_76',{p_data:data,p_categoria_id:cat,p_descricao:descricao,p_forma_pagamento:forma,p_valor:valor,p_observacoes:obs||null,p_parcelas:parcelada?parcelas:1,p_primeiro_vencimento:parcelada?vencimento:null})
   if(error)throw error
   setOk(parcelada?'Parcelas adicionadas ao Contas a Pagar. Cada valor entrará no Caixa quando seu pagamento for confirmado.':'Despesa registrada no caixa.')
   setDescricao('');setValor(0);setParcelas(1);setVencimento('');setObs('')
  }catch(e:unknown){setErro(e&&typeof e==='object'&&'message'in e?String(e.message):'Não foi possível salvar a despesa.')}finally{setSaving(false)}
 }

 return <div className="space-y-5"><form onSubmit={salvar} className="bg-white border rounded-[22px] p-5"><div className="flex gap-3"><CircleDollarSign className="text-[#c80082]"/><div><h2 className="font-black">Nova despesa/pagamento</h2><p className="text-xs text-zinc-500">No cartão de crédito, cada parcela será lançada no mês do respectivo vencimento.</p></div></div>{erro&&<div className="aviso erro mt-3">{erro}</div>}{ok&&<div className="aviso ok mt-3">{ok}</div>}<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4"><F l="Data"><input required type="date" className="input" value={data} onChange={e=>setData(e.target.value)}/></F><F l="Categoria"><select required className="input" value={cat} onChange={e=>setCat(e.target.value)}><option value="">Selecione</option>{cats.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></F><F l="Descrição"><input required className="input" value={descricao} onChange={e=>setDescricao(e.target.value)}/></F><F l="Forma de pagamento"><select className="input" value={forma} onChange={e=>mudarForma(e.target.value)}>{['Dinheiro','Pix','Transferência','Cartão de Débito','Cartão de Crédito','Boleto'].map(x=><option key={x}>{x}</option>)}</select></F><F l="Valor total"><input required type="number" min=".01" step=".01" className="input" value={valor} onChange={e=>setValor(Number(e.target.value))}/></F>{!cartaoCredito&&<F l="Situação"><select className="input" value={situacao} onChange={e=>setSituacao(e.target.value)}><option value="paga">Pago agora</option><option value="pendente">A pagar</option></select></F>}{parcelada&&<><F l="Número de parcelas"><select className="input" value={parcelas} onChange={e=>setParcelas(Number(e.target.value))}>{Array.from({length:24},(_,i)=>i+1).map(x=><option key={x} value={x}>{x}x</option>)}</select></F><F l="Primeiro vencimento"><input required type="date" className="input" value={vencimento} onChange={e=>setVencimento(e.target.value)}/></F></>}<F l="Observações"><input className="input" value={obs} onChange={e=>setObs(e.target.value)}/></F></div>{parcelada&&valor>0&&<div className="mt-3 rounded-xl bg-zinc-50 border p-3 text-sm"><strong>{parcelas}x</strong> • valor médio de {brl(valorParcela)} • total {brl(valor)}<p className="text-xs text-zinc-500 mt-1">O arredondamento de centavos será ajustado na última parcela.</p></div>}<button disabled={saving} className="botao mt-4"><Check size={14}/>{saving?'Salvando...':parcelada?'Gerar parcelas mensais':'Registrar despesa'}</button></form><div className="financeiro-base"><style>{`.financeiro-base>div>div:nth-child(2)>form{display:none}.financeiro-base>div>div:nth-child(2){grid-template-columns:1fr}`}</style><FinanceiroBase/></div></div>
}

function F({l,children}:{l:string;children:React.ReactNode}){return <label><span className="text-[11px] font-bold text-zinc-600 block mb-1">{l}</span>{children}</label>}
