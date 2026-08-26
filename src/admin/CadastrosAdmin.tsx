import React,{useState}from'react'
import {Package,Tag,Users,Truck,WalletCards,ShieldCheck,type LucideIcon}from'lucide-react'
import ProdutosAdmin from'./ProdutosAdmin'
import CategoriasAdmin from'./CategoriasAdmin'
import ClientesAdmin from'./ClientesAdmin'
import FornecedoresAdmin from'./FornecedoresAdmin'
import CategoriasFinanceirasAdmin from'./CategoriasFinanceirasAdmin'
import UsuariosAdmin from'./UsuariosAdminV20'

type Aba='Clientes'|'Categorias'|'Categorias Financeiras'|'Fornecedores'|'Produtos'|'Usuários e Permissões'
const itens:[Aba,LucideIcon][]=[
 ['Clientes',Users],['Categorias',Tag],['Categorias Financeiras',WalletCards],['Fornecedores',Truck],['Produtos',Package],['Usuários e Permissões',ShieldCheck]
]

export default function CadastrosAdmin({admin=false}:{admin?:boolean}){
 const[aba,setAba]=useState<Aba>('Clientes')
 const visiveis=admin?itens:itens.filter(([nome])=>nome!=='Usuários e Permissões')
 return <div className="space-y-5">
  <div className="rounded-[24px] bg-zinc-950 text-white p-6">
   <p className="text-[10px] uppercase tracking-[.2em] font-black text-[#ff70c8]">THITA Store</p>
   <h1 className="mt-1 text-2xl font-black">Cadastros</h1>
   <p className="mt-1 text-xs text-zinc-400">Escolha abaixo o cadastro que deseja consultar ou alterar.</p>
  </div>
  <div className="bg-white border rounded-[22px] p-3 flex gap-2 overflow-x-auto">
   {visiveis.map(([nome,Icon])=><button key={nome} onClick={()=>setAba(nome)} className={`shrink-0 h-11 px-4 rounded-xl border inline-flex items-center gap-2 text-xs font-black ${aba===nome?'bg-[#c80082] border-[#c80082] text-white':'bg-white border-zinc-200 text-zinc-600'}`}><Icon size={15}/>{nome}</button>)}
  </div>
  {aba==='Clientes'&&<ClientesAdmin/>}
  {aba==='Categorias'&&<CategoriasAdmin/>}
  {aba==='Categorias Financeiras'&&<CategoriasFinanceirasAdmin/>}
  {aba==='Fornecedores'&&<FornecedoresAdmin/>}
  {aba==='Produtos'&&<ProdutosAdmin/>}
  {aba==='Usuários e Permissões'&&<UsuariosAdmin/>}
 </div>
}
