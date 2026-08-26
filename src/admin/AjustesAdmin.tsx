import React,{useEffect,useMemo,useState}from'react';
import{AlertTriangle,PackageCheck,RefreshCw,RotateCcw,Settings2}from'lucide-react';
import{supabase}from'../supabase';
import AuditoriaAdmin from'./AuditoriaAdmin';

type VendaItem={id:string;
quantidade:number;
preco_unitario:number;
produto_variantes:{id:string;
tamanho:string;
produtos:{nome:string;
sku:string|null}}};
type Venda={id:string;
numero:string;
data_venda:string;
total:number;
status:string;
clientes:{nome:string}|null;
venda_itens_v17_12:VendaItem[]};
type Entrada={id:string;
numero_documento:string;
data_entrada:string;
total:number;
status:string;
fornecedores:{nome:string}|null};
type Var={id:string;
tamanho:string;
estoque:number;
produtos:{nome:string;
sku:string|null}};
type Aba='vendas'|'entradas'|'devolucoes'|'ajustes'|'auditoria';

export default function AjustesAdmin({admin=false}:{admin?:boolean}){const[aba,setAba]=useState<Aba>('vendas'),[vendas,setVendas]=useState<Venda[]>([]),[entradas,setEntradas]=useState<Entrada[]>([]),[vars,setVars]=useState<Var[]>([]),[loading,setLoading]=useState(true),[erro,setErro]=useState(''),[ok,setOk]=useState(''),[motivo,setMotivo]=useState(''),[vendaId,setVendaId]=useState(''),[itemId,setItemId]=useState(''),[qtd,setQtd]=useState(1),[varianteId,setVarianteId]=useState(''),[delta,setDelta]=useState(0);
async function carregar(){setLoading(true);
const[v,e,p]=await Promise.all([supabase.from('vendas_v17_12').select('id,numero,data_venda,total,status,clientes(nome),venda_itens_v17_12(id,quantidade,preco_unitario,produto_variantes(id,tamanho,produtos(nome,sku)))').order('created_at',{ascending:false}).limit(100),supabase.from('entradas_mercadorias').select('id,numero_documento,data_entrada,total,status,fornecedores(nome)').order('created_at',{ascending:false}).limit(100),supabase.from('produto_variantes').select('id,tamanho,estoque,produtos(nome,sku)').eq('ativo',true)]);
if(v.error||e.error||p.error)setErro(v.error?.message||e.error?.message||p.error?.message||'Erro ao carregar.');
else{setVendas((v.data||[])as unknown as Venda[]);
setEntradas((e.data||[])as unknown as Entrada[]);
setVars((p.data||[])as unknown as Var[])}setLoading(false)}useEffect(()=>{void carregar()},[]);
const venda=useMemo(()=>vendas.find(v=>v.id===vendaId),[vendas,vendaId]);
async function executar(rpc:string,args:Record<string,unknown>,msg:string){setErro('');
setOk('');
if(!motivo.trim()){setErro('Informe o motivo da operação.');
return}const{error}=await supabase.rpc(rpc,{...args,p_motivo:motivo.trim()});
if(error)setErro(error.message);
else{setOk(msg);
setMotivo('');
setItemId('');
setQtd(1);
setDelta(0);
await carregar()}}async function cancelarVenda(v:Venda){if(!confirm(`Cancelar a venda ${v.numero} e devolver os itens ao estoque?`))return;
await executar('cancelar_venda_v17_15',{p_venda_id:v.id},'Venda cancelada e estoque restaurado.')}async function cancelarEntrada(e:Entrada){if(!confirm(`Estornar a entrada ${e.numero_documento}?`))return;
await executar('cancelar_entrada_v17_15',{p_entrada_id:e.id},'Entrada cancelada e estoque estornado.')}return <div className="space-y-5"><div className="rounded-[24px] bg-zinc-950 text-white p-6 flex gap-3 items-center"><Settings2 className="text-[#ff70c8]"/><div><p className="text-[10px] uppercase tracking-[.2em] font-black text-[#ff70c8]">Ajustes</p><h1 className="text-2xl font-black">Cancelamentos e ajustes</h1></div></div><div className="flex gap-2 overflow-x-auto">{([...([['vendas','Cancelar venda'],['entradas','Cancelar entrada'],['devolucoes','Devolução parcial'],['ajustes','Ajuste de estoque']]as[Aba,string][]),...(admin?[['auditoria','Auditoria'] as [Aba,string]]:[])]).map(([id,n])=><button key={id} onClick={()=>{setAba(id);
setErro('');
setOk('')}} className={`h-10 px-4 rounded-xl border text-xs font-black shrink-0 ${aba===id?'bg-[#c80082] text-white border-[#c80082]':'bg-white'}`}>{n}</button>)}</div>{erro&&<div className="aviso erro">{erro}</div>}{ok&&<div className="aviso ok">{ok}</div>}{aba!=='auditoria'&&<div className="bg-white border rounded-[22px] p-4"><label><span className="text-[11px] font-bold text-zinc-600 block mb-1">Motivo obrigatório</span><input className="input" value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Descreva por que esta operação está sendo realizada..."/></label></div>}{aba==='auditoria'?<AuditoriaAdmin/>:loading?<div className="py-20 grid place-items-center"><RefreshCw className="animate-spin"/></div>:<>{aba==='vendas'&&<Lista titulo="Vendas ativas">{vendas.filter(v=>v.status!=='cancelada').map(v=><Linha key={v.id} a={`${v.numero} • ${v.clientes?.nome||''}`} b={new Date(`${v.data_venda}T12:00:00`).toLocaleDateString('pt-BR')} c={`R$ ${Number(v.total).toFixed(2)}`}><button onClick={()=>cancelarVenda(v)} className="acao"><RotateCcw size={14}/>Cancelar</button></Linha>)}</Lista>}{aba==='entradas'&&<Lista titulo="Entradas ativas">{entradas.filter(e=>e.status!=='cancelada').map(e=><Linha key={e.id} a={`${e.numero_documento} • ${e.fornecedores?.nome||''}`} b={new Date(`${e.data_entrada}T12:00:00`).toLocaleDateString('pt-BR')} c={`R$ ${Number(e.total).toFixed(2)}`}><button onClick={()=>cancelarEntrada(e)} className="acao"><RotateCcw size={14}/>Estornar</button></Linha>)}</Lista>}{aba==='devolucoes'&&<div className="bg-white border rounded-[22px] p-5 space-y-3"><h2 className="font-black">Registrar devolução parcial</h2><select className="input" value={vendaId} onChange={e=>{setVendaId(e.target.value);
setItemId('')}}><option value="">Selecione a venda</option>{vendas.filter(v=>v.status!=='cancelada').map(v=><option key={v.id} value={v.id}>{v.numero} — {v.clientes?.nome}</option>)}</select><select className="input" value={itemId} onChange={e=>setItemId(e.target.value)}><option value="">Produto/tamanho</option>{(venda?.venda_itens_v17_12||[]).map(i=><option key={i.id} value={i.id}>{i.produto_variantes.produtos.nome} • {i.produto_variantes.tamanho} • vendido {i.quantidade}</option>)}</select><input type="number" min="1" className="input" value={qtd} onChange={e=>setQtd(Number(e.target.value))}/><button onClick={()=>executar('registrar_devolucao_v17_15',{p_venda_id:vendaId,p_item_id:itemId,p_quantidade:qtd},'Devolução registrada e estoque atualizado.')} className="botao"><PackageCheck size={16}/>Confirmar devolução</button></div>}{aba==='ajustes'&&<div className="bg-white border rounded-[22px] p-5 space-y-3"><h2 className="font-black">Ajuste manual auditável</h2><select className="input" value={varianteId} onChange={e=>setVarianteId(e.target.value)}><option value="">Selecione produto/tamanho</option>{vars.sort((a,b)=>a.produtos.nome.localeCompare(b.produtos.nome)).map(v=><option key={v.id} value={v.id}>{v.produtos.nome} • {v.produtos.sku} • {v.tamanho} • atual {v.estoque}</option>)}</select><label><span className="text-[11px] font-bold">Quantidade do ajuste</span><input type="number" className="input mt-1" value={delta} onChange={e=>setDelta(Number(e.target.value))}/><p className="text-[10px] text-zinc-500 mt-1">Positivo adiciona;
 negativo retira.</p></label>{delta<0&&<p className="text-xs text-amber-700 flex gap-2"><AlertTriangle size={14}/>A retirada será bloqueada se deixar estoque negativo.</p>}<button onClick={()=>executar('ajustar_estoque_v17_15',{p_variante_id:varianteId,p_quantidade:delta},'Estoque ajustado e movimentação registrada.')} className="botao"><Settings2 size={16}/>Confirmar ajuste</button></div>}</>}</div>}
function Lista({titulo,children}:{titulo:string;
children:React.ReactNode}){return <div className="bg-white border rounded-[22px] overflow-hidden"><h2 className="p-5 font-black">{titulo}</h2><div className="divide-y">{children}</div></div>}function Linha({a,b,c,children}:{a:string;
b:string;
c:string;
children:React.ReactNode}){return <div className="p-4 flex flex-wrap justify-between gap-3 items-center text-sm"><div><b>{a}</b><p className="text-xs text-zinc-400">{b}</p></div><b>{c}</b>{children}</div>}


