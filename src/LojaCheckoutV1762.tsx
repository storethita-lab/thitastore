import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { supabase } from './supabase';
export type ItemSacola = {
    produto_id: string;
    variante_id: string;
    nome: string;
    sku: string | null;
    tamanho: string;
    quantidade: number;
    preco: number;
    imagem: string | null;
};
type Props = {
    itens: ItemSacola[];
    aberto: boolean;
    fechar: () => void;
    alterar: (itens: ItemSacola[]) => void;
};
const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
export default function LojaCheckout({ itens, aberto, fechar, alterar }: Props) { const [etapa, setEtapa] = useState(1), [empresa, setEmpresa] = useState<any>({}), [ceps, setCeps] = useState<any[]>([]), [locais, setLocais] = useState<any[]>([]), [recebimento, setRecebimento] = useState<'entrega' | 'retirada' | 'transportadora'>('entrega'), [semCep, setSemCep] = useState(false), [localId, setLocalId] = useState(''), [form, setForm] = useState<any>({ cep: '', numero_endereco: '', logradouro: '', bairro: '', cidade: '', estado: '', complemento: '', cliente_email: '', cliente_nome: '', cliente_whatsapp: '', forma_pagamento: 'Combinar via WhatsApp', troco_para: '' }), [frete, setFrete] = useState(0), [prazo, setPrazo] = useState(0), [cotacoes, setCotacoes] = useState<any[]>([]), [cotacao, setCotacao] = useState<any>(null), [erro, setErro] = useState(''), [salvando, setSalvando] = useState(false); useEffect(() => { Promise.all([supabase.from('config_empresa_v17_62').select('*').eq('id', 1).maybeSingle(), supabase.from('fretes_cep_v17_62').select('*').eq('ativo', true), supabase.from('fretes_localidade_v17_62').select('*').eq('ativo', true).order('localidade')]).then(([e, c, l]) => { setEmpresa(e.data || {}); setCeps(c.data || []); setLocais(l.data || []); }); }, []); useEffect(() => { if (aberto)
    setEtapa(1); }, [aberto]); const subtotal = useMemo(() => itens.reduce((a, x) => a + x.preco * x.quantidade, 0), [itens]), total = subtotal + (recebimento === 'retirada' ? 0 : frete); if (!aberto)
    return null; async function calcular() { setErro(''); if (recebimento === 'retirada') {
    setFrete(0);
    setEtapa(2);
    return;
} if (recebimento==='entrega') {
    const l = locais.find(x => x.id === localId);
    if (!l) {
        setErro('Selecione o bairro ou localidade.');
        return;
    }
    const gratis=Boolean(empresa.frete_gratis_ativo)&&Boolean(l.participa_frete_gratis)&&subtotal>=Number(empresa.frete_gratis_acima||0);setFrete(gratis?0:Number(l.valor));
    setPrazo(Number(l.prazo_dias));
    setForm({ ...form, bairro: l.localidade, cep: '' });
    setEtapa(2);
    return;
} const cep = String(form.cep).replace(/\D/g, ''); if (cep.length !== 8) {
    setErro('Informe um CEP completo.');
    return;
} if(recebimento==='transportadora'){setSalvando(true);const{data,error}=await supabase.functions.invoke('melhor-envio-cotacao',{body:{cep_destino:cep,itens}});setSalvando(false);if(error||data?.error){setErro(data?.error||error?.message||'Falha na cotação.');return}setCotacoes(data.opcoes||[]);if(!(data.opcoes||[]).length)setErro('Nenhuma transportadora disponível para este CEP.');return} const r = ceps.find(x => cep >= x.cep_inicial && cep <= x.cep_final); if (!r) {
    setErro('Ainda não há uma tarifa cadastrada para este CEP. Fale com a loja pelo WhatsApp.');
    return;
} setFrete(Number(r.valor)); setPrazo(Number(r.prazo_dias)); setEtapa(2); } function validarEndereco() { if (recebimento !== 'retirada' && (!form.numero_endereco || !form.logradouro || !form.bairro || !form.cidade || !form.estado)) {
    setErro('Preencha o endereço completo.');
    return;
} setErro(''); setEtapa(3); } function validarPessoa() { if (!form.cliente_email || !form.cliente_nome || !form.cliente_whatsapp) {
    setErro('Preencha e-mail, nome e WhatsApp.');
    return;
} setErro(''); setEtapa(4); } async function finalizar() { setSalvando(true); setErro(''); const dados = { ...form, tipo_recebimento: recebimento, frete: recebimento === 'retirada' ? 0 : frete, subtotal, itens,transportadora:cotacao?.transportadora||null,servico_frete:cotacao?.nome||null,prazo_frete:prazo,cotacao_frete:cotacao?.raw||null }; const { data, error } = await supabase.rpc('criar_pedido_catalogo_v17_63', { p_dados: dados }); if (error) {
    setErro(error.message);
    setSalvando(false);
    return;
} const numero = data?.numero || ''; const linhas = itens.map(x => `• ${x.quantidade}x ${x.nome} — Tam. ${x.tamanho} — ${brl(x.preco * x.quantidade)}${x.imagem ? `\nImagem: ${x.imagem}` : ''}`).join('\n'); const texto = `Olá! Pedido #${numero} realizado no catálogo ${empresa.nome || 'THITA Store'}.\n\n${linhas}\n\nSubtotal: ${brl(subtotal)}\nFrete: ${brl(recebimento === 'retirada' ? 0 : frete)}\nTotal: ${brl(total)}\nRecebimento: ${recebimento === 'entrega' ? 'Entrega local' : recebimento==='transportadora'?`Melhor Envio — ${cotacao?.transportadora||''} ${cotacao?.nome||''}`:'Retirada'}\nPagamento: ${form.forma_pagamento}\nCliente: ${form.cliente_nome}\nWhatsApp: ${form.cliente_whatsapp}\nE-mail: ${form.cliente_email}${recebimento !== 'retirada' ? `\nEndereço: ${form.logradouro}, ${form.numero_endereco} — ${form.bairro} — ${form.cidade}/${form.estado} — CEP ${form.cep || 'local sem CEP'}` : ''}`; alterar([]); setSalvando(false); window.open(`https://wa.me/${String(empresa.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, '_blank'); setEtapa(5); } const titulo = ['Sacola', 'Entrega', 'Dados pessoais', 'Pagamento', 'Pedido registrado'][etapa - 1]; return <div className="fixed inset-0 z-[100] bg-black/60 p-3 overflow-y-auto">
<div className="min-h-full grid place-items-center">
<div className="bg-white rounded-[26px] w-full max-w-3xl overflow-hidden">
<header className="bg-zinc-950 text-white p-5 flex justify-between">
<div>
<p className="text-[10px] uppercase text-[#ff70c8] font-black">Finalizar compra</p>
<h2 className="text-xl font-black">{titulo}</h2>
</div>
<button onClick={fechar}>
<X />
</button>
</header>
<div className="p-5 md:p-7">{erro && <div className="aviso erro mb-4">{erro}</div>}{etapa === 1 && <>
<div className="space-y-3">{itens.map(x => <div key={x.variante_id} className="border rounded-2xl p-3 flex gap-3 items-center">{x.imagem ? <img src={x.imagem} className="w-16 h-20 object-cover rounded-xl"/> : <ShoppingBag className="m-4"/>}<div className="flex-1">
<b>{x.nome}</b>
<p className="text-xs text-zinc-500">Tam. {x.tamanho} • {brl(x.preco)}</p>
</div>
<div className="flex items-center gap-2">
<button onClick={() => alterar(itens.map(i => i.variante_id === x.variante_id ? { ...i, quantidade: Math.max(1, i.quantidade - 1) } : i))}>
<Minus size={15}/>
</button>
<b>{x.quantidade}</b>
<button onClick={() => alterar(itens.map(i => i.variante_id === x.variante_id ? { ...i, quantidade: i.quantidade + 1 } : i))}>
<Plus size={15}/>
</button>
<button className="text-red-600" onClick={() => alterar(itens.filter(i => i.variante_id !== x.variante_id))}>
<Trash2 size={15}/>
</button>
</div>
</div>)}</div>
<p className="text-right text-xl font-black mt-5">Subtotal: {brl(subtotal)}</p>
<h3 className="font-black mt-6">Forma de recebimento</h3>
<div className="flex gap-3 mt-2">
<Escolha ativo={recebimento === 'entrega'} texto="Entrega" onClick={() => setRecebimento('entrega')}/>
<Escolha ativo={recebimento === 'retirada'} texto="Retirada" onClick={() => { setRecebimento('retirada'); setFrete(0); }}/>
</div>{recebimento === 'entrega' && <div className="mt-4"><input className="input" list="bairros-entrega" placeholder="Digite e selecione seu bairro/localidade" value={form.bairro} onChange={e=>{const valor=e.target.value,l=locais.find(x=>x.localidade.toLocaleLowerCase('pt-BR')===valor.toLocaleLowerCase('pt-BR'));setForm({...form,bairro:valor});setLocalId(l?.id||'')}}/><datalist id="bairros-entrega">{locais.map(x=><option key={x.id} value={x.localidade}>{brl(Number(x.valor))}</option>)}</datalist>{localId&&<p className="mt-2 text-sm font-bold">Frete: {Boolean(empresa.frete_gratis_ativo)&&Boolean(locais.find(x=>x.id===localId)?.participa_frete_gratis)&&subtotal>=Number(empresa.frete_gratis_acima||0)?'Grátis':brl(Number(locais.find(x=>x.id===localId)?.valor||0))}</p>}</div>}{recebimento==='transportadora'&&<div className="mt-4"><input className="input" placeholder="CEP de destino" value={form.cep} onChange={e=>setForm({...form,cep:e.target.value})}/>{cotacoes.length>0&&<div className="mt-3 space-y-2">{cotacoes.map(x=><button key={x.id} onClick={()=>{setCotacao(x);setFrete(x.preco);setPrazo(x.prazo);setEtapa(2)}} className="w-full border rounded-xl p-3 flex justify-between text-left"><span><b>{x.transportadora}</b><br/><small>{x.nome} • até {x.prazo} dia(s)</small></span><b>{brl(x.preco)}</b></button>)}</div>}</div>}<button disabled={!itens.length||salvando} className="botao w-full mt-5" onClick={calcular}>{recebimento==='transportadora'?'Calcular transportadoras':'Continuar'}</button>
</>}{etapa === 2 && <>
<p className="font-black mb-3">Endereço da entrega</p>{recebimento !== 'retirada' ? <div className="grid md:grid-cols-2 gap-3">{[['cep', 'CEP'], ['numero_endereco', 'Número'], ['logradouro', 'Logradouro'], ['bairro', 'Bairro'], ['cidade', 'Cidade'], ['estado', 'Estado'], ['complemento', 'Complemento']].map(([k, l]) => <input key={k} disabled={k === 'cep' && semCep} className="input" placeholder={l} value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}/>)}</div> : <div className="rounded-2xl bg-zinc-50 p-4 text-sm">Retirada na loja. {empresa.retirada_instrucao || [empresa.logradouro, empresa.numero, empresa.bairro, empresa.cidade, empresa.estado].filter(Boolean).join(', ')}</div>}<Resumo subtotal={subtotal} frete={recebimento === 'retirada' ? 0 : frete}/>{prazo > 0 && recebimento !== 'retirada' && <p className="text-xs text-zinc-500">Prazo estimado: {prazo} dia(s).</p>}<Navegar voltar={() => setEtapa(1)} avancar={validarEndereco}/>
</>}{etapa === 3 && <>
<div className="space-y-3">
<input type="email" className="input" placeholder="E-mail" value={form.cliente_email} onChange={e => setForm({ ...form, cliente_email: e.target.value })}/>
<input className="input" placeholder="Nome" value={form.cliente_nome} onChange={e => setForm({ ...form, cliente_nome: e.target.value })}/>
<input className="input" placeholder="WhatsApp" value={form.cliente_whatsapp} onChange={e => setForm({ ...form, cliente_whatsapp: e.target.value })}/>
</div>
<Navegar voltar={() => setEtapa(2)} avancar={validarPessoa}/>
</>}{etapa === 4 && <>
<h3 className="font-black">Como você quer pagar?</h3>
<div className="grid sm:grid-cols-2 gap-2 mt-3">{['Combinar via WhatsApp', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Pix'].map(x => <Escolha key={x} ativo={form.forma_pagamento === x} texto={x} onClick={() => setForm({ ...form, forma_pagamento: x })}/>)}</div>{form.forma_pagamento === 'Dinheiro' && <div className="mt-4">
<p className="text-sm">Seu pedido deu {brl(total)}. Digite quanto vai pagar para prepararmos o troco.</p>
<input type="number" min={total} step=".01" className="input mt-2" placeholder="Troco para" value={form.troco_para} onChange={e => setForm({ ...form, troco_para: e.target.value })}/>
</div>}{form.forma_pagamento === 'Pix' && empresa.chave_pix && <p className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm">Chave Pix: <b>{empresa.chave_pix}</b>
</p>}<Resumo subtotal={subtotal} frete={recebimento === 'retirada' ? 0 : frete}/>
<Navegar voltar={() => setEtapa(3)} avancar={finalizar} texto={salvando ? 'Salvando...' : 'Concluir e enviar pelo WhatsApp'}/>
</>}{etapa === 5 && <div className="text-center py-10">
<Check className="mx-auto text-emerald-600" size={44}/>
<h3 className="text-2xl font-black mt-3">Pedido registrado!</h3>
<p className="text-sm text-zinc-500 mt-2">A conversa com a loja foi aberta no WhatsApp com os dados e as imagens do pedido.</p>
<button className="botao mt-5" onClick={fechar}>Continuar no catálogo</button>
</div>}</div>
</div>
</div>
</div>; }
function Escolha({ ativo, texto, onClick }: {
    ativo: boolean;
    texto: string;
    onClick: () => void;
}) { return <button type="button" onClick={onClick} className={`h-11 px-4 rounded-xl border text-sm font-bold ${ativo ? 'bg-[#c80082] text-white border-[#c80082]' : 'bg-white'}`}>{texto}</button>; }
;
function Resumo({ subtotal, frete }: {
    subtotal: number;
    frete: number;
}) { return <div className="mt-5 border-t pt-4 text-right">
<p>Produtos: {brl(subtotal)}</p>
<p>Frete: {brl(frete)}</p>
<p className="text-xl font-black">Total: {brl(subtotal + frete)}</p>
</div>; }
;
function Navegar({ voltar, avancar, texto = 'Continuar' }: {
    voltar: () => void;
    avancar: () => void;
    texto?: string;
}) { return <div className="flex gap-2 mt-5">
<button className="acao" onClick={voltar}>
<ArrowLeft size={14}/>Voltar</button>
<button className="botao flex-1" onClick={avancar}>{texto}</button>
</div>; }
