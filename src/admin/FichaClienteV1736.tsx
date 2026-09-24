import React, { useEffect, useMemo, useState } from "react";
import { dataLoja } from "../utils/dataLoja";
import { CheckCircle, Edit3, History, RefreshCw, X } from "lucide-react";
import { supabase } from "../supabase";
const brl = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0), dataBR = (v) => (/* @__PURE__ */ new Date(`${v.slice(0, 10)}T12:00:00`)).toLocaleDateString("pt-BR"), hoje = () => dataLoja();
function FichaClienteV1736({ cliente, onClose }) {
  const [aba, setAba] = useState("resumo"), [vendas, setVendas] = useState([]), [parcelas, setParcelas] = useState([]), [recebimentos, setRecebimentos] = useState([]), [eventos, setEventos] = useState([]), [loading, setLoading] = useState(true), [erro, setErro] = useState(""), [ok, setOk] = useState(""), [modal, setModal] = useState(null), [parcela, setParcela] = useState(""), [valor, setValor] = useState(""), [data, setData] = useState(hoje()), [obs, setObs] = useState(""), [salvando, setSalvando] = useState(false), [parcelasPlano, setParcelasPlano] = useState(1), [primeiroVencimento, setPrimeiroVencimento] = useState("");
  async function carregar() {
    setLoading(true);
    setErro("");
    const [v, p, r, e] = await Promise.all([supabase.from("vendas_v17_12").select("id,numero,data_venda,forma_pagamento,subtotal,desconto,entrega,total,status,observacoes,venda_itens_v17_12(id,quantidade,preco_unitario,produto_variantes(tamanho,produtos(nome)))").eq("cliente_id", cliente.id).order("data_venda", { ascending: false }), supabase.from("crediario_parcelas_v17_13").select("id,venda_id,parcela_numero,parcelas_total,vencimento,valor,valor_recebido,status,data_pagamento,ignorar_caixa").order("vencimento"), supabase.from("recebimentos_clientes_v17_36").select("*").eq("cliente_id", cliente.id).order("data_recebimento", { ascending: false }), supabase.from("eventos_clientes_v17_36").select("*").eq("cliente_id", cliente.id).order("data_evento", { ascending: false })]);
    if (v.error || p.error || r.error || e.error) setErro("Aplique o SQL V17.36 antes de usar a ficha: " + (v.error?.message || p.error?.message || r.error?.message || e.error?.message));
    else {
      const lista = v.data || [], ids = new Set(lista.map((x) => x.id));
      setVendas(lista);
      setParcelas((p.data || []).filter((x) => ids.has(x.venda_id)));
      setRecebimentos(r.data || []);
      setEventos(e.data || []);
    }
    setLoading(false);
  }
  useEffect(() => {
    void carregar();
  }, [cliente.id]);
  const ativas = vendas.filter((v) => v.status !== "cancelada"), recebimentosAtivos = recebimentos.filter((r) => !r.cancelado), abertas = (v) => parcelas.filter((p) => p.venda_id === v.id && p.status === "aberta"), saldoParcela = (p) => p.status === "paga" ? 0 : Math.max(0, Number(p.valor) - Number(p.valor_recebido || 0)), recebidoVenda = (v) => v.forma_pagamento !== "Credi\xE1rio" ? Number(v.total) : recebimentosAtivos.filter((r) => r.venda_id === v.id).reduce((a, r) => a + Number(r.valor), 0) + parcelas.filter((p) => p.venda_id === v.id && p.status === "paga" && !p.ignorar_caixa && !recebimentosAtivos.some((r) => r.parcela_id === p.id)).reduce((a, p) => a + Number(p.valor), 0), saldoVenda = (v) => Math.max(0, Number(v.total) - recebidoVenda(v)), quitada = (v) => saldoVenda(v) <= 5e-3, totalComprado = ativas.reduce((a, v) => a + Number(v.total), 0), totalRecebido = ativas.reduce((a, v) => a + recebidoVenda(v), 0), saldo = ativas.reduce((a, v) => a + saldoVenda(v), 0), emAberto = ativas.filter((v) => !quitada(v)), quitadas = ativas.filter(quitada), vendasCrediario = ativas.filter((v) => v.forma_pagamento === "Credi\xE1rio"), totalCrediario = vendasCrediario.reduce((a, v) => a + Number(v.total), 0), recebidoCrediario = vendasCrediario.reduce((a, v) => a + recebidoVenda(v), 0), saldoCrediario = vendasCrediario.reduce((a, v) => a + saldoVenda(v), 0), parcelasAbertas = parcelas.filter((p) => p.status === "aberta" && vendasCrediario.some((v) => v.id === p.venda_id)), vencidoCrediario = parcelasAbertas.filter((p) => p.vencimento < hoje()).reduce((a, p) => a + saldoParcela(p), 0);
  function abrir(tipo, venda) {
    setErro("");
    setOk("");
    setModal({ tipo, venda });
    setObs(venda.observacoes || "");
    setData(tipo === "editar" ? venda.data_venda : hoje());
    setParcela("");
    setValor(saldoVenda(venda).toFixed(2));
    const plano = parcelas.filter((p) => p.venda_id === venda.id).sort((a, b) => a.parcela_numero - b.parcela_numero);
    setParcelasPlano(plano[0]?.parcelas_total || 1);
    setPrimeiroVencimento(plano[0]?.vencimento || venda.data_venda);
  }
  function abrirParcela(p) {
    const venda = vendas.find((v) => v.id === p.venda_id);
    if (!venda || p.status === "paga") return;
    setErro("");
    setOk("");
    setModal({ tipo: "parcela", venda, parcela: p });
    setData(hoje());
    setObs("");
    setValor(saldoParcela(p).toFixed(2));
  }
  async function salvarRecebimento() {
    if (!modal) return;
    const n = Number(valor.replace(",", "."));
    const restante = modal.tipo === "parcela" ? saldoParcela(modal.parcela) : saldoVenda(modal.venda);
    if (!n || n <= 0 || !data) {
      setErro("Informe valor e data.");
      return;
    }
    if (n > restante + 5e-3) {
      setErro("O valor recebido n\xE3o pode ultrapassar o saldo de " + brl(restante) + ".");
      return;
    }
    setSalvando(true);
    const { error } = modal.tipo === "parcela" ? await supabase.rpc("receber_parcela_crediario_v17_29", { p_parcela_id: modal.parcela.id, p_valor_recebido: n, p_data_recebimento: data }) : await supabase.rpc("receber_compra_cliente_v17_36", { p_venda_id: modal.venda.id, p_parcela_id: null, p_valor: n, p_data: data, p_observacoes: obs, p_historico_mensal: modal.tipo === "mensal" });
    if (error) setErro(error.message);
    else {
      setOk(modal.tipo === "mensal" ? "Pagamento passado lan\xE7ado no hist\xF3rico." : modal.tipo === "parcela" ? "Parcela quitada e m\xEAs fechado." : "Recebimento registrado.");
      setModal(null);
      await carregar();
    }
    setSalvando(false);
  }
  async function salvarEdicao() {
    if (!modal || !data) return;
    setSalvando(true);
    const { error } = await supabase.rpc("editar_compra_cliente_v17_36", { p_venda_id: modal.venda.id, p_data: data, p_observacoes: obs });
    if (error) setErro(error.message);
    else if (modal.venda.forma_pagamento === "Credi\xE1rio") {
      const { error: pe } = await supabase.rpc("reparcelar_compra_cliente_v17_39", { p_venda_id: modal.venda.id, p_parcelas: parcelasPlano, p_primeiro_vencimento: primeiroVencimento });
      if (pe) setErro(pe.message);
      else {
        setOk("Compra e parcelamento atualizados.");
        setModal(null);
        await carregar();
      }
    } else {
      setOk("Compra atualizada.");
      setModal(null);
      await carregar();
    }
    setSalvando(false);
  }
  const pagamentos = useMemo(() => [...recebimentosAtivos.map((r) => ({ id: r.id, venda_id: r.venda_id, data: r.data_recebimento, valor: Number(r.valor), tipo: r.historico_mensal ? "Hist\xF3rico mensal" : "Recebimento", obs: r.observacoes })), ...parcelas.filter((p) => p.status === "paga" && !p.ignorar_caixa && !recebimentosAtivos.some((r) => r.parcela_id === p.id)).map((p) => ({ id: p.id, venda_id: p.venda_id, data: p.data_pagamento || p.vencimento, valor: Number(p.valor), tipo: "Pagamento anterior", obs: null })), ...ativas.filter((v) => v.forma_pagamento !== "Credi\xE1rio").map((v) => ({ id: "imediato-" + v.id, venda_id: v.id, data: v.data_venda, valor: Number(v.total), tipo: "Pagamento na compra", obs: null }))].sort((a, b) => b.data.localeCompare(a.data)), [recebimentosAtivos, parcelas, vendas]);
  const linhaTempo = useMemo(() => [...ativas.map((v) => ({ id: "v" + v.id, data: v.data_venda, tipo: "Compra", descricao: `Compra ${v.numero} \u2014 ${brl(v.total)}` })), ...pagamentos.map((p) => ({ id: "p" + p.id, data: p.data, tipo: p.tipo, descricao: `${brl(p.valor)} \u2014 compra ${vendas.find((v) => v.id === p.venda_id)?.numero || ""}` })), ...eventos.map((e) => ({ id: "e" + e.id, data: e.data_evento, tipo: e.tipo, descricao: e.descricao }))].sort((a, b) => b.data.localeCompare(a.data)), [ativas, pagamentos, eventos, vendas]);
  return <div className="fixed inset-0 z-[150] bg-black/60 p-3 md:p-6 overflow-auto"><div className="bg-[#f7f7f8] rounded-[26px] max-w-7xl mx-auto min-h-[90vh] overflow-hidden"><div className="bg-zinc-950 text-white p-6 flex justify-between"><div><p className="text-[10px] uppercase text-[#ff70c8] font-black">Ficha do cliente</p><h1 className="text-2xl font-black">{cliente.nome}</h1><p className="text-xs text-zinc-400">{[cliente.documento, cliente.telefone, cliente.email].filter(Boolean).join(" \u2022 ") || "Sem contatos informados"}</p></div><button onClick={onClose}><X /></button></div><div className="p-4 md:p-6 space-y-4">{erro && <div className="aviso erro">{erro}</div>}{ok && <div className="aviso ok">{ok}</div>}<div className="flex gap-2 overflow-x-auto">{[["resumo", "Resumo"], ["compras", "Compras"], ["pagamentos", "Pagamentos"], ["quitadas", "Compras quitadas"], ["historico", "Hist\xF3rico completo"], ["crediario", "Credi\xE1rio"]].map(([id, n]) => <button key={id} onClick={() => setAba(id)} className={`h-10 px-4 rounded-xl border text-xs font-black shrink-0 ${aba === id ? "bg-[#c80082] text-white" : "bg-white"}`}>{n}</button>)}<button onClick={carregar} className="h-10 w-10 rounded-xl bg-white border grid place-items-center"><RefreshCw size={14} /></button></div>{loading ? <div className="py-20 grid place-items-center"><RefreshCw className="animate-spin" /></div> : <>{aba === "resumo" && <><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Card l="Compras" v={String(ativas.length)} /><Card l="Total comprado" v={brl(totalComprado)} /><Card l="Total recebido" v={brl(totalRecebido)} /><Card l="Saldo em aberto" v={brl(saldo)} /></div></>}{aba === "compras" && <Compras vendas={emAberto} recebidoVenda={recebidoVenda} saldoVenda={saldoVenda} abrir={abrir} />} {aba === "quitadas" && <Compras vendas={quitadas} recebidoVenda={recebidoVenda} saldoVenda={saldoVenda} abrir={abrir} />} {aba === "pagamentos" && <Tabela><thead><tr><th>Data</th><th>Compra</th><th>Tipo</th><th>Valor</th><th>Observações</th></tr></thead><tbody>{pagamentos.map((p) => <tr key={p.id}><td>{dataBR(p.data)}</td><td>{vendas.find((v) => v.id === p.venda_id)?.numero}</td><td>{p.tipo}</td><td>{brl(p.valor)}</td><td>{p.obs || "\u2014"}</td></tr>)}</tbody></Tabela>} {aba === "crediario" && <CrediarioCliente parcelas={parcelas} vendas={vendasCrediario} recebidoVenda={recebidoVenda} saldoVenda={saldoVenda} saldoParcela={saldoParcela} vencido={vencidoCrediario} abrirParcela={abrirParcela} />} {aba === "historico" && <div className="bg-white border rounded-[22px] divide-y">{linhaTempo.map((x) => <div key={x.id} className="p-4 flex gap-4"><span className="text-xs font-bold w-24">{dataBR(x.data)}</span><div><b className="text-xs uppercase text-[#c80082]">{x.tipo}</b><p className="text-sm">{x.descricao}</p></div></div>)}</div>}</>}</div></div>{modal && <Modal titulo={modal.tipo === "editar" ? "Editar compra" : modal.tipo === "recebimentos" ? "Hist\xF3rico de recebimentos" : modal.tipo === "mensal" ? "Lan\xE7ar hist\xF3rico mensal" : modal.tipo === "parcela" ? "Quitar parcela" : "Receber compra"} fechar={() => setModal(null)}>{modal.tipo === "recebimentos" ? <Tabela><thead><tr><th>Data</th><th>Tipo</th><th>Valor</th><th>Observações</th></tr></thead><tbody>{pagamentos.filter((p) => p.venda_id === modal.venda.id).map((p) => <tr key={p.id}><td>{dataBR(p.data)}</td><td>{p.tipo}</td><td>{brl(p.valor)}</td><td>{p.obs || "\u2014"}</td></tr>)}</tbody></Tabela> : modal.tipo === "editar" ? <><Campo l="Data da compra"><input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} /></Campo>{modal.venda.forma_pagamento === "Credi\xE1rio" && <div className="grid grid-cols-2 gap-3"><Campo l="Quantidade de parcelas"><input type="number" min="1" max="24" className="input" value={parcelasPlano} onChange={(e) => setParcelasPlano(Number(e.target.value))} /></Campo><Campo l="Primeiro vencimento"><input type="date" className="input" value={primeiroVencimento} onChange={(e) => setPrimeiroVencimento(e.target.value)} /></Campo></div>}<Campo l="Observações"><textarea className="input min-h-24 py-2" value={obs} onChange={(e) => setObs(e.target.value)} /></Campo><button disabled={salvando} onClick={salvarEdicao} className="botao mt-4 w-full">Salvar edição</button></> : <><div className="grid grid-cols-3 gap-2 bg-zinc-50 rounded-xl p-3 text-sm"><div><small>Total</small><b className="block">{brl(modal.tipo === "parcela" ? modal.parcela.valor : modal.venda.total)}</b></div><div><small>Recebido</small><b className="block">{brl(modal.tipo === "parcela" ? Number(modal.parcela.valor_recebido || 0) : recebidoVenda(modal.venda))}</b></div><div><small>Restante</small><b className="block">{brl(modal.tipo === "parcela" ? saldoParcela(modal.parcela) : saldoVenda(modal.venda))}</b></div></div><Campo l="Valor recebido"><input type="number" min="0.01" step="0.01" className="input" value={valor} readOnly={modal.tipo === "parcela"} onChange={(e) => setValor(e.target.value)} /></Campo><Campo l={modal.tipo === "mensal" ? "Data passada do pagamento" : "Data do recebimento"}><input type="date" className="input" max={modal.tipo === "mensal" ? hoje() : void 0} value={data} onChange={(e) => setData(e.target.value)} /></Campo><Campo l="Observações"><input className="input" value={obs} onChange={(e) => setObs(e.target.value)} /></Campo><button disabled={salvando} onClick={salvarRecebimento} className="botao mt-4 w-full">{modal.tipo === "parcela" ? "Confirmar quitação" : "Confirmar lançamento"}</button></>}</Modal>}</div>;
}
function CrediarioCliente({ parcelas, vendas, recebidoVenda, saldoVenda, saldoParcela, vencido, abrirParcela }) {
  const lista = parcelas.filter((p) => vendas.some((v) => v.id === p.venda_id));
  const abertas = lista.filter((p) => p.status !== "paga");
  return <div className="space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Card l="Total no crediário" v={brl(vendas.reduce((a, v) => a + Number(v.total), 0))} />
      <Card l="Recebido" v={brl(vendas.reduce((a, v) => a + recebidoVenda(v), 0))} />
      <Card l="Em aberto" v={brl(vendas.reduce((a, v) => a + saldoVenda(v), 0))} />
      <Card l="Vencido" v={brl(vencido)} />
      <Card l="Parcelas abertas" v={String(abertas.length)} />
    </div>
    <Tabela><thead><tr><th>Compra</th><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Recebido</th><th>Falta</th><th>Situação</th><th>Ação</th></tr></thead>
      <tbody>{lista.map((p) => {
        const recebido = p.status === "paga" ? Number(p.valor) : Math.min(Number(p.valor), Number(p.valor_recebido || 0));
        const falta = saldoParcela(p);
        const fechada = p.status === "paga" || falta <= .005;
        const venda = vendas.find((v) => v.id === p.venda_id);
        return <tr key={p.id}>
          <td>{venda?.numero || "—"}</td><td className="font-black">{p.parcela_numero}/{p.parcelas_total}</td>
          <td>{dataBR(p.vencimento)}</td><td>{brl(p.valor)}</td>
          <td className="font-bold text-emerald-700">{brl(recebido)}</td>
          <td className="font-black">{brl(falta)}</td>
          <td>{fechada ? "PAGA" : recebido > 0 ? "PARCIAL" : p.vencimento < hoje() ? "VENCIDA" : "ABERTA"}</td>
          <td>{fechada ? <span className="inline-flex items-center gap-2 font-bold text-emerald-700"><input type="checkbox" checked readOnly /> Mês fechado</span> : <button className="acao" onClick={() => abrirParcela(p)}><CheckCircle size={13} />Receber restante</button>}</td>
        </tr>;
      })}</tbody>
    </Tabela>
  </div>;
}
function Compras({ vendas, recebidoVenda, saldoVenda, abrir }) {
  return <Tabela><thead><tr><th>Data</th><th>Compra</th><th>Pagamento</th><th>Itens</th><th>Desconto</th><th>Total</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{vendas.map((v) => {
    const restante = saldoVenda(v), paga = restante <= 5e-3;
    return <React.Fragment key={v.id}><tr><td>{dataBR(v.data_venda)}</td><td className="font-bold">{v.numero}</td><td>{v.forma_pagamento}</td><td>{v.venda_itens_v17_12.reduce((a, i) => a + Number(i.quantidade), 0)}</td><td>{brl(v.desconto)}</td><td className="font-black">{brl(v.total)}</td><td>{paga ? "QUITADA" : `${brl(recebidoVenda(v))} recebido \u2022 ${brl(restante)} em aberto`}</td><td><div className="flex flex-wrap justify-center gap-1"><button disabled={paga} onClick={() => abrir("receber", v)} className="acao"><CheckCircle size={13} />Receber</button><button onClick={() => abrir("editar", v)} className="acao"><Edit3 size={13} />Editar compra</button><button onClick={() => abrir("recebimentos", v)} className="acao"><History size={13} />Recebimentos</button></div></td></tr><tr className="bg-zinc-50"><td colSpan={8} className="!p-0"><div className="px-4 py-3"><p className="text-[10px] uppercase font-black text-zinc-500 mb-2 text-left">Produtos desta compra</p><div className="grid gap-1">{v.venda_itens_v17_12.map((i) => <div key={i.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 bg-white border rounded-lg px-3 py-2 text-xs text-left"><b>{i.produto_variantes.produtos.nome}</b><span>Tam. {i.produto_variantes.tamanho}</span><span>{i.quantidade} un. × {brl(i.preco_unitario)}</span><b>{brl(Number(i.quantidade) * Number(i.preco_unitario))}</b></div>)}</div></div></td></tr></React.Fragment>;
  })}</tbody></Tabela>;
}
function Tabela({ children }) {
  return <div className="bg-white border rounded-[22px] overflow-x-auto"><table className="w-full min-w-[900px] text-sm [&_th]:p-3 [&_th]:bg-zinc-50 [&_th]:text-[10px] [&_th]:uppercase [&_td]:p-3 [&_td]:text-center [&_tr]:border-t">{children}</table></div>;
}
function Card({ l, v }) {
  return <div className="bg-white border rounded-2xl p-5"><p className="text-[10px] uppercase font-black text-zinc-400">{l}</p><p className="text-2xl font-black mt-2">{v}</p></div>;
}
function Campo({ l, children }) {
  return <label className="block mt-3"><span className="text-xs font-bold block mb-1">{l}</span>{children}</label>;
}
function Modal({ titulo, fechar, children }) {
  return <div className="fixed inset-0 z-[170] bg-black/60 p-4 grid place-items-center" onClick={fechar}><div className="bg-white rounded-[24px] p-6 w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}><div className="flex justify-between"><h2 className="text-xl font-black">{titulo}</h2><button onClick={fechar}><X /></button></div><div className="mt-4">{children}</div></div></div>;
}
export {
  FichaClienteV1736 as default
};
