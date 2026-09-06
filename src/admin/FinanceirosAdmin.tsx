import React,{useState}from'react'
import {CircleDollarSign,WalletCards,CalendarClock,Users,UsersRound}from'lucide-react'
import FinanceiroAdmin from'./FinanceiroAdmin'
import CrediarioAdmin from'./CrediarioAdmin'
import ContasPagarAdmin from'./ContasPagarAdminV1711'
import ComissoesTaxasAdmin from'./ComissoesTaxasAdminV1731'
import RecebimentosClientesV1738 from'./RecebimentosClientesV1738'

type Aba='Caixa e Despesas'|'Crediário'|'Recebimentos de Clientes'|'Contas a Pagar'|'Comissões e Taxas'
const itens=[
 ['Caixa e Despesas',CircleDollarSign],
 ['Crediário',WalletCards],
 ['Recebimentos de Clientes',UsersRound],
 ['Contas a Pagar',CalendarClock]
 ,['Comissões e Taxas',Users]
]as const

export default function FinanceirosAdmin(){
 const[aba,setAba]=useState<Aba>('Caixa e Despesas')
 return <div className="space-y-5">
  <div className="rounded-[24px] bg-zinc-950 text-white p-6">
   <p className="text-[10px] uppercase tracking-[.2em] font-black text-[#ff70c8]">THITA Store</p>
   <h1 className="mt-1 text-2xl font-black">Financeiros</h1>
   <p className="mt-1 text-xs text-zinc-400">Caixa, recebimentos e pagamentos reunidos em um só lugar.</p>
  </div>
  <div className="bg-white border rounded-[22px] p-3 flex gap-2 overflow-x-auto">
   {itens.map(([nome,Icon])=><button key={nome} onClick={()=>setAba(nome)} className={`shrink-0 h-11 px-4 rounded-xl border inline-flex items-center gap-2 text-xs font-black ${aba===nome?'bg-[#c80082] border-[#c80082] text-white':'bg-white border-zinc-200 text-zinc-600'}`}><Icon size={15}/>{nome}</button>)}
  </div>
  {aba==='Caixa e Despesas'&&<FinanceiroAdmin/>}
  {aba==='Crediário'&&<CrediarioAdmin/>}
  {aba==='Recebimentos de Clientes'&&<RecebimentosClientesV1738/>}
  {aba==='Contas a Pagar'&&<ContasPagarAdmin/>}
  {aba==='Comissões e Taxas'&&<ComissoesTaxasAdmin/>}
 </div>
}
