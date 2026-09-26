import {CalendarDays,CheckCircle2,Info,ShieldCheck} from 'lucide-react'

const versoes=[
  {
    versao:'V17.72',data:'26/09/2026',titulo:'Parcelamento no cartão de crédito',atual:true,
    itens:[
      'Inclusão da quantidade de parcelas ao selecionar Cartão de Crédito na venda.',
      'Exibição automática do valor estimado de cada parcela.',
      'Gravação da quantidade de parcelas junto à venda para consultas futuras.',
      'Separação preservada entre parcelamento do cartão e crediário do cliente.'
    ]
  },
  {
    versao:'V17.71',data:'25/09/2026',titulo:'Área Sobre e histórico de versões',
    itens:[
      'Inclusão do campo Sobre no menu administrativo.',
      'Apresentação da versão instalada e da data de atualização.',
      'Registro do escopo, melhorias e correções de cada versão.',
      'Consulta disponível para administradores e operadores, sem alteração de dados.'
    ]
  },
  {
    versao:'V17.70',data:'25/09/2026',titulo:'Apresentação do banner do catálogo',
    itens:[
      'Redução do sombreamento aplicado sobre as imagens dos banners.',
      'Remoção do título do banner na apresentação pública do catálogo.',
      'Manutenção do título na administração para identificação interna.',
      'Subtítulo e botão promocional continuam disponíveis quando configurados.'
    ]
  },
  {
    versao:'V17.69',data:'23/09/2026',titulo:'Crediário e pagamentos parciais',
    itens:[
      'Preservação do valor original da parcela ao registrar pagamento parcial.',
      'Apresentação dos valores recebido e restante em cada parcela.',
      'Ação Fechar mês somente para parcelas parcialmente recebidas.',
      'Padronização do crediário na Ficha do Cliente e no Financeiro.',
      'Correção do filtro Todas no Financeiro > Crediário.'
    ]
  },
  {
    versao:'V17.68',data:'23/09/2026',titulo:'Sincronização das parcelas',
    itens:[
      'Distribuição dos recebimentos pelas parcelas em ordem de vencimento.',
      'Parcela mantida aberta até que o valor integral seja recebido.',
      'Reprocessamento seguro das compras que já possuíam recebimentos.'
    ]
  },
  {
    versao:'V17.67',data:'21/09/2026',titulo:'Calendário comercial da Bahia',
    itens:[
      'Padronização das novas datas pelo fuso America/Bahia.',
      'Correção da virada de data em vendas, entradas e eventos financeiros.',
      'Datas históricas informadas manualmente foram preservadas.'
    ]
  },
  {
    versao:'V17.66',data:'21/09/2026',titulo:'Datas do Dashboard',
    itens:[
      'Correção do agrupamento diário no gráfico de vendas dos últimos sete dias.',
      'Exibição das movimentações no dia comercial correto da loja.'
    ]
  },
  {
    versao:'V17.65',data:'18/09/2026',titulo:'Relatórios e recebimentos',
    itens:[
      'Correção dos filtros do relatório financeiro de crediário.',
      'Unificação dos recebimentos da Ficha do Cliente com Financeiro e Relatórios.',
      'Remoção do lançamento mensal antigo da Ficha do Cliente.'
    ]
  },
  {
    versao:'V17.64',data:'13/09/2026',titulo:'Base estável do sistema',
    itens:[
      'Catálogo com retirada na loja e entrega local por bairro.',
      'Gestão de clientes, produtos, estoque, vendas, crediário e financeiro.',
      'Ficha completa do cliente e relatórios administrativos.',
      'Backup completo disponível na área de Cadastros.'
    ]
  }
]

export default function SobreSistema(){
  const atual=versoes[0]
  return <div className="space-y-5">
    <div className="rounded-[24px] bg-zinc-950 text-white p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-[#c80082] grid place-items-center"><Info/></div>
      <div><p className="text-[10px] uppercase tracking-[.2em] text-[#ff70c8] font-black">THITA Store</p><h1 className="text-2xl font-black">Sobre o sistema</h1><p className="text-xs text-zinc-400 mt-1">Versões, melhorias e correções aplicadas.</p></div>
    </div>

    <div className="grid md:grid-cols-[280px_1fr] gap-4">
      <div className="bg-white border rounded-[22px] p-5 h-fit">
        <p className="text-[10px] uppercase font-black text-zinc-400">Versão instalada</p>
        <p className="text-4xl font-black mt-2 text-[#c80082]">{atual.versao}</p>
        <p className="mt-2 font-bold">{atual.titulo}</p>
        <p className="mt-2 text-xs text-zinc-500 flex items-center gap-2"><CalendarDays size={14}/>{atual.data}</p>
        <div className="mt-5 pt-4 border-t text-xs text-zinc-600 flex items-start gap-2"><ShieldCheck size={16} className="text-emerald-600 shrink-0"/><span>Histórico informativo. Esta tela não modifica os dados da loja.</span></div>
      </div>

      <div className="space-y-3">
        {versoes.map(v=><section key={v.versao} className={`bg-white border rounded-[22px] overflow-hidden ${v.atual?'border-[#c80082]/40 shadow-sm':''}`}>
          <div className="p-5 flex flex-wrap justify-between gap-3 border-b bg-zinc-50/60">
            <div className="flex items-center gap-3"><span className={`px-3 py-1.5 rounded-full text-xs font-black ${v.atual?'bg-[#c80082] text-white':'bg-zinc-200 text-zinc-700'}`}>{v.versao}</span><div><h2 className="font-black">{v.titulo}</h2>{v.atual&&<p className="text-[10px] uppercase text-[#c80082] font-black mt-0.5">Versão atual</p>}</div></div>
            <span className="text-xs text-zinc-500 flex items-center gap-1"><CalendarDays size={13}/>{v.data}</span>
          </div>
          <ul className="p-5 grid gap-3">{v.itens.map(item=><li key={item} className="flex gap-3 text-sm text-zinc-700"><CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5"/><span>{item}</span></li>)}</ul>
        </section>)}
      </div>
    </div>
  </div>
}
