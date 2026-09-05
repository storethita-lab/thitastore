import React,{useEffect,useRef}from'react'
import RelatoriosBase from'./RelatoriosAdminV152'

const OPERACOES=[
 'Entrada de mercadoria',
 'Venda de produto',
 'Cancelamento de entrada',
 'Cancelamento de venda',
 'Devolução de cliente',
 'Ajuste manual de estoque'
]

export default function RelatoriosAdminV1621(){
 const raiz=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  const completar=()=>{
   const labels=[...(raiz.current?.querySelectorAll('label')||[])]
   const label=labels.find(x=>x.querySelector('span')?.textContent?.trim()==='Operação realizada')
   const select=label?.querySelector('select')
   if(!select)return
   const vistos=new Set<string>();for(const option of[...select.options]){if(vistos.has(option.value))option.remove();else vistos.add(option.value)}
   const existentes=new Set([...select.options].map(x=>x.value))
   for(const nome of OPERACOES)if(!existentes.has(nome))select.add(new Option(nome,nome))
  }
  completar()
  const observer=new MutationObserver(completar)
  if(raiz.current)observer.observe(raiz.current,{childList:true,subtree:true})
  return()=>observer.disconnect()
 },[])
 return <div ref={raiz}><RelatoriosBase/></div>
}
