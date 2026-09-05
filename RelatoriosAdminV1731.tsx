import React,{useState}from'react'
import RelatoriosBase from'./RelatoriosAdminV1621'
import RelatorioVendedores from'./RelatorioVendedoresV1731'
export default function RelatoriosAdminV1731(){const[aba,setAba]=useState<'geral'|'vendedores'>('geral');return <div className="space-y-4"><div className="flex gap-2"><button onClick={()=>setAba('geral')} className={`h-10 px-4 rounded-xl border text-xs font-black ${aba==='geral'?'bg-[#c80082] text-white':'bg-white'}`}>Relatórios gerais</button><button onClick={()=>setAba('vendedores')} className={`h-10 px-4 rounded-xl border text-xs font-black ${aba==='vendedores'?'bg-[#c80082] text-white':'bg-white'}`}>Vendedores</button></div>{aba==='geral'?<RelatoriosBase/>:<RelatorioVendedores/>}</div>}
