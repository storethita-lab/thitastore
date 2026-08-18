import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import { Search, LogOut, X, ShoppingBag, Package, Tag, Truck, Users, FileInput, FileOutput, BarChart3, Trash2, Pencil, Plus, AlertCircle, Calendar, MessageCircle, ChevronDown, Eye, Instagram, MapPin, Settings, FileText, FileStack, Upload, Image as ImageIcon, Database, Download, ChevronLeft, ChevronRight, Building2, Heart, SlidersHorizontal, Sparkles, Shirt, Smile, Smartphone } from 'lucide-react';

// Types
type Categoria = string;
type Produto = {
  id: string;
  nome: string;
  desc: string;
  cat: Categoria;
  custo: number;
  margem: number;
  venda: number;
  forn: string;
  img: string;
  imagem?: string;
  imagens?: string[];
  estoque: number;
  novo: boolean;
  promo: boolean;
  tamanhos: string[];
};
type Fornecedor = { id: string; nome: string; cnpj: string; endereco: string; contato: string };
type Cliente = { id: string; nome: string; doc: string; contato: string; endereco?: string };
type Entrada = { id: string; fornId: string; numNota: string; data: string; frete: number; itens: { prodId: string; qtd: number; custo: number }[]; total: number };
type Venda = { id: string; clienteId: string; data: string; itens: { prodId: string; qtd: number; preco: number }[]; total: number; desconto: number; entrega: boolean; entregaValor: number; embalagem: boolean; embalagemValor: number; totalFinal: number; forma: string; parcelas: number; venc: string };
type Crediario = { id: string; vendaId: string; clienteId: string; num: number; vencimento: string; valor: number; status: 'aberto' | 'pago'; data_pagamento?: string };
type UserConfig = { usuario: string; senha: string };
type Empresa = {
  nome: string;
  cnpj: string;
  contato: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  banners?: string[];
  bannersMobile?: string[];
  bannersDesktop?: string[];
};

const ADULT_SIZES = ["PP","P","M","G","GG","G1","G2"];
const INFANT_SIZES = ["2","4","6","8","10","12","14","16"];
const ALL_SIZES = [...ADULT_SIZES, ...INFANT_SIZES];
const SIZES = ALL_SIZES;
const isInfantilCategory = (cat: string) => false;
const ALL_CATS: Categoria[] = ["Baby doll","Blusas","Camisolas","Conjuntos feminino","Conjuntos masculino","Fitness","Infantil feminino","Infantil masculino","Inverno","Pijama Americano"];
// Ordem oficial para sidebar
const SIDEBAR_ORDER: Categoria[] = ["Baby doll","Blusas","Camisolas","Conjuntos feminino","Conjuntos masculino","Fitness","Infantil feminino","Infantil masculino","Inverno","Pijama Americano"];

const mockFornecedores: Fornecedor[] = [
  { id: 'f1', nome: 'Malhas Primavera LTDA', cnpj: '12.345.678/0001-90', endereco: 'Rua das Flores, 123 - Brusque/SC', contato: '(47) 98800-1122' },
  { id: 'f2', nome: 'Confeccções Sol & Lua', cnpj: '98.765.432/0001-11', endereco: 'Av. Central, 456 - Jaraguá do Sul/SC', contato: '(47) 99988-7766' },
];
const mockClientes: Cliente[] = [
  { id: 'c1', nome: 'Maria Silva', doc: '123.456.789-00', contato: '(47) 98888-1111', endereco: 'Rua A, 10' },
  { id: 'c2', nome: 'João Souza', doc: '987.654.321-00', contato: '(47) 97777-2222', endereco: 'Rua B, 20' },
];
const img = (u:string)=>u;
const mockProdutos: Produto[] = [];

function useLocal<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : initial;
    } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal] as const;
}

export default function App() {
   const ordemTamanhos = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3","8","10","12","14","16","2"];
  const ordenarTamanhos = (lista: string[]) => {
    if(!lista) return [];
    return [...lista].sort((a,b) => {
      const ia = ordemTamanhos.indexOf(a);
      const ib = ordemTamanhos.indexOf(b);
      if(ia === -1 && ib === -1) return a.localeCompare(b);
      if(ia === -1) return 1;
      if(ib === -1) return -1;
      return ia - ib;
    });
  }
  // Views
  const [view, setView] = useLocal<'shop'|'admin'>('thita_view', 'shop');
  const [isAuth, setIsAuth] = useLocal<boolean>('thita_auth', false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [loginErr, setLoginErr] = useState('');
  // user config for login
  const [userConfig, setUserConfig] = useLocal<UserConfig>('thita_user', { usuario: 'admin', senha: 'thita2024' });

 // Data
  const [produtos, setProdutos] = useState<Produto[]>(mockProdutos);
  const [produtosLoading, setProdutosLoading] = useState(true);

  // Carrega do Supabase
  useEffect(() => {
    let mounted = true;
    supabase.from('produtos').select('*').then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        console.error('Supabase erro ao carregar produtos', error);
      } else if (data && data.length > 0) {
        const convertidos: Produto[] = data.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          desc: p.descricao || p.desc || '',
          cat: (p.categoria || p.cat || 'Blusas') as any,
          custo: Number(p.custo) || 0,
          margem: Number(p.margem) || 0,
          venda: Number(p.preco || p.venda) || 0,
          forn: p.fornecedor || p.forn || 'f1',
          img: p.foto || p.img || '',
          imagens: p.imagens || (p.foto ? [p.foto] : []),
          estoque: Number(p.estoque) || 0,
          novo: !!p.novo,
          promo: !!p.promo,
          tamanhos: p.tamanhos || [],
        }));
        setProdutos(convertidos);
      }
      setProdutosLoading(false);
    });
    return () => { mounted = false; };
  }, []);
  const [categorias, setCategorias] = useLocal<Categoria[]>('thita_categorias', ALL_CATS);
  const [fornecedores, setFornecedores] = useLocal<Fornecedor[]>('thita_fornecedores', mockFornecedores);
  const [clientes, setClientes] = useLocal<Cliente[]>('thita_clientes', mockClientes);
  const [entradas, setEntradas] = useLocal<Entrada[]>('thita_entradas', []);
  const [vendas, setVendas] = useLocal<Venda[]>('thita_vendas', []);
  const [crediario, setCrediario] = useLocal<Crediario[]>('thita_crediario', []);
  const [empresa, setEmpresa] = useLocal<Empresa>('thita_empresa', {
    nome: 'THITA',
    cnpj: '',
    contato: '75999304778',
    rua: '',
    numero: '',
    bairro: '',
    cidade: 'Alagoinhas, BA',
    banners: [],
    bannersMobile: [],
    bannersDesktop: []
  });

  // --- BANNERS SEPARADOS DESKTOP / CELULAR ---
  const [isMobileView, setIsMobileView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const bannerMobileRef = React.useRef<HTMLInputElement>(null);
  const bannerDesktopRef = React.useRef<HTMLInputElement>(null);
  const [bannerMobileError, setBannerMobileError] = useState('');
  const [bannerDesktopError, setBannerDesktopError] = useState('');
  const [bannerIdx, setBannerIdx] = useState(0);
  const [bannerZoom, setBannerZoom] = useState<string | null>(null);
  const [bannerConfigTab, setBannerConfigTab] = useState<'mobile'|'desktop'>('mobile');

  const bannersAtivos = useMemo(() => {
    const legacy = empresa?.banners || [];
    const mobile = empresa?.bannersMobile || [];
    const desktop = empresa?.bannersDesktop || [];
    if (isMobileView) {
      if (mobile.length > 0) return mobile;
      if (legacy.length > 0) return legacy;
      return [];
    } else {
      if (desktop.length > 0) return desktop;
      if (legacy.length > 0) return legacy;
      return [];
    }
  }, [empresa, isMobileView]);

  // For backward compatibility, keep bannersList alias
  const bannersList = bannersAtivos;

  useEffect(() => {
    if (bannerIdx >= bannersAtivos.length) setBannerIdx(0);
  }, [bannersAtivos.length, bannerIdx]);

  useEffect(() => {
    if (bannersAtivos.length <= 1) return;
    const id = setInterval(() => {
      setBannerIdx((i) => (i + 1) % bannersAtivos.length);
    }, 4000);
    return () => clearInterval(id);
  }, [bannersAtivos.length]);

  const handleBannerUploadGeneric = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'mobile'|'desktop'
  ) => {
    const setErr = target === 'mobile' ? setBannerMobileError : setBannerDesktopError;
    const ref = target === 'mobile' ? bannerMobileRef : bannerDesktopRef;
    setErr('');
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const key = target === 'mobile' ? 'bannersMobile' : 'bannersDesktop';
    const currentCount = (empresa as any)[key]?.length || 0;
    const remaining = 5 - currentCount;
    if (remaining <= 0) {
      setErr('Limite de 5 banners atingido. Remova um para adicionar outro.');
      if (ref.current) ref.current.value = '';
      return;
    }
    const fileArray = Array.from(files).slice(0, remaining);
    let loaded = 0;
    const newBanners: string[] = [];
    if (fileArray.length === 0) {
      if (ref.current) ref.current.value = '';
      return;
    }
    fileArray.forEach((file) => {
      if (file.size > 3 * 1024 * 1024) {
        setErr('Alguma imagem >3MB foi ignorada.');
        loaded++;
        if (loaded === fileArray.length && newBanners.length > 0) {
          setEmpresa((prev: any) => ({
            ...prev,
            [key]: [...(prev[key] || []), ...newBanners].slice(0, 5)
          }));
        }
        if (ref.current) ref.current.value = '';
        return;
      }
      if (!file.type.startsWith('image/')) {
        loaded++;
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        newBanners.push(result);
        loaded++;
        if (loaded === fileArray.length) {
          setEmpresa((prev: any) => ({
            ...prev,
            [key]: [...(prev[key] || []), ...newBanners].slice(0, 5)
          }));
          if (ref.current) ref.current.value = '';
        }
      };
      reader.onerror = () => {
        setErr('Erro ao ler imagem.');
        loaded++;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleBannerUploadMobile = (e: React.ChangeEvent<HTMLInputElement>) => handleBannerUploadGeneric(e, 'mobile');
  const handleBannerUploadDesktop = (e: React.ChangeEvent<HTMLInputElement>) => handleBannerUploadGeneric(e, 'desktop');

  const removerBannerMobile = (idx: number) => {
    setEmpresa((prev: any) => ({
      ...prev,
      bannersMobile: (prev.bannersMobile || []).filter((_: any, i: number) => i !== idx)
    }));
    setBannerIdx(0);
  };
  const removerBannerDesktop = (idx: number) => {
    setEmpresa((prev: any) => ({
      ...prev,
      bannersDesktop: (prev.bannersDesktop || []).filter((_: any, i: number) => i !== idx)
    }));
    setBannerIdx(0);
  };
  const removerBannerLegacy = (idx: number) => {
    setEmpresa((prev: any) => ({
      ...prev,
      banners: (prev.banners || []).filter((_: any, i: number) => i !== idx)
    }));
    setBannerIdx(0);
  };

  // Shop filters
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState<string>('Todos os produtos');
  const [promoFilter, setPromoFilter] = useState<'todos'|'promo'>('todos');
  const [orderBy, setOrderBy] = useState<'relev'|'menor'|'maior'|'nome'>('relev');
  const [selProd, setSelProd] = useState<Produto | null>(null);
  const [selProdImgIdx, setSelProdImgIdx] = useState(0);
  const [showVerMais, setShowVerMais] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const toggleFav = (id:string, e?:React.MouseEvent) => { e?.stopPropagation(); setFavs(prev=>{ const next = new Set(prev); if(next.has(id)) next.delete(id); else next.add(id); return next; }); };

  useEffect(()=>{ setSelProdImgIdx(0); }, [selProd?.id]);

  const filtered = useMemo(() => {
    let list = [...produtos].filter(p => p.estoque > 0);
    if (selCat !== 'Todos os produtos') list = list.filter(p => p.cat === selCat);
    if (promoFilter === 'promo') list = list.filter(p => p.promo);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(p => p.nome.toLowerCase().includes(s) || p.cat.toLowerCase().includes(s));
    }
    if (orderBy === 'menor') list.sort((a,b)=>a.venda-b.venda);
    if (orderBy === 'maior') list.sort((a,b)=>b.venda-a.venda);
    if (orderBy === 'nome') list.sort((a,b)=>a.nome.localeCompare(b.nome));
    return list;
  }, [produtos, selCat, promoFilter, search, orderBy]);

  const [searchFeedback, setSearchFeedback] = useState(false);
  const triggerSearchFeedback = () => {
    setSearchFeedback(true);
    setTimeout(()=>setSearchFeedback(false), 1200);
  };

  // Admin states
  const [adminTab, setAdminTab] = useLocal<string>('thita_admintab', 'Dashboard');
  const [newCat, setNewCat] = useState('');
  // fornecedor form
  const [fornForm, setFornForm] = useState<Fornecedor>({ id: '', nome: '', cnpj: '', endereco: '', contato: '' });
  // cliente form
  const [cliForm, setCliForm] = useState<Cliente>({ id: '', nome: '', doc: '', contato: '', endereco: '' });
  const [cliHist, setCliHist] = useState<Cliente | null>(null);
  const [cliHistIni, setCliHistIni] = useState('');
  const [cliHistFim, setCliHistFim] = useState('');
  const [cliVendaSel, setCliVendaSel] = useState<string | null>(null);

  // produto form
  const [prodForm, setProdForm] = useState<Produto>({
    id: '', nome: '', desc: '', cat: categorias[0] || 'Blusas', custo: 0, margem: 70, venda: 0, forn: fornecedores[0]?.id || 'f1', img: '', imagem: '', imagens: [], estoque: 0, novo: false, promo: false, tamanhos: ["M","G"]
  });
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [prodImgError, setProdImgError] = useState('');
  const prodFileRef = React.useRef<HTMLInputElement>(null);

  const handleProdImageFiles = (files: FileList | null) => {
    setProdImgError('');
    if (!files || files.length===0) return;
    const fileArray = Array.from(files).slice(0,8);
    for (const file of fileArray) {
      if (file.size > 2 * 1024 * 1024) {
        setProdImgError('Algum arquivo >2MB foi ignorado.');
        continue;
      }
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setProdForm(prev => {
          const existing = prev.imagens || [];
          const newImagens = [...existing, result];
          // primeira vira capa se não tiver
          const first = prev.img || result;
          return { ...prev, img: first, imagem: result.startsWith('data:') ? result : prev.imagem, imagens: newImagens };
        });
      };
      reader.onerror = () => setProdImgError('Erro ao ler imagem.');
      reader.readAsDataURL(file);
    }
  };
  const handleProdImageFile = (file: File | null) => {
    if(!file) return;
    const dt = { length:1, item:(_:number)=>file } as unknown as FileList;
    // workaround: create array-like
    handleProdImageFiles({0:file, length:1} as any);
  };

  // Helper para obter imagem com prioridade base64 (fotos autorais)
  const getProdImage = (p: Produto) => {
    if (p.imagens && p.imagens.length>0) return p.imagens[0];
    if (p.imagem && p.imagem.startsWith('data:')) return p.imagem;
    return (p.img || p.imagem || '');
  };
  const getProdImages = (p: Produto): string[] => {
    const list: string[] = [];
    if (p.imagens && p.imagens.length>0) {
      return p.imagens.filter(Boolean);
    }
    const single = getProdImage(p);
    if (single) list.push(single);
    if (p.imagem && p.imagem!==single) list.push(p.imagem);
    if (p.img && p.img!==single && p.img!==p.imagem) list.push(p.img);
    return list.filter(Boolean);
  };

  // WhatsApp helpers
  const cleanWhatsNumber = (raw: string) => {
    const digits = (raw||'').replace(/\D/g,'');
    if(!digits) return '5575999304778';
    if(digits.startsWith('55')) return digits;
    return '55'+digits;
  };
  const waNumber = useMemo(()=> cleanWhatsNumber(empresa?.contato||''), [empresa]);
  const waGenericMsg = encodeURIComponent('Olá! Vim pelo catálogo THITA e gostaria de saber mais sobre os produtos.');
  const waLinkGeneric = `https://wa.me/${waNumber}?text=${waGenericMsg}`;
  const getWaLinkForProduct = (nomeProd: string) => {
    const msg = encodeURIComponent(`Olá! Vim pelo catálogo THITA e gostaria de saber mais sobre: ${nomeProd}`);
    return `https://wa.me/${waNumber}?text=${msg}`;
  };

  // Entrada NF
  const [nf, setNf] = useState<{ fornId: string; numNota: string; data: string; frete: number; itens: { prodId: string; qtd: number; custo: number }[] }>({ fornId: fornecedores[0]?.id || '', numNota: '', data: new Date().toISOString().slice(0,10), frete: 0, itens: [] });
  const [nfItem, setNfItem] = useState({ prodId: produtos[0]?.id || '', qtd: 1, custo: 0 });

  // Saida Venda
  const [vendaClienteId, setVendaClienteId] = useState('');
  const [carrinho, setCarrinho] = useState<{ prodId: string; qtd: number }[]>([]);
  const [cartProd, setCartProd] = useState({ prodId: '', qtd: 1 });
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [finalForm, setFinalForm] = useState({ desconto: 0, forma: 'À vista', parcelas: 1, venc: new Date().toISOString().slice(0,10), embalagem: false, embalagemValor: 3.5, entrega: false, entregaValor: 10 });

  // Relatorios
  const [repIni, setRepIni] = useState('');
  const [repFim, setRepFim] = useState('');
  const [repForn, setRepForn] = useState('todos');
  const [repCli, setRepCli] = useState('todos');
  const [repEntradaSel, setRepEntradaSel] = useState<Entrada | null>(null);
  const [repVendaSel, setRepVendaSel] = useState<Venda | null>(null);
  // Novos estados para exportação formatada (sem window.print)
  const [showSinteticoModal, setShowSinteticoModal] = useState(false);
  const [analiticoExport, setAnaliticoExport] = useState<{tipo:'entrada'|'saida', data: Entrada|Venda} | null>(null);

  // Configuração form
  const [configForm, setConfigForm] = useState({ atualUser: '', atualPass: '', novoUser: '', novaPass: '', confirmarPass: '' });
  const [configMsg, setConfigMsg] = useState<{type:'ok'|'err', text:string}|null>(null);

  // Backup e Segurança
  const [lastBackup, setLastBackup] = useLocal<string>('thita_last_backup', '');
  const restoreInputRef = React.useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState<{type:'ok'|'err', text:string}|null>(null);

  const formatBackupDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return `${d.toLocaleDateString('pt-BR')}, ${d.toLocaleTimeString('pt-BR')}`;
    } catch { return iso; }
  };
  const nowFormatted = useMemo(()=>{
    const d = new Date();
    return `${d.toLocaleDateString('pt-BR')}, ${d.toLocaleTimeString('pt-BR')}`;
  }, []);
  const lastBackupDisplay = lastBackup ? formatBackupDate(lastBackup) : nowFormatted;

  const downloadFile = (content: string, fileName: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  };

  const handleDownloadBackup = () => {
    const payload = {
      produtos,
      fornecedores,
      clientes,
      entradas,
      vendas,
      crediario,
      categorias,
      userConfig,
      empresa,
      lastBackup,
      exportedAt: new Date().toISOString(),
      version: 2,
    };
    const json = JSON.stringify(payload, null, 2);
    const datePart = new Date().toISOString().slice(0,10);
    downloadFile(json, `thita_backup_${datePart}.json`, 'application/json');
    const nowIso = new Date().toISOString();
    setLastBackup(nowIso);
    setBackupMsg({type:'ok', text:`Backup baixado em ${formatBackupDate(nowIso)}`});
    setTimeout(()=>setBackupMsg(null), 4000);
  };

  const handleRestoreBackupFile = (file: File | null) => {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if(!parsed || typeof parsed !== 'object'){
          setBackupMsg({type:'err', text:'Arquivo inválido'});
          return;
        }
        const hasData = parsed.produtos || parsed.clientes || parsed.vendas;
        if(!hasData){
          setBackupMsg({type:'err', text:'Backup não contém dados reconhecíveis'});
          return;
        }
        const confirmRestore = window.confirm('Tem certeza que deseja restaurar este backup? Todos os dados atuais serão substituídos.');
        if(!confirmRestore) return;
        // Restore to localStorage directly for reliability
        if(parsed.produtos) localStorage.setItem('thita_produtos', JSON.stringify(parsed.produtos));
        if(parsed.fornecedores) localStorage.setItem('thita_fornecedores', JSON.stringify(parsed.fornecedores));
        if(parsed.clientes) localStorage.setItem('thita_clientes', JSON.stringify(parsed.clientes));
        if(parsed.entradas) localStorage.setItem('thita_entradas', JSON.stringify(parsed.entradas));
        if(parsed.vendas) localStorage.setItem('thita_vendas', JSON.stringify(parsed.vendas));
        if(parsed.crediario) localStorage.setItem('thita_crediario', JSON.stringify(parsed.crediario));
        if(parsed.categorias) localStorage.setItem('thita_categorias', JSON.stringify(parsed.categorias));
        if(parsed.userConfig) localStorage.setItem('thita_user', JSON.stringify(parsed.userConfig));
        if(parsed.empresa) localStorage.setItem('thita_empresa', JSON.stringify(parsed.empresa));
        const nowIso = new Date().toISOString();
        localStorage.setItem('thita_last_backup', JSON.stringify(nowIso));
        alert('Backup restaurado com sucesso! A página será recarregada.');
        window.location.reload();
      } catch(e){
        setBackupMsg({type:'err', text:'Erro ao ler backup: '+(e as Error).message});
      }
    };
    reader.readAsText(file);
    if(restoreInputRef.current) restoreInputRef.current.value = '';
  };

  const csvEscape = (val: any) => {
    const s = String(val ?? '');
    if(s.includes('"') || s.includes(',') || s.includes('\n') || s.includes(';')){
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const handleDownloadClientesCSV = () => {
    const headers = ['nome','doc','telefone','endereco'];
    const rows = clientes.map(c=>[c.nome, c.doc, c.contato, c.endereco||'']);
    const csv = [headers.join(','), ...rows.map(r=>r.map(csvEscape).join(','))].join('\n');
    const datePart = new Date().toISOString().slice(0,10);
    downloadFile(csv, `thita_clientes_${datePart}.csv`, 'text/csv;charset=utf-8;');
    setBackupMsg({type:'ok', text:`Planilha de clientes baixada (${clientes.length} registros)`});
    setTimeout(()=>setBackupMsg(null), 4000);
  };

  const handleDownloadFinanceiroCSV = () => {
    const vendaHeaders = ['tipo','data','cliente','valor','forma','parcelas','status','vencimento'];
    const vendaRows = vendas.map(v=>{
      const cli = clientes.find(c=>c.id===v.clienteId);
      const st = (()=>{ 
        if(v.forma !== 'Crediário') return 'Quitado';
        const parts = crediario.filter(c=>c.vendaId===v.id);
        if(parts.length===0) return 'Aberto';
        return parts.every(p=>p.status==='pago') ? 'Quitado' : 'Aberto';
      })();
      return ['venda', v.data, cli?.nome||v.clienteId, v.totalFinal.toFixed(2), v.forma, String(v.parcelas), st, v.venc];
    });
    const entradaHeaders = ['tipo','data','nota','fornecedor','valor'];
    const entradaRows = entradas.map(e=>{
      const forn = fornecedores.find(f=>f.id===e.fornId);
      return ['entrada', e.data, e.numNota||e.id, forn?.nome||e.fornId, e.total.toFixed(2)];
    });
    const lines: string[] = [];
    lines.push(vendaHeaders.join(','));
    vendaRows.forEach(r=>lines.push(r.map(csvEscape).join(',')));
    lines.push('');
    lines.push(entradaHeaders.join(','));
    entradaRows.forEach(r=>lines.push(r.map(csvEscape).join(',')));
    const csv = lines.join('\n');
    const datePart = new Date().toISOString().slice(0,10);
    downloadFile(csv, `thita_financeiro_${datePart}.csv`, 'text/csv;charset=utf-8;');
    setBackupMsg({type:'ok', text:`Planilha financeira baixada (${vendas.length} vendas + ${entradas.length} entradas)`});
    setTimeout(()=>setBackupMsg(null), 4000);
  };

  // Helpers
  const handleLogin = () => {
    const stored = userConfig || { usuario: 'admin', senha: 'thita2024' };
    if (loginForm.user === stored.usuario && loginForm.pass === stored.senha) {
      setIsAuth(true);
      setView('admin');
      setShowLogin(false);
      setLoginErr('');
    } else setLoginErr('Usuário ou senha inválidos');
  };

  // helpers de calculo
  const calcVenda = (c:number,m:number)=> Number((c*(1+m/100)).toFixed(2));
  const calcMargem = (c:number,v:number)=> c>0? Number((((v/c)-1)*100).toFixed(1)):0;


  // Produto save
  const saveProduto = async () => {
    if (!prodForm.nome.trim() || !prodForm.cat) return;
    const allImgs = getProdImages(prodForm as Produto);
    const finalImage = allImgs[0] || prodForm.img || '';
    const toSave: Produto = { 
      ...prodForm, 
      id: editingProdId || `p${Date.now()}`,
      img: finalImage,
      imagem: finalImage.startsWith('data:') ? finalImage : prodForm.imagem || (finalImage ? finalImage : ''),
      imagens: allImgs.length>0 ? allImgs : (finalImage ? [finalImage] : [])
    };

    // Salva no Supabase
    const payload = {
      id: toSave.id,
      nome: toSave.nome,
      descricao: toSave.desc,
      categoria: toSave.cat,
      custo: toSave.custo,
      margem: toSave.margem,
      preco: toSave.venda,
      fornecedor: toSave.forn,
      foto: toSave.img,
      imagens: toSave.imagens,
      estoque: toSave.estoque,
      novo: toSave.novo,
      promo: toSave.promo,
      tamanhos: toSave.tamanhos,
    };
    const { error } = await supabase.from('produtos').upsert(payload);
    if (error) {
      console.error(error);
      alert('Erro ao salvar no Supabase: ' + error.message);
      return;
    }

    if (editingProdId) setProdutos(prev => prev.map(p=>p.id===editingProdId?toSave:p));
    else setProdutos(prev => [...prev, toSave]);
    setProdForm({ id: '', nome: '', desc: '', cat: categorias[0], custo: 0, margem: 70, venda: 0, forn: fornecedores[0]?.id || '', img: '', imagem: '', imagens: [], estoque: 0, novo: false, promo: false, tamanhos: ["M","G"] });
    setEditingProdId(null);
    setProdImgError('');
    if (prodFileRef.current) prodFileRef.current.value = '';
  };

  const carrinhoTotal = useMemo(() => {
    return carrinho.reduce((acc, it) => {
      const p = produtos.find(pp=>pp.id===it.prodId);
      return acc + (p ? p.venda * it.qtd : 0);
    }, 0);
  }, [carrinho, produtos]);

  const filteredCliVendas = useMemo(() => {
    if (!cliHist) return [];
    let list = vendas.filter(v=>v.clienteId===cliHist.id);
    if (cliHistIni) list = list.filter(v=>v.data >= cliHistIni);
    if (cliHistFim) list = list.filter(v=>v.data <= cliHistFim);
    return list;
  }, [cliHist, vendas, cliHistIni, cliHistFim]);

  const getStatusVenda = (v: Venda): 'Quitado'|'Aberto' => {
    if (v.forma !== 'Crediário') return 'Quitado';
    const parcelas = crediario.filter(c=>c.vendaId===v.id);
    if (parcelas.length===0) return 'Aberto';
    const todasPagas = parcelas.every(p=>p.status==='pago');
    return todasPagas ? 'Quitado' : 'Aberto';
  };

  const selectedVenda = useMemo(()=> {
    if(!cliVendaSel) return null;
    return vendas.find(v=>v.id===cliVendaSel) || null;
  }, [cliVendaSel, vendas]);

  const crediarioDaVendaSel = useMemo(()=> {
    if(!selectedVenda) return [];
    return crediario.filter(c=>c.vendaId===selectedVenda.id).sort((a,b)=>a.num-b.num);
  }, [selectedVenda, crediario]);

  // relatório filtros
  const entradasFiltradas = useMemo(()=>{
    let list = [...entradas];
    if(repIni) list = list.filter(e=>e.data >= repIni);
    if(repFim) list = list.filter(e=>e.data <= repFim);
    if(repForn!=='todos') list = list.filter(e=>e.fornId===repForn);
    return list;
  }, [entradas, repIni, repFim, repForn]);

  const vendasFiltradas = useMemo(()=>{
    let list = [...vendas];
    if(repIni) list = list.filter(v=>v.data >= repIni);
    if(repFim) list = list.filter(v=>v.data <= repFim);
    if(repCli!=='todos') list = list.filter(v=>v.clienteId===repCli);
    return list;
  }, [vendas, repIni, repFim, repCli]);

  const formaSemParcelas = useMemo(()=>['À vista','Pix','Cartão de Débito'].includes(finalForm.forma), [finalForm.forma]);
  
  const cancelarVenda = (vendaId: string) => {
    const venda = vendas.find(v=>v.id===vendaId);
    if(!venda) return;
    if(!window.confirm(`Cancelar venda de ${venda.data}? Os produtos voltarão ao estoque e o crediário será apagado.`)) return;
    setProdutos(prev=>prev.map(p=>{
      const it = venda.itens.find(i=>i.prodId===p.id);
      return it? {...p, estoque: p.estoque + it.qtd} : p;
    }));
    setCrediario(prev=>prev.filter(cr=>cr.vendaId!==vendaId));
    setVendas(prev=>prev.filter(v=>v.id!==vendaId));
    setRepVendaSel(null);
    setCliVendaSel(null);
  };

  const cancelarEntrada = (entradaId: string) => {
    const entrada = entradas.find(e=>e.id===entradaId);
    if(!entrada) return;
    if(!window.confirm(`Cancelar entrada ${entrada.numNota || entrada.id}? Os produtos sairão do estoque.`)) return;
    setProdutos(prev=>prev.map(p=>{
      const it = entrada.itens.find(i=>i.prodId===p.id);
      return it? {...p, estoque: Math.max(0, p.estoque - it.qtd)} : p;
    }));
    setEntradas(prev=>prev.filter(e=>e.id!==entradaId));
    setRepEntradaSel(null);
  };
  useEffect(()=>{
    if(formaSemParcelas && finalForm.parcelas !== 1){
      setFinalForm(f=>({...f, parcelas:1}));
    }
  }, [formaSemParcelas]);

  useEffect(()=>{
    // reset venda selecionada ao trocar cliente histórico
    setCliVendaSel(null);
  }, [cliHist?.id]);

  // If shop view
  if (view === 'shop' || !isAuth) {
    return (
      <div className="min-h-screen bg-[#FFFBF0] font-sans antialiased selection:bg-[#FF9EBB] selection:text-white relative">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600;700&display=swap'); .font-serif{font-family:'Playfair Display',serif} .font-sans{font-family:'Inter',sans-serif}
        .scrollbar-none::-webkit-scrollbar{display:none}
        .scrollbar-none{-ms-overflow-style:none; scrollbar-width:none}
        @media (max-width: 1023px){ .sidebar-categorias{display:none !important} }
        .banner-carousel{width:calc(100% - 32px);margin:0 16px;height:420px;max-height:420px !important;border-radius:16px;overflow:hidden;position:relative;background:#fdf0e6;box-shadow:0 4px 20px rgba(200,0,130,0.12);border:1px solid rgba(255,255,255,0.6);display:flex;align-items:center;justify-content:center}
        .banner-carousel .banner-slides{width:100%;height:100%;position:relative;display:flex;align-items:center;justify-content:center;background:#fce8d5}
        .banner-slide{display:flex;align-items:center;justify-content:center;height:100%;width:100%;background:#fce8d5;position:absolute;inset:0;transition:opacity 700ms}
        .banner-slide .custom-banner-img{width:562px;height:300px;object-fit:cover;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);display:block;margin:auto;max-width:90%;max-height:90%;object-position:center}
        .banner-slide .custom-banner-img.desktop{width:100%;height:100%;max-width:100%;max-height:100%;border-radius:0;box-shadow:none;object-position:center}
        .banner-default-inner{width:100%;height:100%;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#FFD1E3 0%, #FFC2D9 55%, #FF9EBB 100%);position:relative;overflow:hidden}
        .banner-model-wrap{display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:12px}
        @media (max-width:768px){
          .banner-carousel{width:calc(100% - 16px);margin:0 8px;height:280px;max-height:280px !important;border-radius:16px}
          .banner-slide .custom-banner-img{width:90%;height:auto;aspect-ratio:562/300;max-width:90%;max-height:80%}
          .banner-slide .custom-banner-img.desktop{width:100%;height:100%;aspect-ratio:auto}
          .banner-default-inner{flex-direction:column;justify-content:center;gap:8px;padding:12px}
          .banner-model-wrap{padding:0}
        }
        `}</style>
        {/* Background pattern sutil */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-pixels.png")`, backgroundRepeat: 'repeat', backgroundSize: '420px auto', opacity: 0.18 }} />

        <div className="relative z-10">
       {/* Header */}
        <header className="w-full bg-[#FF9EBB] px-3 lg:px-8 h-[90px] lg:h-[120px] flex items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center">
            {/* Logo 2.5cm x 2.5cm = 95px x 95px, quadrado arredondado, sem dizeres menores */}
          <div className="w-auto h-[80px] lg:h-[110px] min-w-[160px] lg:min-w-[220px] flex items-center justify-start">
            <img src="/logo-thita.png" alt="THITA STORE" className="h-[72px] lg:h-[100px] w-auto object-contain" />
              </div>
          </div>

          <div className="flex-1 max-w-[560px] hidden md:flex">
            <div className="relative w-full">
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="O que você procura?" className="w-full h-[44px] rounded-full pl-6 pr-[56px] text-[14px] outline-none bg-white placeholder:text-zinc-400 shadow-sm border border-white/60" />
              <button onClick={triggerSearchFeedback} className="absolute right-1 top-1 h-[36px] w-[44px] rounded-full bg-[#C80082] flex items-center justify-center text-white hover:bg-[#B0006E] transition">
                <Search size={18} />
              </button>
              {searchFeedback && <span className="absolute -bottom-5 left-2 text-[10px] text-[#B0006E] font-semibold bg-white/90 px-2 py-0.5 rounded-full">buscando...</span>}
            </div>
          </div>

          <div className="flex items-center gap-3 text-white">
            <button onClick={()=>setShowLogin(true)} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition rounded-full px-4 h-9 text-[13px] font-semibold backdrop-blur">
              <span className="hidden sm:inline">Entrar</span><span className="sm:hidden">Entrar</span>
              <div className="w-6 h-6 rounded-full bg-white text-[#FF9EBB] flex items-center justify-center"><Users size={14}/></div>
            </button>
          </div>
        </header>

        {/* Mobile search */}
        <div className="md:hidden px-4 pb-3 pt-1 bg-[#FF9EBB]">
          <div className="relative w-full">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="O que você procura?" className="w-full h-[42px] rounded-full pl-6 pr-[56px] text-[14px] outline-none bg-white placeholder:text-zinc-400 shadow-sm" />
            <button onClick={triggerSearchFeedback} className="absolute right-1 top-1 h-[34px] w-[44px] rounded-full bg-[#C80082] flex items-center justify-center text-white hover:bg-[#B0006E] transition"><Search size={18}/></button>
            {searchFeedback && <span className="absolute -bottom-5 left-2 text-[10px] text-white font-semibold bg-black/20 px-2 py-0.5 rounded-full">buscando...</span>}
          </div>
        </div>

        {/* BANNER TOPO - carrossel dinâmico com banners separados desktop/mobile */}
        <div className="w-full max-w-[1440px] mx-auto pt-4">
          {bannersAtivos.length > 0 ? (
            <div className="banner-carousel group">
              {/* slides */}
              <div className="banner-slides">
                {bannersAtivos.map((b, i) => (
                  <div
                    key={i}
                    className={`banner-slide ${i===bannerIdx?'opacity-100':'opacity-0 pointer-events-none'}`}
                  >
                    <img
                      src={b}
                      alt={`Banner ${i+1}`}
                      className={`custom-banner-img ${!isMobileView ? 'desktop' : ''}`}
                      style={isMobileView ? { width:'562px', height:'300px', objectFit:'cover' } : { width:'100%', height:'100%', objectFit:'cover' }}
                    />
                  </div>
                ))}
              </div>
              {/* setas */}
              {bannersAtivos.length>1 && (
                <>
                  <button onClick={()=>setBannerIdx((p)=>(p-1+bannersAtivos.length)%bannersAtivos.length)} className="absolute left-2 lg:left-3 top-1/2 -translate-y-1/2 w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-white/90 backdrop-blur border border-white text-zinc-800 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition hover:bg-white">
                    <ChevronLeft size={18}/>
                  </button>
                  <button onClick={()=>setBannerIdx((p)=>(p+1)%bannersAtivos.length)} className="absolute right-2 lg:right-3 top-1/2 -translate-y-1/2 w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-white/90 backdrop-blur border border-white text-zinc-800 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition hover:bg-white">
                    <ChevronRight size={18}/>
                  </button>
                </>
              )}
             {/* dots */}
             {bannersAtivos.length>1 && (
               <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/25 backdrop-blur-sm px-3 py-1.5 rounded-full">
                 {bannersAtivos.map((_, i)=>(
                   <button key={i} onClick={()=>setBannerIdx(i)} className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full transition-all ${i===bannerIdx?'bg-white w-4 lg:w-5':'bg-white/60 hover:bg-white/90'}`} aria-label={`Ir para slide ${i+1}`} />
                 ))}
               </div>
             )}
            </div>
          ) : (
            <div className="banner-carousel group" style={{borderRadius:'16px', background:'#fdf0e6'}}>
              <div className="banner-default-inner">
                {/* decor pattern dots */}
                <div className="absolute inset-0 opacity-30 pointer-events-none" style={{backgroundImage:`radial-gradient(rgba(255,255,255,0.6) 1.5px, transparent 1.5px)`, backgroundSize:'18px 18px'}} />
                {/* left content */}
                <div className="relative z-10 flex-1 p-[18px] lg:p-7 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-1.5 bg-white/85 backdrop-blur px-2.5 py-1 rounded-full w-fit">
                    <span className="w-4 h-4 rounded-full bg-[#C0006B] flex items-center justify-center text-white text-[10px] font-bold">T</span>
                    <span className="text-[10px] font-bold tracking-[0.08em] text-[#C0006B]">THITA STORE</span>
                  </div>
                  <h2 className="mt-3 text-[17px] lg:text-[22px] leading-[1.15] font-bold text-[#6A0A3A] max-w-[210px] lg:max-w-[320px]">
                    Conforto que abraça, <span className="text-[#C0006B]">estilo que fica.</span>
                  </h2>
                  <div className="mt-3.5 flex flex-wrap gap-1.5 lg:gap-2">
                    <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur px-2.5 h-[26px] rounded-full text-[11px] font-medium text-[#6A0A3A] border border-white shadow-sm">
                      <Smile size={12} className="text-[#C0006B]"/> Conforto
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur px-2.5 h-[26px] rounded-full text-[11px] font-medium text-[#6A0A3A] border border-white shadow-sm">
                      <Sparkles size={12} className="text-[#C0006B]"/> Estilo
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur px-2.5 h-[26px] rounded-full text-[11px] font-medium text-[#6A0A3A] border border-white shadow-sm">
                      <Shirt size={12} className="text-[#C0006B]"/> Peças feitas p/ durar
                    </span>
                  </div>
                </div>
                {/* right image - 562x300 centralizada dentro do espaço 420px */}
                <div className="banner-model-wrap">
                  <img
                    src="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=562&h=300&fit=crop&crop=top"
                    alt="Modelo THITA pijama"
                    className="custom-banner-img"
                    style={{width:'562px', height:'300px', objectFit:'cover', objectPosition:'center top'}}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CHIPS MOBILE - categoria horizontal */}
        <div className="lg:hidden max-w-[1440px] mx-auto w-full">
          <div className="px-4 pt-4 overflow-hidden">
            <div className="chips-mobile flex gap-2 overflow-x-auto scrollbar-none pb-2" style={{WebkitOverflowScrolling:'touch'}}>
              {(() => {
                const baseOrdered = SIDEBAR_ORDER.filter(c => categorias.includes(c));
                const extras = categorias.filter(c => !SIDEBAR_ORDER.includes(c));
                const fullList: string[] = ["Todos os produtos", ...baseOrdered, ...extras];
                return fullList.map(cat => {
                  const isActive = selCat === cat;
                  const label = cat === "Todos os produtos" ? "Todos" : cat.replace('Conjuntos feminino','Conj. Feminino').replace('Conjuntos masculino','Conj. Masc.').replace('Infantil feminino','Infantil Fem.').replace('Infantil masculino','Infantil Masc.').replace('Pijama Americano','Pijama');
                  return (
                    <button
                      key={cat}
                      onClick={()=>setSelCat(cat)}
                      className={`shrink-0 h-[36px] px-4 rounded-full border text-[13px] font-medium transition-all whitespace-nowrap
                        ${isActive ? 'bg-[#C0006B] text-white border-[#C0006B] shadow-[0_2px_8px_rgba(192,0,107,0.25)]' : 'bg-white text-[#5A5A5A] border-[#E8E0DB] hover:border-[#D0C6C0]'}
                      `}
                    >
                      {label}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row max-w-[1440px] mx-auto">
         {/* Sidebar - DESKTOP ONLY */}
          <aside className="sidebar-categorias hidden lg:block lg:w-[220px] shrink-0 px-4 lg:px-6 py-6 lg:border-r border-zinc-100">
            {/* CATEGORIAS no topo - logo grande removida */}
            <h3 className="text-[#C80082] font-bold text-[14px] uppercase tracking-wide mb-4">Categorias</h3>
            <div className="space-y-2.5">
              {(() => {
                // Monta lista completa respeitando ordem solicitada + extras
                const baseOrdered = SIDEBAR_ORDER.filter(c => categorias.includes(c));
                const extras = categorias.filter(c => !SIDEBAR_ORDER.includes(c));
                const fullList: string[] = ["Todos os produtos", ...baseOrdered, ...extras];
                const visibleList = showVerMais ? fullList : fullList.slice(0, 10);
                const hasMore = fullList.length > 10;
                return (
                  <>
                    {visibleList.map(cat => {
                      const label = cat === "Todos os produtos" ? "PRODUTOS" : cat.toUpperCase();
                      return (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" checked={selCat===cat} onChange={()=>setSelCat(cat)} className="w-4 h-4 rounded border-zinc-300 accent-[#C80082]" />
                          <span className={`text-[13px] uppercase ${selCat===cat?'text-zinc-900 font-semibold':'text-zinc-600 group-hover:text-zinc-900'}`}>{label}</span>
                        </label>
                      );
                    })}
                    {hasMore && (
                      <div className="pt-2">
                        <button onClick={()=>setShowVerMais(v=>!v)} className="flex items-center gap-1 text-[12px] font-bold tracking-wide uppercase text-[#B0006E]/80 hover:text-[#B0006E]">
                          {showVerMais ? "VER MENOS ▴" : "VER MAIS ▾"} <ChevronDown size={14} className={`transition ${showVerMais?'rotate-180':''}`} />
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="mt-8">
              <h3 className="text-[#C80082] font-bold text-[14px] uppercase tracking-wide mb-4">Promoções</h3>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="promo" checked={promoFilter==='todos'} onChange={()=>setPromoFilter('todos')} className="accent-[#C80082]" />
                  <span className="text-[13px] text-zinc-600">Todos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="promo" checked={promoFilter==='promo'} onChange={()=>setPromoFilter('promo')} className="accent-[#C80082]" />
                  <span className="text-[13px] text-zinc-600">Somente promoção</span>
                </label>
              </div>
            </div>
            {/* Contatos - abaixo de Somente promoção conforme image_91767e.png */}
            <div className="mt-8 pt-6 border-t border-[#E8DDD5]/80">
              <div className="space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-[20px] h-[20px] rounded-[5px] border border-[#E0D2C6] flex items-center justify-center text-[#A67C6B] bg-transparent shrink-0">
                    <Instagram size={12} strokeWidth={1.8} />
                  </span>
                  <span className="text-[13px] text-[#A67C6B] font-normal tracking-[0.01em]">@store_thita</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-[20px] h-[20px] rounded-[5px] border border-[#E0D2C6] flex items-center justify-center text-[#A67C6B] bg-transparent shrink-0">
                    <MessageCircle size={12} strokeWidth={1.8} />
                  </span>
                  <span className="text-[13px] text-[#A67C6B] font-normal tracking-[0.01em]">(75) 99930-4778</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-[20px] h-[20px] rounded-[5px] border border-[#E0D2C6] flex items-center justify-center text-[#A67C6B] bg-transparent shrink-0">
                    <MapPin size={12} strokeWidth={1.8} />
                  </span>
                  <span className="text-[13px] text-[#A67C6B] font-normal tracking-[0.01em]">Alagoinhas, BA</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 px-4 lg:px-8 py-4 lg:py-6">
            {/* MOBILE TITLE - like print thitastore */}
            <div className="lg:hidden flex items-center justify-between gap-3 mb-4">
              <div className="flex flex-col">
                <h1 className="text-[#C0006B] font-bold text-[18px] leading-[1.1]">{selCat === 'Todos os produtos' ? 'Todos os produtos' : selCat}</h1>
                <span className="text-[12px] text-[#8A8A8A] mt-0.5">{filtered.length} produtos encontrados</span>
              </div>
              <button
                onClick={()=>{ const next = orderBy==='relev' ? 'menor' : orderBy==='menor' ? 'maior' : orderBy==='maior' ? 'nome' : 'relev'; setOrderBy(next as any); }}
                className="w-9 h-9 rounded-full bg-white border border-[#E8E0DB] flex items-center justify-center text-[#6A0A3A] shadow-sm"
                title="Ordenar"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>

            {/* DESKTOP TITLE */}
            <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h1 className="text-[#B0006E] font-bold text-[22px]">{selCat}</h1>
              <div className="flex items-center gap-4 text-[13px] text-zinc-500">
                <span>Resultado {filtered.length} produtos</span>
                <select value={orderBy} onChange={e=>setOrderBy(e.target.value as any)} className="border border-zinc-200 rounded-full px-3 py-1.5 text-[12px] bg-white outline-none">
                  <option value="relev">Ordenar por</option>
                  <option value="menor">Menor preço</option>
                  <option value="maior">Maior preço</option>
                  <option value="nome">Nome A-Z</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 min-w-0">
              {filtered.map(p=>(
                <div key={p.id} onClick={()=>setSelProd(p)} className="group bg-white rounded-[16px] lg:rounded-[12px] border border-[#F0E6E0] lg:border-zinc-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all">
                  <div className="relative aspect-square lg:aspect-[3/4] bg-[#FFF6F8] overflow-hidden rounded-t-[16px] lg:rounded-t-[12px]">
                    <img src={getProdImage(p)} alt={p.nome} className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500" />
                    {/* fav heart like reference */}
                    <button onClick={(e)=>toggleFav(p.id, e)} className={`absolute right-2.5 top-2.5 w-7 h-7 rounded-full backdrop-blur border flex items-center justify-center shadow-sm transition ${favs.has(p.id) ? 'bg-[#C0006B] border-[#C0006B] text-white' : 'bg-white/90 border-white text-zinc-400 hover:text-[#C0006B]'}`}>
                      <Heart size={14} className={favs.has(p.id) ? 'fill-white text-white' : 'text-zinc-500'} />
                    </button>
                    {p.novo && <span className="absolute left-2 bottom-2 bg-[#D32F2F] text-white text-[9px] lg:text-[10px] font-bold px-2 py-0.5 rounded-full">NOVO</span>}
                    {p.promo && <span className="absolute left-2 top-2 bg-[#C0006B] text-white text-[9px] lg:text-[10px] font-bold px-2 py-0.5 rounded-full">PROMO</span>}
                  </div>
                 <div className="p-2.5 lg:p-3">
                   <p className="text-[12px] lg:text-[13px] leading-[1.3] text-[#3A3A3A] line-clamp-2 min-h-[32px] lg:min-h-[34px] font-medium">{p.nome}</p>
                   <div className="flex flex-wrap gap-1 mt-2 lg:mt-2">
                      {ordenarTamanhos(p.tamanhos).map(sz=>(
                        <span key={sz} className="w-6 h-6 lg:w-7 lg:h-7 rounded-full border border-[#2B2B2B] text-[#2B2B2B] text-[9px] lg:text-[10px] flex items-center justify-center font-medium bg-white">
                          {sz}
                        </span>
                      ))}
                   </div>
                   <div className="mt-2.5 lg:mt-3">
                     <p className="text-[14px] lg:text-[15px] font-bold text-[#C0006B]">R$ {p.venda.toFixed(2).replace('.',',')}</p>
                   </div>
                 </div>
                </div>
              ))}
            </div>
            {filtered.length===0 && <div className="py-24 text-center text-zinc-400 text-sm">Nenhum produto encontrado.</div>}
            {/* mobile footer contacts subtle - only mobile after grid */}
            <div className="lg:hidden mt-8 pt-6 border-t border-[#F0E6E0] flex items-center justify-center gap-6 text-[11px] text-[#A67C6B]">
              <span className="flex items-center gap-1.5"><Instagram size={12}/> @store_thita</span>
              <span className="flex items-center gap-1.5"><MapPin size={12}/> Alagoinhas, BA</span>
            </div>
          </main>
        </div>

        {/* WhatsApp */}
        <a href={selProd ? getWaLinkForProduct(selProd.nome) : waLinkGeneric} target="_blank" rel="noopener" className="fixed bottom-5 right-5 w-[56px] h-[56px] rounded-full bg-[#9C0030] shadow-[0_8px_24px_rgba(0,0,0,0.25)] flex items-center justify-center text-white z-20 hover:scale-105 transition" title={selProd ? `Perguntar sobre ${selProd.nome}` : 'Falar no WhatsApp'}>
          <MessageCircle size={28} fill="white" />
        </a>

        {/* Product Modal */}
        {selProd && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={()=>setSelProd(null)}>
            {(() => {
              const allImages = getProdImages(selProd);
              const total = allImages.length;
              const currentIdx = Math.min(selProdImgIdx, Math.max(0, total-1));
              const currentImg = allImages[currentIdx] || getProdImage(selProd);
              const prevImg = () => setSelProdImgIdx(i => (i-1+total)%total);
              const nextImg = () => setSelProdImgIdx(i => (i+1)%total);
              return (
                <div className="bg-white rounded-[16px] max-w-[960px] w-full overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]" onClick={e=>e.stopPropagation()}>
                  <div className="md:w-[52%] bg-zinc-50 relative flex flex-col">
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-100">
                      <img src={currentImg} alt={selProd.nome} className="w-full h-full object-cover" />
                      {selProd.novo && <span className="absolute left-3 bottom-3 bg-[#D32F2F] text-white text-[11px] font-bold px-2.5 py-1 rounded">NOVO</span>}
                      {total>1 && (
                        <>
                          <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-zinc-200 flex items-center justify-center text-zinc-800 hover:bg-white shadow-sm"><ChevronLeft size={18}/></button>
                          <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-zinc-200 flex items-center justify-center text-zinc-800 hover:bg-white shadow-sm"><ChevronRight size={18}/></button>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/35 backdrop-blur-sm px-3 py-1.5 rounded-full">
                            {allImages.map((_, idx)=> (
                              <span key={idx} className={`w-1.5 h-1.5 rounded-full transition ${idx===currentIdx?'bg-white w-4':'bg-white/50'}`}></span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    {total>1 && (
                      <div className="p-3 bg-white border-t border-zinc-100">
                        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                          {allImages.map((imgSrc, idx)=> (
                            <button key={idx} onClick={()=>setSelProdImgIdx(idx)} className={`relative aspect-square rounded-[10px] overflow-hidden border-2 transition ${idx===currentIdx?'border-[#C80082] ring-1 ring-[#C80082]/30':'border-zinc-200 hover:border-zinc-300'}`}>
                              <img src={imgSrc} alt={`foto ${idx+1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                 <div className="md:w-[48%] p-6 flex flex-col overflow-y-auto">
                   <div className="flex justify-between items-start gap-4">
                     <h2 className="text-[20px] font-bold text-zinc-900 leading-tight">{selProd.nome}</h2>
                     <button onClick={()=>setSelProd(null)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0"><X size={16}/></button>
                   </div>
                    <p className="text-[14px] text-zinc-600 mt-4 leading-relaxed">{selProd.desc}</p>
                    <div className="flex gap-1.5 mt-4 flex-wrap">
                      {ordenarTamanhos(selProd.tamanhos).map(sz=>(
                        <span key={sz} className="w-8 h-8 rounded-full border border-zinc-900 text-zinc-900 text-[11px] flex items-center justify-center font-semibold bg-white">
                          {sz}
                        </span>
                      ))}
                    </div>
                    <div className="mt-6 space-y-1">
                      <p className="text-[13px] text-zinc-500">Estoque: {selProd.estoque} un.</p>
                      <p className="text-[22px] font-bold text-zinc-900">R$ {selProd.venda.toFixed(2).replace('.',',')}</p>
                    </div>
                    <div className="mt-4">
                      <a href={getWaLinkForProduct(selProd.nome)} target="_blank" rel="noopener" className="w-full h-11 rounded-[12px] bg-[#25D366] text-white font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-[#1ebe5d] transition">
                        <MessageCircle size={16}/> Chamar no WhatsApp
                      </a>
                      <p className="text-[11px] text-zinc-400 mt-2 text-center">Atendimento via {empresa.nome} • {waNumber.replace('55','')}</p>
                    </div>
                    <div className="mt-auto pt-6">
                      <div className="bg-[#FFF0F6] border border-[#FF9EBB]/30 rounded-[12px] p-3 text-[12px] text-[#B0006E]">
                        💬 Atendimento exclusivo via WhatsApp. Clique no botão acima para tirar dúvidas sobre este produto.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Login Modal */}
        {showLogin && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowLogin(false)}>
            <div className="bg-white rounded-[16px] w-full max-w-[380px] p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <div className="bg-transparent"><img src="/logo-thita.png" alt="THITA" className="h-[28px] w-auto" /></div>
                <button onClick={()=>setShowLogin(false)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"><X size={16}/></button>
              </div>
             <h3 className="font-bold text-[18px] text-zinc-900">Acesso administrativo</h3>
              {/* Credenciais removidas por segurança */}
              <div className="mt-5 space-y-3">
                <input value={loginForm.user} onChange={e=>setLoginForm(f=>({...f,user:e.target.value}))} placeholder="Usuário" className="w-full h-11 rounded-[12px] border border-zinc-200 px-4 text-[14px] outline-none focus:border-[#C80082]" />
                <input type="password" value={loginForm.pass} onChange={e=>setLoginForm(f=>({...f,pass:e.target.value}))} placeholder="Senha" className="w-full h-11 rounded-[12px] border border-zinc-200 px-4 text-[14px] outline-none focus:border-[#C80082]" />
                {loginErr && <p className="text-[12px] text-red-600 flex items-center gap-1"><AlertCircle size={14}/>{loginErr}</p>}
                <button onClick={handleLogin} className="w-full h-11 rounded-[12px] bg-[#C80082] text-white font-bold text-[14px] hover:bg-[#B0006E] transition">Entrar</button>
                <button onClick={()=>setShowLogin(false)} className="w-full text-[12px] text-zinc-500 hover:text-zinc-800">Continuar como visitante</button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }

  // ADMIN VIEW
  return (
    <div className="min-h-screen bg-[#F6F3EF] font-sans flex">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700&display=swap'); .font-serif{font-family:'Playfair Display',serif}`}</style>

      {/* Sidebar admin */}
      <aside className="w-[240px] bg-[#111] text-white flex flex-col shrink-0">
        <div className="h-[64px] flex items-center px-5 border-b border-white/10 gap-3">
          <div className="bg-transparent"><img src="/logo-thita.png" alt="THITA" className="h-[24px] w-auto" /></div>
          <span className="text-[12px] text-white/60">ADMIN</span>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            {k:'Dashboard', ic: BarChart3},
            {k:'Produtos', ic: Package},
            {k:'Categorias', ic: Tag},
            {k:'Fornecedores', ic: Truck},
            {k:'Clientes', ic: Users},
            {k:'Entrada NF', ic: FileInput},
            {k:'Saída Venda', ic: FileOutput},
            {k:'Relatórios', ic: BarChart3},
            {k:'Configuração', ic: Settings},
          ].map(it=>{
            const active = adminTab===it.k;
            return <button key={it.k} onClick={()=>setAdminTab(it.k)} className={`w-full flex items-center gap-3 px-3 h-10 rounded-[10px] text-[13px] font-medium transition ${active?'bg-white text-[#111]':'text-white/70 hover:bg-white/10 hover:text-white'}`}><it.ic size={16}/>{it.k}</button>
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button onClick={()=>{setView('shop');}} className="w-full flex items-center gap-2 px-3 h-10 rounded-[10px] text-[13px] text-white/70 hover:text-white hover:bg-white/10"><ShoppingBag size={16}/> Ver Loja</button>
          <button onClick={()=>{setIsAuth(false); setView('shop');}} className="w-full flex items-center gap-2 px-3 h-9 rounded-[10px] text-[13px] text-white/50 hover:text-white"><LogOut size={14}/> Sair</button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="h-[64px] bg-white border-b border-zinc-200 flex items-center justify-between px-6 gap-3">
          <h1 className="font-bold text-[18px] text-zinc-900">{adminTab}</h1>
          <div className="flex items-center gap-3 text-[12px] text-zinc-500">
            {adminTab==='Relatórios' && (
              <button onClick={()=>setShowSinteticoModal(true)} className="h-9 px-4 rounded-[10px] bg-[#111] text-white text-[13px] font-semibold flex items-center gap-2 hover:bg-black transition shrink-0">
                <FileText size={16}/> Exportar sintético
              </button>
            )}
            <span className="hidden sm:inline">thita_ localStorage ativo</span>
            <div className="w-8 h-8 rounded-full bg-[#111] text-white flex items-center justify-center">A</div>
          </div>
        </div>

        <div className="p-4 lg:p-6 space-y-6">
          {adminTab==='Dashboard' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-bold">Total Produtos</p>
                <p className="text-[28px] font-bold text-zinc-900 mt-2">{produtos.length}</p>
                <p className="text-[12px] text-zinc-500 mt-1">{categorias.length} categorias</p>
              </div>
              <div className="bg-white rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-bold">Estoque Total</p>
                <p className="text-[28px] font-bold text-zinc-900 mt-2">{produtos.reduce((a,p)=>a+p.estoque,0)} un.</p>
                <p className="text-[12px] text-zinc-500 mt-1">em {produtos.length} itens</p>
              </div>
              <div className="bg-white rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-bold">Vendas</p>
                <p className="text-[28px] font-bold text-zinc-900 mt-2">{vendas.length}</p>
                <p className="text-[12px] text-zinc-500 mt-1">R$ {vendas.reduce((a,v)=>a+v.totalFinal,0).toFixed(2)} total</p>
              </div>
              <div className="bg-white rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-zinc-100">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-bold">Entradas NF</p>
                <p className="text-[28px] font-bold text-zinc-900 mt-2">{entradas.length}</p>
                <p className="text-[12px] text-zinc-500 mt-1">{crediario.filter(c=>c.status==='aberto').length} crediários abertos</p>
              </div>
            </div>
          )}

          {adminTab==='Categorias' && (
            <div className="bg-white rounded-[12px] border border-zinc-200 p-5">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-zinc-700 mb-1 block">Nova categoria</label>
                  <input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Ex: Baby doll, Blusas..." className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[14px] focus:outline-none focus:border-zinc-900" />
                </div>
                <button onClick={()=>{ if(newCat.trim()){ setCategorias(c=>[...c,newCat.trim()]); setNewCat(''); } }} className="h-10 px-4 rounded-[10px] bg-[#111] text-white text-[13px] font-semibold">Adicionar</button>
              </div>
              <table className="w-full mt-5 text-[13px]">
                <thead><tr className="text-[11px] text-zinc-500 uppercase"><th className="text-left py-2">Categoria</th><th className="text-right">Ação</th></tr></thead>
                <tbody>{categorias.map(cat=><tr key={cat} className="border-t border-zinc-100"><td className="py-2.5">{cat}</td><td className="text-right"><button onClick={()=>setCategorias(c=>c.filter(x=>x!==cat))} className="text-red-600 hover:underline">Excluir</button></td></tr>)}</tbody>
              </table>
            </div>
          )}

          {adminTab==='Fornecedores' && (
            <div className="grid lg:grid-cols-[320px_1fr] gap-6">
              <div className="bg-white rounded-[12px] border border-zinc-200 p-5">
                <h3 className="font-bold text-[14px] mb-3">{fornForm.id?'Editar':'Novo'} Fornecedor</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Nome</label>
                    <input value={fornForm.nome} onChange={e=>setFornForm({...fornForm,nome:e.target.value})} placeholder="Ex: Malhas Primavera LTDA" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">CNPJ</label>
                    <input value={fornForm.cnpj} onChange={e=>setFornForm({...fornForm,cnpj:e.target.value})} placeholder="00.000.000/0000-00" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Endereço</label>
                    <input value={fornForm.endereco} onChange={e=>setFornForm({...fornForm,endereco:e.target.value})} placeholder="Rua, número, bairro, cidade" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Contato</label>
                    <input value={fornForm.contato} onChange={e=>setFornForm({...fornForm,contato:e.target.value})} placeholder="(00) 00000-0000" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <button onClick={()=>{ if(!fornForm.nome.trim()) return; if(fornForm.id){ setFornecedores(prev=>prev.map(f=>f.id===fornForm.id?fornForm:f)); } else { setFornecedores(prev=>[...prev,{...fornForm,id:`f${Date.now()}`} ]); } setFornForm({id:'',nome:'',cnpj:'',endereco:'',contato:''}); }} className="w-full h-10 rounded-[10px] bg-[#111] text-white text-[13px] font-semibold mt-2">Salvar</button>
                </div>
              </div>
              <div className="bg-white rounded-[12px] border border-zinc-200 p-5 overflow-auto">
                <table className="w-full text-[13px] min-w-[500px]">
                  <thead><tr className="text-[11px] text-zinc-500 uppercase text-left"><th className="py-2">Nome</th><th>CNPJ</th><th>Contato</th><th></th></tr></thead>
                  <tbody>{fornecedores.map(f=><tr key={f.id} className="border-t border-zinc-100"><td className="py-2.5 font-medium">{f.nome}</td><td>{f.cnpj}</td><td>{f.contato}</td><td className="text-right flex justify-end gap-2"><button onClick={()=>setFornForm(f)} className="p-1 hover:bg-zinc-100 rounded"><Pencil size={14}/></button><button onClick={()=>setFornecedores(prev=>prev.filter(x=>x.id!==f.id))} className="p-1 hover:bg-zinc-100 rounded text-red-600"><Trash2 size={14}/></button></td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab==='Clientes' && (
            <>
              <div className="grid lg:grid-cols-[320px_1fr] gap-6">
                <div className="bg-white rounded-[12px] border border-zinc-200 p-5">
                  <h3 className="font-bold text-[14px] mb-3">{cliForm.id?'Editar':'Novo'} Cliente</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-700 mb-1 block">Nome</label>
                      <input value={cliForm.nome} onChange={e=>setCliForm({...cliForm,nome:e.target.value})} placeholder="Nome completo do cliente" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-700 mb-1 block">CPF / CNPJ</label>
                      <input value={cliForm.doc} onChange={e=>setCliForm({...cliForm,doc:e.target.value})} placeholder="000.000.000-00" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-700 mb-1 block">Contato</label>
                      <input value={cliForm.contato} onChange={e=>setCliForm({...cliForm,contato:e.target.value})} placeholder="(00) 00000-0000" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-700 mb-1 block">Endereço</label>
                      <input value={cliForm.endereco||''} onChange={e=>setCliForm({...cliForm,endereco:e.target.value})} placeholder="Rua, número, bairro, cidade" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                    </div>
                    <button onClick={()=>{ if(!cliForm.nome.trim()) return; if(cliForm.id){ setClientes(prev=>prev.map(c=>c.id===cliForm.id?cliForm:c)); } else { setClientes(prev=>[...prev,{...cliForm,id:`c${Date.now()}`} ]); } setCliForm({id:'',nome:'',doc:'',contato:'',endereco:''}); }} className="w-full h-10 rounded-[10px] bg-[#111] text-white text-[13px] font-semibold mt-1">Salvar</button>
                  </div>
                </div>
                <div className="bg-white rounded-[12px] border border-zinc-200 p-5 overflow-auto">
                  <table className="w-full text-[13px] min-w-[600px]">
                    <thead><tr className="text-[11px] text-zinc-500 uppercase text-left"><th className="py-2">Nome</th><th>Doc</th><th>Contato</th><th></th></tr></thead>
                    <tbody>{clientes.map(c=><tr key={c.id} className="border-t border-zinc-100"><td className="py-2.5 font-medium">{c.nome}</td><td>{c.doc}</td><td>{c.contato}</td><td className="text-right flex justify-end gap-1"><button onClick={()=>setCliHist(c)} className="px-2 h-7 rounded-full bg-zinc-900 text-white text-[11px] flex items-center gap-1"><Eye size={12}/> Ver compras</button><button onClick={()=>setCliForm(c)} className="p-1 hover:bg-zinc-100 rounded"><Pencil size={14}/></button><button onClick={()=>setClientes(prev=>prev.filter(x=>x.id!==c.id))} className="p-1 hover:bg-zinc-100 rounded text-red-600"><Trash2 size={14}/></button></td></tr>)}</tbody>
                  </table>
                </div>
              </div>
              {cliHist && (
                <div className="bg-white rounded-[12px] border border-zinc-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-[15px]">Histórico: {cliHist.nome}</h3>
                      <p className="text-[11px] text-zinc-500 mt-1">Clique em uma compra para ver o crediário detalhado abaixo</p>
                    </div>
                    <button onClick={()=>{setCliHist(null); setCliVendaSel(null);}} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"><X size={14}/></button>
                  </div>
                  <div className="flex gap-3 mb-4 flex-wrap">
                    <div className="flex flex-col gap-1 text-[12px]">
                      <label className="text-xs font-medium text-zinc-700">Data inicial</label>
                      <input type="date" value={cliHistIni} onChange={e=>setCliHistIni(e.target.value)} className="border border-zinc-200 rounded-[8px] px-2 h-8 text-[12px]" />
                    </div>
                    <div className="flex flex-col gap-1 text-[12px]">
                      <label className="text-xs font-medium text-zinc-700">Data final</label>
                      <input type="date" value={cliHistFim} onChange={e=>setCliHistFim(e.target.value)} className="border border-zinc-200 rounded-[8px] px-2 h-8 text-[12px]" />
                    </div>
                    {(cliHistIni || cliHistFim) && <button onClick={()=>{setCliHistIni(''); setCliHistFim('');}} className="self-end h-8 px-3 rounded-[8px] bg-zinc-100 text-[11px]">Limpar datas</button>}
                  </div>
                  <div className="overflow-auto rounded-[10px] border border-zinc-100">
                    <table className="w-full text-[12px] min-w-[720px]">
                      <thead><tr className="text-[11px] uppercase text-zinc-500 text-left border-b bg-zinc-50"><th className="py-2.5 px-3">Data</th><th className="px-2">Valor Total</th><th className="px-2">Desconto</th><th className="px-2">Forma</th><th className="px-2">Parcelas</th><th className="px-2">STATUS</th></tr></thead>
                      <tbody>
                        {filteredCliVendas.map(v=>{
                          const status = getStatusVenda(v);
                          const isSel = cliVendaSel===v.id;
                          return (
                            <tr key={v.id} onClick={()=>setCliVendaSel(v.id)} className={`border-b border-zinc-100 cursor-pointer transition ${isSel?'bg-[#FFF0F6]':'hover:bg-zinc-50'}`}>
                              <td className="py-2.5 px-3">{v.data}</td>
                              <td className="px-2 font-medium">R$ {v.totalFinal.toFixed(2)}</td>
                              <td className="px-2">R$ {v.desconto.toFixed(2)}</td>
                              <td className="px-2">{v.forma}</td>
                              <td className="px-2">{v.parcelas}x</td>
                              <td className="px-2"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${status==='Quitado'?'bg-green-100 text-green-700 border border-green-200':'bg-amber-100 text-amber-700 border border-amber-200'}`}>{status.toUpperCase()}</span></td>
                            </tr>
                          );
                        })}
                        {filteredCliVendas.length===0 && <tr><td colSpan={6} className="py-6 text-center text-zinc-400">Sem vendas no período</td></tr>}
                      </tbody>
                    </table>
                  </div>

                  {/* Crediário detalhado só após selecionar compra */}
                  {selectedVenda && (
                    <div className="mt-6 p-4 bg-[#FFFBF7] border border-[#F3E5D8] rounded-[12px]">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-[13px] text-zinc-900">Crediário - Venda {selectedVenda.data} • R$ {selectedVenda.totalFinal.toFixed(2)} • {selectedVenda.forma}</h4>
                          {selectedVenda.forma !== 'Crediário' ? (
                            <p className="text-[11px] text-zinc-500 mt-1">Esta venda foi {selectedVenda.forma} — status automaticamente <b className="text-green-700">Quitado</b>.</p>
                          ) : (
                            <p className="text-[11px] text-zinc-500 mt-1">Marque as parcelas como pagas. Ao quitar todas, o STATUS no histórico muda para Quitado.</p>
                          )}
                        </div>
                        <button onClick={()=>setCliVendaSel(null)} className="text-[11px] px-2 py-1 rounded bg-white border">Fechar detalhe</button>
                      </div>
                      {selectedVenda.forma !== 'Crediário' ? (
                        <div className="text-[12px] text-zinc-600 p-3 bg-white rounded-[8px] border">Sem crediário — pagamento {selectedVenda.forma} considerado quitado.</div>
                      ) : (
                        <div className="overflow-auto bg-white rounded-[10px] border">
                          <table className="w-full text-[12px] min-w-[700px]">
                            <thead><tr className="text-[11px] uppercase text-zinc-500 text-left border-b bg-zinc-50"><th className="py-2 px-3">Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Pagamento</th><th>Data do pagamento</th></tr></thead>
                            <tbody>
                              {crediarioDaVendaSel.map(cr=>{
                                const isPago = cr.status==='pago';
                                return (
                                  <tr key={cr.id} className="border-b border-zinc-100">
                                    <td className="py-2 px-3 font-medium">{cr.num}ª</td>
                                    <td>{cr.vencimento}</td>
                                    <td>R$ {cr.valor.toFixed(2)}</td>
                                    <td><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isPago?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{isPago?'Pago':'Pendente'}</span></td>
                                    <td>
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input type="checkbox" checked={isPago} onChange={e=>{
                                          const checked = e.target.checked;
                                          const hoje = new Date().toISOString().slice(0,10);
                                          setCrediario(prev=>prev.map(c=>{
                                            if(c.id!==cr.id) return c;
                                            return {...c, status: checked?'pago':'aberto' as const, data_pagamento: checked ? (c.data_pagamento || hoje) : undefined };
                                          }));
                                        }} className="accent-[#C80082] w-4 h-4" />
                                        <span className="text-[11px]">{isPago?'Quitado':'Marcar pago'}</span>
                                      </label>
                                    </td>
                                    <td>
                                      {isPago ? (
                                        <input type="date" value={cr.data_pagamento||''} onChange={e=>{
                                          const val = e.target.value;
                                          setCrediario(prev=>prev.map(c=>c.id===cr.id?{...c, data_pagamento: val}:c));
                                        }} className="border border-zinc-200 rounded-[6px] px-2 h-7 text-[11px]" />
                                      ) : (
                                        <span className="text-zinc-400 text-[11px]">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                              {crediarioDaVendaSel.length===0 && <tr><td colSpan={6} className="py-4 text-center text-zinc-400">Nenhuma parcela encontrada para esta venda.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {adminTab==='Produtos' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[12px] border border-zinc-200 p-5">
                <h3 className="font-bold text-[14px] mb-4">{editingProdId?'Editar Produto':'Novo Produto'}</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">nome</label>
                    <input value={prodForm.nome} onChange={e=>setProdForm({...prodForm,nome:e.target.value})} placeholder="Ex: Baby Doll Rendado Rosê" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">categoria</label>
                    <select value={prodForm.cat} onChange={e=>setProdForm({...prodForm,cat:e.target.value})} className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] bg-white focus:outline-none focus:border-zinc-900"><option value="">Selecione a categoria</option>{categorias.map(c=><option key={c} value={c}>{c}</option>)}</select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">descrição</label>
                    <textarea value={prodForm.desc} onChange={e=>setProdForm({...prodForm,desc:e.target.value})} placeholder="Descreva o produto, material, detalhes..." className="w-full rounded-[10px] border border-zinc-200 px-3 py-2 text-[13px] focus:outline-none focus:border-zinc-900" rows={2} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">fornecedor</label>
                    <select value={prodForm.forn} onChange={e=>setProdForm({...prodForm,forn:e.target.value})} className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] bg-white focus:outline-none focus:border-zinc-900"><option value="">Selecione o fornecedor</option>{fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">preço de custo</label>
                    <input type="number" value={prodForm.custo} onChange={e=>{ const c=Number(e.target.value); if(isNaN(c)) return; setProdForm(prev=>{ const venda = Number((c * (1 + prev.margem / 100)).toFixed(2)); return {...prev,custo:c, venda}; }); }} placeholder="Ex: 14.00" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">margem %</label>
                    <div className="flex gap-2">
                      <input type="number" value={prodForm.margem} onChange={e=>{ const m=Number(e.target.value); if(isNaN(m)) return; setProdForm(prev=>{ const venda = Number((prev.custo * (1 + m / 100)).toFixed(2)); return {...prev,margem:m, venda}; }); }} placeholder="Ex: 35" className="flex-1 h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                      <span className="h-10 px-3 rounded-[10px] bg-zinc-100 flex items-center text-[12px] border border-zinc-200">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">preço de venda</label>
                    <input type="number" value={prodForm.venda} onChange={e=>{ const v=Number(e.target.value); if(isNaN(v)) return; setProdForm(prev=>{ const margem = prev.custo > 0 ? Number((((v / prev.custo) - 1) * 100).toFixed(1)) : 0; return {...prev,venda:v, margem}; }); }} placeholder="Calculado ou editável" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">imagem URL</label>
                    <input
                      value={(prodForm.imagem && prodForm.imagem.startsWith('data:')) ? '' : (prodForm.img || '')}
                      onChange={e=>{ 
                        setProdImgError(''); 
                        const url = e.target.value.trim();
                        if(!url){
                          setProdForm(prev=>({...prev,img:'', imagem: prev.imagem && prev.imagem.startsWith('data:') ? prev.imagem : ''}));
                          return;
                        }
                        setProdForm(prev=>{
                          const cur = prev.imagens || [];
                          // se primeira, substitui capa, senão adiciona
                          const newList = cur.length===0 ? [url] : [cur[0], ...cur.slice(1), url].slice(0,8);
                          // se vazio, cria
                          if(cur.length===0) return {...prev, img:url, imagens:[url]};
                          // mantém primeira como capa, adiciona url no final se não existir
                          const exists = cur.includes(url);
                          return {...prev, img:cur[0], imagens: exists?cur:[...cur, url]};
                        });
                      }}
                      placeholder="https://... link da imagem (opcional se enviar arquivo)"
                      className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900"
                    />
                    <div className="mt-3 p-3 bg-zinc-50 rounded-[10px] border border-zinc-200">
                      <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Fotos do produto (múltiplas) — 1ª é a capa do catálogo</label>
                      <div className="flex flex-wrap items-center gap-3">
                        <input ref={prodFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>{ handleProdImageFiles(e.target.files); }} />
                        <button type="button" onClick={()=>prodFileRef.current?.click()} className="h-10 px-4 rounded-[10px] bg-zinc-900 text-white border border-zinc-900 flex items-center gap-2 text-[12px] font-semibold hover:bg-black transition">
                          <Upload size={14}/> Adicionar fotos
                        </button>
                        {getProdImages(prodForm as Produto).length>0 && (
                          <button type="button" onClick={()=>{ setProdForm({...prodForm,img:'', imagem:'', imagens:[]}); setProdImgError(''); if(prodFileRef.current) prodFileRef.current.value=''; }} className="h-10 px-3 rounded-[10px] bg-white border border-zinc-200 text-[12px] hover:bg-zinc-100">Limpar todas</button>
                        )}
                        <span className="text-[11px] text-zinc-500">{getProdImages(prodForm as Produto).length} foto(s) — catálogo mostra só capa</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-2 leading-tight">Suporta JPG, PNG, WEBP - máx 2MB cada - pode selecionar várias de uma vez</p>
                      {prodImgError && <p className="text-[11px] text-red-600 mt-1.5 flex items-center gap-1"><AlertCircle size={12}/>{prodImgError}</p>}
                      {getProdImages(prodForm as Produto).length>0 && (
                        <div className="mt-3">
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {getProdImages(prodForm as Produto).map((src, idx)=>(
                              <div key={idx} className={`group relative aspect-square rounded-[10px] overflow-hidden border-2 ${idx===0?'border-zinc-900':'border-zinc-200'} bg-white`}>
                                <img src={src} alt={`foto ${idx+1}`} className="w-full h-full object-cover" />
                                {idx===0 && <span className="absolute top-1 left-1 bg-zinc-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">CAPA</span>}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition"></div>
                                <button type="button" onClick={()=>{
                                  setProdForm(prev=>{
                                    const imgs = [...(prev.imagens||[])];
                                    imgs.splice(idx,1);
                                    const newFirst = imgs[0]||'';
                                    return {...prev, img:newFirst, imagem: newFirst.startsWith('data:')?newFirst:prev.imagem, imagens:imgs};
                                  });
                                }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 border border-zinc-200 flex items-center justify-center hover:bg-white"><X size={10}/></button>
                                {idx!==0 && (
                                  <button type="button" onClick={()=>{
                                    setProdForm(prev=>{
                                      const imgs = [...(prev.imagens||[])];
                                      const [moved] = imgs.splice(idx,1);
                                      imgs.unshift(moved);
                                      return {...prev, img:imgs[0], imagens:imgs};
                                    });
                                  }} className="absolute bottom-1 left-1 right-1 h-5 rounded-[6px] bg-white/90 text-[9px] font-bold border border-zinc-200 hover:bg-white">Tornar capa</button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">estoque inicial</label>
                    <input type="number" value={prodForm.estoque} onChange={e=>setProdForm({...prodForm,estoque:Number(e.target.value)})} placeholder="Quantidade em estoque" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div className="md:col-span-2 flex flex-col gap-3 pb-1">
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1.5 text-[12px] text-zinc-700"><input type="checkbox" checked={prodForm.novo} onChange={e=>setProdForm({...prodForm,novo:e.target.checked})} className="accent-[#C80082]"/> Novo</label>
                      <label className="flex items-center gap-1.5 text-[12px] text-zinc-700"><input type="checkbox" checked={prodForm.promo} onChange={e=>setProdForm({...prodForm,promo:e.target.checked})} className="accent-[#C80082]"/> Promoção</label>
                    </div>
                    <div className="flex flex-col gap-2 bg-zinc-50 border border-zinc-200 rounded-[12px] p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-zinc-700">Tamanhos:</span>
                        <span className="text-[10px] px-2.5 py-1 rounded-full border font-semibold tracking-wide bg-zinc-100 border-zinc-300">
                          TAMANHOS - PP ao G2 e 2 ao 16
                        </span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                  {ALL_SIZES.map(sz=>(
                  <button key={sz} type="button" onClick={()=>setProdForm(p=>({...p,tamanhos:(p.tamanhos||[]).includes(sz)?(p.tamanhos||[]).filter(t=>t!==sz):[...(p.tamanhos||[]),sz]}))} className={`px-3 h-8 rounded-full text- font-bold border ${(prodForm.tamanhos||[]).includes(sz)?'bg-zinc-900 text-white border-zinc-900':'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'}`}>{sz}</button>
                ))}
                </div>
                    <p className="text-[11px] text-zinc-500 leading-snug">
                      Todos os tamanhos disponiveis: PP ao G2 e 2 ao 16.
                    </p>
                  </div>
                </div>
              </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={saveProduto} className="h-10 px-5 rounded-[10px] bg-[#111] text-white text-[13px] font-semibold">Salvar</button>
                  {editingProdId && <button onClick={()=>{ setEditingProdId(null); setProdForm({ id: '', nome: '', desc: '', cat: categorias[0], custo: 0, margem: 70, venda: 0, forn: fornecedores[0]?.id || '', img: '', estoque: 0, novo: false, promo: false, tamanhos: ["M","G"] }); setProdImgError(''); if(prodFileRef.current) prodFileRef.current.value=''; }} className="h-10 px-4 rounded-[10px] bg-zinc-100 text-[13px]">Cancelar</button>}
                </div>
              </div>

              <div className="bg-white rounded-[12px] border border-zinc-200 p-5 overflow-auto">
                <table className="w-full text-[13px] min-w-[800px]">
                  <thead><tr className="text-[11px] uppercase text-zinc-500 text-left"><th className="py-2">Produto</th><th>Cat</th><th>Custo</th><th>Venda</th><th>Estoque</th><th></th></tr></thead>
                  <tbody>{produtos.map(p=><tr key={p.id} className="border-t border-zinc-100"><td className="py-2.5 flex items-center gap-2"><img src={getProdImage(p)} className="w-10 h-10 rounded-[8px] object-cover" />{p.nome}</td><td>{p.cat}</td><td>R$ {p.custo.toFixed(2)}</td><td className="font-bold">R$ {p.venda.toFixed(2)}</td><td>{p.estoque}</td><td className="text-right"><div className="flex justify-end gap-1"><button onClick={()=>{ setProdForm(p); setEditingProdId(p.id); window.scrollTo({top:0,behavior:'smooth'}); }} className="p-1.5 hover:bg-zinc-100 rounded"><Pencil size={14}/></button><button onClick={async()=>{ await supabase.from('produtos').delete().eq('id', p.id); setProdutos(prev=>prev.filter(x=>x.id!==p.id)) }} className="p-1.5 hover:bg-zinc-100 rounded text-red-600"><Trash2 size={14}/></button></div></td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab==='Entrada NF' && (
            <div className="space-y-4">
              <div className="bg-white rounded-[12px] border border-zinc-200 p-5">
                <div className="grid md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Fornecedor</label>
                    <select value={nf.fornId} onChange={e=>setNf({...nf,fornId:e.target.value})} className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] bg-white"><option value="">Selecione o fornecedor</option>{fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Nº Nota</label>
                    <input value={nf.numNota} onChange={e=>setNf({...nf,numNota:e.target.value})} placeholder="Ex: 12345" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Data</label>
                    <input type="date" value={nf.data} onChange={e=>setNf({...nf,data:e.target.value})} className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Frete R$</label>
                    <input type="number" value={nf.frete} onChange={e=>setNf({...nf,frete:Number(e.target.value)})} placeholder="Ex: 25.00" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px]" />
                  </div>
                </div>
                <div className="mt-4 p-3 bg-zinc-50 rounded-[10px] flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Produto</label>
                    <select value={nfItem.prodId} onChange={e=>{ const prod=produtos.find(p=>p.id===e.target.value); setNfItem({...nfItem,prodId:e.target.value, custo: prod?prod.custo:0}); }} className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] bg-white"><option value="">Selecione o produto</option>{produtos.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Qtd</label>
                    <input type="number" value={nfItem.qtd} onChange={e=>setNfItem({...nfItem,qtd:Number(e.target.value)})} placeholder="0" className="h-10 w-24 rounded-[10px] border border-zinc-200 px-3 text-[13px]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Custo</label>
                    <input type="number" value={nfItem.custo} onChange={e=>setNfItem({...nfItem,custo:Number(e.target.value)})} placeholder="R$" className="h-10 w-28 rounded-[10px] border border-zinc-200 px-3 text-[13px]" />
                  </div>
                  <button onClick={()=>{ if(!nfItem.prodId||nfItem.qtd<=0) return; setNf({...nf,itens:[...nf.itens,nfItem]}); }} className="h-10 px-4 rounded-[10px] bg-[#111] text-white text-[13px] flex items-center gap-1 self-end"><Plus size={14}/> Item</button>
                </div>
                <table className="w-full text-[13px] mt-4">
                  <thead><tr className="text-[11px] uppercase text-zinc-500 text-left"><th className="py-2">Produto</th><th>Qtd</th><th>Custo</th><th>Total</th><th></th></tr></thead>
                  <tbody>{nf.itens.map((it,i)=><tr key={i} className="border-t border-zinc-100"><td className="py-2">{produtos.find(p=>p.id===it.prodId)?.nome}</td><td>{it.qtd}</td><td>R$ {it.custo.toFixed(2)}</td><td>R$ {(it.qtd*it.custo).toFixed(2)}</td><td className="text-right"><button onClick={()=>setNf({...nf,itens:nf.itens.filter((_,idx)=>idx!==i)})} className="text-red-600"><Trash2 size={14}/></button></td></tr>)}</tbody>
                </table>
                <div className="mt-4 flex justify-between items-center">
                  <p className="text-[13px] font-bold">Itens: R$ {nf.itens.reduce((a,it)=>a+it.qtd*it.custo,0).toFixed(2)} {nf.frete>0?`+ Frete R$ ${nf.frete.toFixed(2)} = Total R$ ${(nf.itens.reduce((a,it)=>a+it.qtd*it.custo,0)+nf.frete).toFixed(2)}`:''}</p>
                  <button onClick={()=>{
                    if(!nf.fornId||nf.itens.length===0) return;
                    const subtotal = nf.itens.reduce((a,it)=>a+it.qtd*it.custo,0);
                    const total = subtotal + (nf.frete||0);
                    const entrada: Entrada = { id:`e${Date.now()}`, fornId:nf.fornId, numNota:nf.numNota, data:nf.data, frete: nf.frete||0, itens:nf.itens, total };
                    setEntradas(prev=>[...prev,entrada]);
                    // soma estoque
                    setProdutos(prev=>prev.map(p=>{
                      const found = nf.itens.find(it=>it.prodId===p.id);
                      if(found) return {...p, estoque: p.estoque+found.qtd, custo: found.custo };
                      return p;
                    }));
                    setNf({ fornId: fornecedores[0]?.id||'', numNota:'', data: new Date().toISOString().slice(0,10), frete: 0, itens:[] });
                  }} className="h-10 px-5 rounded-[10px] bg-[#C80082] text-white text-[13px] font-bold">Lançar no Estoque</button>
                </div>
              </div>
              <div className="bg-white rounded-[12px] border border-zinc-200 p-5 overflow-auto">
                <h4 className="font-bold text-[13px] mb-3">Últimas Entradas</h4>
                <table className="w-full text-[12px] min-w-[500px]"><thead><tr className="text-[11px] uppercase text-zinc-500 text-left border-b"><th className="py-2">Data</th><th>Fornecedor</th><th>Nota</th><th>Frete</th><th>Total</th><th>Itens</th></tr></thead><tbody>{entradas.slice(-10).reverse().map(e=><tr key={e.id} className="border-b border-zinc-100"><td className="py-2">{e.data}</td><td>{fornecedores.find(f=>f.id===e.fornId)?.nome}</td><td>{e.numNota}</td><td>{(e.frete||0)>0 ? `R$ ${(e.frete||0).toFixed(2)}` : '—'}</td><td>R$ {e.total.toFixed(2)}</td><td>{e.itens.length}</td></tr>)}</tbody></table>
              </div>
            </div>
          )}

          {adminTab==='Saída Venda' && (
            <div className="space-y-4">
              <div className="bg-white rounded-[12px] border border-zinc-200 p-5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700">Cliente (obrigatório)</label>
                  <div className="flex flex-col md:flex-row gap-3 items-start">
                    <select value={vendaClienteId} onChange={e=>setVendaClienteId(e.target.value)} className="h-11 rounded-[12px] border border-zinc-200 px-4 text-[13px] flex-1 bg-white">
                      <option value="">Selecione o Cliente (obrigatório)</option>
                      {clientes.map(c=><option key={c.id} value={c.id}>{c.nome} - {c.doc}</option>)}
                    </select>
                  </div>
                </div>
                {!vendaClienteId && <p className="mt-3 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-[10px] p-3 flex gap-2"><AlertCircle size={14}/> Selecione um cliente para liberar o carrinho.</p>}
                {vendaClienteId && (
                  <>
                    <div className="mt-5 p-3 bg-zinc-50 rounded-[10px] flex flex-wrap gap-3 items-end">
                      <div className="flex-1 min-w-[160px]">
                        <label className="text-xs font-medium text-zinc-700 mb-1 block">Produto</label>
                        <select value={cartProd.prodId} onChange={e=>setCartProd({...cartProd,prodId:e.target.value})} className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] bg-white"><option value="">Produto (estoque &gt;0)</option>{produtos.map(p=><option key={p.id} value={p.id}>{p.nome} - Est {p.estoque} - R$ {p.venda}</option>)}</select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-zinc-700 mb-1 block">Quantidade</label>
                        <input type="number" value={cartProd.qtd} onChange={e=>setCartProd({...cartProd,qtd:Number(e.target.value)})} placeholder="Qtd" className="h-10 w-24 rounded-[10px] border border-zinc-200 px-3 text-[13px]" />
                      </div>
                      <button onClick={()=>{ if(!cartProd.prodId||cartProd.qtd<=0) return; const exists = carrinho.find(c=>c.prodId===cartProd.prodId); if(exists){ setCarrinho(carrinho.map(c=>c.prodId===cartProd.prodId?{...c,qtd:c.qtd+cartProd.qtd}:c)); } else setCarrinho([...carrinho,cartProd]); setCartProd({prodId:'',qtd:1}); }} className="h-10 px-4 rounded-[10px] bg-[#111] text-white text-[13px] flex items-center gap-1 self-end"><Plus size={14}/> Add</button>
                    </div>
                    <table className="w-full text-[13px] mt-4"><thead><tr className="text-[11px] uppercase text-zinc-500 text-left"><th className="py-2">Produto</th><th>Qtd</th><th>Preço</th><th>Total</th><th></th></tr></thead><tbody>{carrinho.map((it,i)=>{ const p=produtos.find(pp=>pp.id===it.prodId); return <tr key={i} className="border-t border-zinc-100"><td className="py-2">{p?.nome}</td><td>{it.qtd}</td><td>R$ {p?.venda.toFixed(2)}</td><td>R$ {((p?.venda||0)*it.qtd).toFixed(2)}</td><td className="text-right"><button onClick={()=>setCarrinho(carrinho.filter((_,idx)=>idx!==i))} className="text-red-600"><Trash2 size={14}/></button></td></tr> })}</tbody></table>
                    <div className="mt-4 flex justify-between items-center"><p className="font-bold">Total: R$ {carrinhoTotal.toFixed(2)}</p><button disabled={carrinho.length===0} onClick={()=>setShowFinalizar(true)} className="h-11 px-6 rounded-[12px] bg-[#C80082] text-white font-bold text-[13px] disabled:opacity-50">Finalizar Venda</button></div>
                  </>
                )}
              </div>
            </div>
          )}

          {adminTab==='Relatórios' && (
            <div className="space-y-5">
              <div className="bg-white rounded-[12px] border border-zinc-200 p-5">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
                    <div>
                      <label className="text-xs font-medium text-zinc-700 mb-1 block">Data inicial</label>
                      <input type="date" value={repIni} onChange={e=>setRepIni(e.target.value)} className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] bg-white focus:outline-none focus:border-zinc-900" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-700 mb-1 block">Data final</label>
                      <input type="date" value={repFim} onChange={e=>setRepFim(e.target.value)} className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] bg-white focus:outline-none focus:border-zinc-900" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-700 mb-1 block">Fornecedor (Entradas)</label>
                      <select value={repForn} onChange={e=>setRepForn(e.target.value)} className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] bg-white"><option value="todos">Todos Fornecedores</option>{fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-700 mb-1 block">Cliente (Saídas)</label>
                      <select value={repCli} onChange={e=>setRepCli(e.target.value)} className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] bg-white"><option value="todos">Todos Clientes</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                    </div>
                  </div>
                  <button onClick={()=>{ setRepIni(''); setRepFim(''); setRepForn('todos'); setRepCli('todos'); }} className="h-10 px-4 rounded-[10px] bg-zinc-100 hover:bg-zinc-200 text-[13px] font-medium border border-zinc-200 flex items-center gap-1.5 shrink-0">
                    <X size={14}/> Limpar filtros
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-3">Pesquisa sintética • Entradas filtra por fornecedor • Saídas filtra por cliente • Duplo clique para ver analítico</p>
              </div>

              {/* TABELA ENTRADAS */}
              <div className="bg-white rounded-[12px] border border-zinc-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-[14px] flex items-center gap-2"><FileInput size={16}/> Entradas (Compras)</h4>
                  <span className="text-[11px] bg-zinc-100 px-2.5 py-1 rounded-full border">{entradasFiltradas.length} notas • R$ {entradasFiltradas.reduce((a,e)=>a+e.total,0).toFixed(2)}</span>
                </div>
                <div className="overflow-auto rounded-[10px] border border-zinc-100">
                  <table className="w-full text-[12px] min-w-[740px]">
                    <thead><tr className="text-[11px] uppercase text-zinc-500 text-left bg-zinc-50 border-b"><th className="py-2.5 px-3">Data</th><th>Nº Nota</th><th>Fornecedor</th><th className="text-right">Frete</th><th className="text-right pr-4">Valor Total</th><th className="text-center">Ação</th></tr></thead>
                    <tbody>
                      {entradasFiltradas.map(e=>(
                        <tr key={e.id} onDoubleClick={()=>setRepEntradaSel(e)} className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer">
                          <td className="py-2.5 px-3">{e.data}</td>
                          <td className="font-medium">{e.numNota || e.id.slice(0,6)}</td>
                          <td className="text-zinc-700">{fornecedores.find(f=>f.id===e.fornId)?.nome || '—'}</td>
                          <td className="text-right">{(e.frete||0)>0 ? `R$ ${(e.frete||0).toFixed(2)}` : '—'}</td>
                          <td className="text-right pr-4 font-bold">R$ {e.total.toFixed(2)}</td>
                          <td className="text-center"><div className="flex justify-center gap-1"><button onClick={()=>setRepEntradaSel(e)} className="px-2.5 h-7 rounded-full bg-zinc-900 text-white text- hover:bg-black">Ver detalhes</button><button onClick={()=>cancelarEntrada(e.id)} className="px-2.5 h-7 rounded-full bg-red-600 text-white text- font-bold hover:bg-red-700">Cancelar</button></div></td>                        </tr>
                      ))}
                      {entradasFiltradas.length===0 && <tr><td colSpan={6} className="py-6 text-center text-zinc-400">Nenhuma entrada no período selecionado</td></tr>}
                      {entradasFiltradas.length>0 && <tr className="font-bold bg-zinc-50"><td colSpan={3} className="py-2.5 px-3 text-right">Total período</td><td className="text-right">R$ {entradasFiltradas.reduce((a,e)=>a+(e.frete||0),0).toFixed(2)}</td><td className="text-right pr-4">R$ {entradasFiltradas.reduce((a,e)=>a+e.total,0).toFixed(2)}</td><td></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABELA SAÍDAS */}
              <div className="bg-white rounded-[12px] border border-zinc-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-[14px] flex items-center gap-2"><FileOutput size={16}/> Saídas (Vendas)</h4>
                  <span className="text-[11px] bg-zinc-100 px-2.5 py-1 rounded-full border">{vendasFiltradas.length} vendas • R$ {vendasFiltradas.reduce((a,v)=>a+v.totalFinal,0).toFixed(2)}</span>
                </div>
                <div className="overflow-auto rounded-[10px] border border-zinc-100">
                  <table className="w-full text-[12px] min-w-[860px]">
                    <thead><tr className="text-[11px] uppercase text-zinc-500 text-left bg-zinc-50 border-b"><th className="py-2.5 px-3">Data</th><th>Cliente</th><th className="text-right">Total</th><th className="text-center">Entrega</th><th className="text-center">Embalagem</th><th className="text-right">Líquido</th><th>Forma Pagamento</th><th>Status</th><th className="text-center">Ação</th></tr></thead>
                    <tbody>
                      {vendasFiltradas.map(v=>{
                        const cli = clientes.find(c=>c.id===v.clienteId);
                        const st = getStatusVenda(v);
                        const liquido = v.totalFinal - (v.embalagem ? (v.embalagemValor||0) : 0);
                        return (
                          <tr key={v.id} onDoubleClick={()=>setRepVendaSel(v)} className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer">
                            <td className="py-2.5 px-3">{v.data}</td>
                            <td className="font-medium">{cli?.nome || '—'}</td>
                            <td className="text-right font-bold">R$ {v.totalFinal.toFixed(2)}</td>
                            <td className="text-center">{(v.entrega && (v.entregaValor||0)>0) ? <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full text-[10px]">R$ {(v.entregaValor||0).toFixed(2)}</span> : <span className="text-zinc-400">—</span>}</td>
                            <td className="text-center">{(v.embalagem && (v.embalagemValor||0)>0) ? <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full text-[10px]">R$ {(v.embalagemValor||0).toFixed(2)}</span> : <span className="text-zinc-400">—</span>}</td>
                            <td className="text-right font-bold text-green-700">R$ {liquido.toFixed(2)}</td>
                            <td>{v.forma} {v.parcelas>1?`• ${v.parcelas}x`:''}</td>
                            <td><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st==='Quitado'?'bg-green-100 text-green-700 border border-green-200':'bg-amber-100 text-amber-700 border border-amber-200'}`}>{st}</span></td>
                            <td className="text-center"><div className="flex justify-center gap-1"><button onClick={()=>setRepVendaSel(v)} className="px-2.5 h-7 rounded-full bg-zinc-900 text-white text- hover:bg-black">Ver detalhes</button><button onClick={()=>cancelarVenda(v.id)} className="px-2.5 h-7 rounded-full bg-red-600 text-white text- font-bold hover:bg-red-700">Cancelar</button></div></td>                          </tr>
                        );
                      })}
                      {vendasFiltradas.length===0 && <tr><td colSpan={9} className="py-6 text-center text-zinc-400">Nenhuma venda no período selecionado</td></tr>}
                      {vendasFiltradas.length>0 && <tr className="font-bold bg-zinc-50"><td colSpan={2} className="py-2.5 px-3 text-right">Total período</td><td className="text-right">R$ {vendasFiltradas.reduce((a,v)=>a+v.totalFinal,0).toFixed(2)}</td><td className="text-center">R$ {vendasFiltradas.reduce((a,v)=>a+(v.entrega?(v.entregaValor||0):0),0).toFixed(2)}</td><td className="text-center">R$ {vendasFiltradas.reduce((a,v)=>a+(v.embalagem?(v.embalagemValor||0):0),0).toFixed(2)}</td><td className="text-right text-green-700">R$ {vendasFiltradas.reduce((a,v)=>a+(v.totalFinal - (v.embalagem?(v.embalagemValor||0):0)),0).toFixed(2)}</td><td colSpan={3}></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MODAL ANALITICO ENTRADA */}
              {repEntradaSel && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setRepEntradaSel(null)}>
                  <div className="bg-white rounded-[16px] w-full max-w-[760px] max-h-[90vh] overflow-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
                    <div className="sticky top-0 bg-white border-b border-zinc-100 p-5 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-[18px]">Relatório Analítico — Entrada</h3>
                        <div className="mt-2 text-[13px] space-y-1 text-zinc-700">
                          <p><b>Nº Nota:</b> {repEntradaSel.numNota || repEntradaSel.id} • <b>Data:</b> {repEntradaSel.data} {(repEntradaSel.frete||0)>0 ? `• Frete R$ ${(repEntradaSel.frete||0).toFixed(2)}` : ''}</p>
                          <p><b>Fornecedor:</b> {fornecedores.find(f=>f.id===repEntradaSel.fornId)?.nome || '—'} {fornecedores.find(f=>f.id===repEntradaSel.fornId)?.cnpj ? `• CNPJ ${fornecedores.find(f=>f.id===repEntradaSel.fornId)?.cnpj}` : ''}</p>
                        </div>
                      </div>
                      <button onClick={()=>setRepEntradaSel(null)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"><X size={16}/></button>
                    </div>
                    <div className="p-5">
                      <h4 className="font-bold text-[13px] mb-3">Itens da Nota</h4>
                      <div className="overflow-auto rounded-[10px] border border-zinc-100">
                        <table className="w-full text-[13px] min-w-[500px]">
                          <thead><tr className="text-[11px] uppercase text-zinc-500 text-left bg-zinc-50 border-b"><th className="py-2 px-3">Produto</th><th className="text-center">Qtd</th><th className="text-right">Custo unit.</th><th className="text-right pr-3">Subtotal</th></tr></thead>
                          <tbody>
                            {repEntradaSel.itens.map((it, idx)=>{
                              const prod = produtos.find(p=>p.id===it.prodId);
                              return (
                                <tr key={idx} className="border-b border-zinc-100">
                                  <td className="py-2.5 px-3"><div className="font-medium">{prod?.nome || it.prodId}</div><div className="text-[11px] text-zinc-500">{prod?.cat || ''}</div></td>
                                  <td className="text-center">{it.qtd}</td>
                                  <td className="text-right">R$ {it.custo.toFixed(2)}</td>
                                  <td className="text-right pr-3 font-bold">R$ {(it.qtd*it.custo).toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 bg-zinc-50 rounded-[12px] p-4 space-y-2">
                        <div className="flex justify-between text-[13px]"><span>Subtotal itens</span><span>R$ {repEntradaSel.itens.reduce((a,it)=>a+it.qtd*it.custo,0).toFixed(2)}</span></div>
                        {(repEntradaSel.frete||0)>0 && <div className="flex justify-between text-[13px]"><span>Frete</span><span>R$ {(repEntradaSel.frete||0).toFixed(2)}</span></div>}
                        <div className="flex justify-between items-center border-t pt-2"><span className="text-[13px] text-zinc-600 font-bold">Total geral da nota</span><span className="font-bold text-[18px]">R$ {repEntradaSel.total.toFixed(2)}</span></div>
                      </div>
                      <div className="mt-5 flex justify-end gap-2">
                        <button onClick={()=>{ setAnaliticoExport({tipo:'entrada', data: repEntradaSel}); }} className="h-10 px-5 rounded-[10px] bg-white border border-zinc-300 text-zinc-900 text-[13px] font-semibold flex items-center gap-2 hover:bg-zinc-50">
                          <FileText size={14}/> Exportar analítico
                        </button>
                        <button onClick={()=>setRepEntradaSel(null)} className="h-10 px-5 rounded-[10px] bg-zinc-900 text-white text-[13px] font-bold">Fechar relatório</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL ANALITICO SAIDA */}
              {repVendaSel && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setRepVendaSel(null)}>
                  <div className="bg-white rounded-[16px] w-full max-w-[820px] max-h-[90vh] overflow-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
                    <div className="sticky top-0 bg-white border-b border-zinc-100 p-5 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-[18px]">Relatório Analítico — Saída</h3>
                        <div className="mt-2 text-[13px] space-y-1 text-zinc-700">
                          <p><b>Data:</b> {repVendaSel.data} • <b>Cliente:</b> {clientes.find(c=>c.id===repVendaSel.clienteId)?.nome || '—'} • <b>Doc:</b> {clientes.find(c=>c.id===repVendaSel.clienteId)?.doc || '—'}</p>
                          <p><b>Forma:</b> {repVendaSel.forma} • <b>Parcelas:</b> {repVendaSel.parcelas}x • <b>Venc:</b> {repVendaSel.venc} • <b>Status:</b> {getStatusVenda(repVendaSel)}</p>
                        </div>
                      </div>
                      <button onClick={()=>setRepVendaSel(null)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"><X size={16}/></button>
                    </div>
                    <div className="p-5">
                      <h4 className="font-bold text-[13px] mb-3">Itens da Venda</h4>
                      <div className="overflow-auto rounded-[10px] border border-zinc-100">
                        <table className="w-full text-[13px] min-w-[560px]">
                          <thead><tr className="text-[11px] uppercase text-zinc-500 text-left bg-zinc-50 border-b"><th className="py-2 px-3">Produto</th><th className="text-center">Qtd</th><th className="text-right">Preço</th><th className="text-right pr-3">Subtotal</th></tr></thead>
                          <tbody>
                            {repVendaSel.itens.map((it, idx)=>{
                              const prod = produtos.find(p=>p.id===it.prodId);
                              return (
                                <tr key={idx} className="border-b border-zinc-100">
                                  <td className="py-2.5 px-3"><div className="font-medium">{prod?.nome || it.prodId}</div><div className="text-[11px] text-zinc-500">{prod?.cat || ''}</div></td>
                                  <td className="text-center">{it.qtd}</td>
                                  <td className="text-right">R$ {it.preco.toFixed(2)}</td>
                                  <td className="text-right pr-3 font-bold">R$ {(it.qtd*it.preco).toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 space-y-2 bg-zinc-50 rounded-[12px] p-4 text-[13px]">
                        <div className="flex justify-between"><span>Subtotal</span><span>R$ {repVendaSel.total.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Desconto</span><span className="text-red-600">- R$ {repVendaSel.desconto.toFixed(2)}</span></div>
                        {(repVendaSel.entrega||false) && (repVendaSel.entregaValor||0)>0 && <div className="flex justify-between"><span className="flex items-center gap-1">🚚 Entrega <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">CLIENTE</span></span><span className="text-blue-600">+ R$ {(repVendaSel.entregaValor||0).toFixed(2)}</span></div>}
                        <div className="flex justify-between font-bold text-[15px] border-t pt-2 mt-2"><span>Total final (cliente paga)</span><span>R$ {repVendaSel.totalFinal.toFixed(2)}</span></div>
                        {(repVendaSel.embalagem||false) && (repVendaSel.embalagemValor||0)>0 && (
                          <>
                            <div className="flex justify-between text-[12px] text-zinc-600 border-t pt-2 mt-2"><span className="flex items-center gap-1">📦 Embalagem <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">CUSTO</span></span><span className="text-amber-700">- R$ {(repVendaSel.embalagemValor||0).toFixed(2)}</span></div>
                            <div className="flex justify-between font-bold text-[13px] text-green-700"><span>Líquido (venda - embalagem)</span><span>R$ {(repVendaSel.totalFinal - (repVendaSel.embalagemValor||0)).toFixed(2)}</span></div>
                          </>
                        )}
                      </div>
                      {repVendaSel.forma==='Crediário' && (
                        <div className="mt-5">
                          <h4 className="font-bold text-[13px] mb-2">Parcelas do crediário</h4>
                          <div className="overflow-auto rounded-[10px] border border-zinc-100">
                            <table className="w-full text-[12px] min-w-[500px]">
                              <thead><tr className="text-[11px] uppercase text-zinc-500 text-left bg-zinc-50 border-b"><th className="py-2 px-3">Parcela</th><th>Venc</th><th>Valor</th><th>Status</th><th>Dt Pgto</th></tr></thead>
                              <tbody>{crediario.filter(c=>c.vendaId===repVendaSel.id).sort((a,b)=>a.num-b.num).map(cr=><tr key={cr.id} className="border-b border-zinc-100"><td className="py-2 px-3">{cr.num}ª</td><td>{cr.vencimento}</td><td>R$ {cr.valor.toFixed(2)}</td><td><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cr.status==='pago'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{cr.status==='pago'?'Pago':'Pendente'}</span></td><td>{cr.data_pagamento || '—'}</td></tr>)}</tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      <div className="mt-5 flex justify-end gap-2">
                        <button onClick={()=>{ setAnaliticoExport({tipo:'saida', data: repVendaSel}); }} className="h-10 px-5 rounded-[10px] bg-white border border-zinc-300 text-zinc-900 text-[13px] font-semibold flex items-center gap-2 hover:bg-zinc-50">
                          <FileText size={14}/> Exportar analítico
                        </button>
                        <button onClick={()=>setRepVendaSel(null)} className="h-10 px-5 rounded-[10px] bg-zinc-900 text-white text-[13px] font-bold">Fechar relatório</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL SINTÉTICO FORMATADO - A4 */}
              {showSinteticoModal && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-start justify-center p-3 lg:p-6 overflow-y-auto" onClick={()=>setShowSinteticoModal(false)}>
                  <div className="bg-[#F6F3EF] rounded-[16px] w-full max-w-[960px] my-4 shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
                    {/* A4 Document */}
                    <div className="bg-white m-2 lg:m-4 rounded-[12px] border border-zinc-200 shadow-sm overflow-hidden">
                      {/* Header Doc */}
                      <div className="px-6 lg:px-8 py-6 border-b border-zinc-100 flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-[#FFF6DD] px-3.5 py-1.5 rounded-[10px] border-0"><span className="font-serif text-[18px] text-[#8B6A3A] font-bold tracking-wide">THITA</span></div>
                          <div>
                            <h2 className="font-bold text-[16px] text-zinc-900 leading-tight">Relatório Sintético</h2>
                            <p className="text-[11px] text-zinc-500 mt-0.5">Período: {repIni || '—'} até {repFim || '—'} • Gerado em {new Date().toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-bold">THITA STORE</p>
                          <p className="text-[11px] text-zinc-500">Alagoinhas, BA</p>
                        </div>
                      </div>

                      {/* Filters summary */}
                      <div className="px-6 lg:px-8 py-4 bg-zinc-50/70 border-b border-zinc-100 grid grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
                        <div><span className="text-zinc-500 uppercase font-bold text-[10px] block">Fornecedor filtro</span><span className="font-medium text-zinc-800">{repForn==='todos' ? 'Todos' : (fornecedores.find(f=>f.id===repForn)?.nome || repForn)}</span></div>
                        <div><span className="text-zinc-500 uppercase font-bold text-[10px] block">Cliente filtro</span><span className="font-medium text-zinc-800">{repCli==='todos' ? 'Todos' : (clientes.find(c=>c.id===repCli)?.nome || repCli)}</span></div>
                        <div><span className="text-zinc-500 uppercase font-bold text-[10px] block">Entradas filtradas</span><span className="font-bold text-zinc-900">{entradasFiltradas.length} notas • R$ {entradasFiltradas.reduce((a,e)=>a+e.total,0).toFixed(2)}</span></div>
                        <div><span className="text-zinc-500 uppercase font-bold text-[10px] block">Saídas filtradas</span><span className="font-bold text-zinc-900">{vendasFiltradas.length} vendas • R$ {vendasFiltradas.reduce((a,v)=>a+v.totalFinal,0).toFixed(2)}</span></div>
                      </div>

                      {/* Content */}
                      <div className="px-6 lg:px-8 py-6 space-y-8">
                        {/* Entradas */}
                        <section>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-[13px] uppercase tracking-wide text-zinc-900 flex items-center gap-2"><FileInput size={14}/> Entradas (Compras)</h3>
                            <span className="text-[11px] bg-zinc-900 text-white px-2.5 py-1 rounded-full">Total R$ {entradasFiltradas.reduce((a,e)=>a+e.total,0).toFixed(2)}</span>
                          </div>
                          <div className="border border-zinc-200 rounded-[10px] overflow-hidden">
                            <table className="w-full text-[12px]">
                              <thead><tr className="text-[10px] uppercase text-zinc-500 bg-zinc-50 border-b text-left"><th className="py-2.5 px-3">Data</th><th>Nº Nota</th><th>Fornecedor</th><th className="text-right pr-3">Valor</th></tr></thead>
                              <tbody>
                                {entradasFiltradas.map(e=>(
                                  <tr key={e.id} className="border-b border-zinc-100 last:border-0">
                                    <td className="py-2 px-3">{e.data}</td>
                                    <td className="font-medium">{e.numNota || e.id.slice(0,6)}</td>
                                    <td className="text-zinc-600">{fornecedores.find(f=>f.id===e.fornId)?.nome || '—'}</td>
                                    <td className="text-right pr-3 font-bold">R$ {e.total.toFixed(2)}</td>
                                  </tr>
                                ))}
                                {entradasFiltradas.length===0 && <tr><td colSpan={4} className="py-6 text-center text-zinc-400">Nenhuma entrada no filtro atual</td></tr>}
                              </tbody>
                            </table>
                          </div>
                        </section>

                        {/* Saidas */}
                        <section>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-[13px] uppercase tracking-wide text-zinc-900 flex items-center gap-2"><FileOutput size={14}/> Saídas (Vendas)</h3>
                            <span className="text-[11px] bg-zinc-900 text-white px-2.5 py-1 rounded-full">Total R$ {vendasFiltradas.reduce((a,v)=>a+v.totalFinal,0).toFixed(2)}</span>
                          </div>
                          <div className="border border-zinc-200 rounded-[10px] overflow-hidden">
                            <table className="w-full text-[12px]">
                              <thead><tr className="text-[10px] uppercase text-zinc-500 bg-zinc-50 border-b text-left"><th className="py-2.5 px-3">Data</th><th>Cliente</th><th className="text-right">Total</th><th>Forma</th><th>Status</th></tr></thead>
                              <tbody>
                                {vendasFiltradas.map(v=>{
                                  const cli = clientes.find(c=>c.id===v.clienteId);
                                  const st = getStatusVenda(v);
                                  return (
                                    <tr key={v.id} className="border-b border-zinc-100 last:border-0">
                                      <td className="py-2 px-3">{v.data}</td>
                                      <td className="font-medium">{cli?.nome || '—'}</td>
                                      <td className="text-right font-bold">R$ {v.totalFinal.toFixed(2)}</td>
                                      <td>{v.forma}</td>
                                      <td><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st==='Quitado'?'bg-green-50 text-green-700 border border-green-200':'bg-amber-50 text-amber-700 border border-amber-200'}`}>{st}</span></td>
                                    </tr>
                                  );
                                })}
                                {vendasFiltradas.length===0 && <tr><td colSpan={5} className="py-6 text-center text-zinc-400">Nenhuma venda no filtro atual</td></tr>}
                              </tbody>
                            </table>
                          </div>
                        </section>

                        {/* Totais Gerais */}
                        <div className="bg-[#111] text-white rounded-[12px] p-5 flex flex-col lg:flex-row justify-between gap-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-white/60 font-bold">Resumo Financeiro Sintético</p>
                            <p className="text-[12px] text-white/70 mt-1">Entradas: R$ {entradasFiltradas.reduce((a,e)=>a+e.total,0).toFixed(2)} • Saídas: R$ {vendasFiltradas.reduce((a,v)=>a+v.totalFinal,0).toFixed(2)}</p>
                          </div>
                          <div className="text-left lg:text-right">
                            <p className="text-[11px] text-white/60 uppercase font-bold">Saldo Período (Saídas - Entradas)</p>
                            <p className="text-[20px] font-bold mt-1">R$ {(vendasFiltradas.reduce((a,v)=>a+v.totalFinal,0) - entradasFiltradas.reduce((a,e)=>a+e.total,0)).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer Doc */}
                      <div className="px-6 lg:px-8 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                        <p className="text-[10px] text-zinc-400">Documento gerado automaticamente pelo sistema THITA STORE • {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</p>
                        <span className="text-[10px] text-zinc-400">Pág. 1/1 • Sintético</span>
                      </div>
                    </div>

                    <div className="px-4 pb-4 flex justify-end gap-2">
                      <button onClick={()=>setShowSinteticoModal(false)} className="h-10 px-5 rounded-[10px] bg-white border border-zinc-200 text-[13px] font-semibold hover:bg-zinc-50">Fechar visualização</button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL ANALÍTICO EXPORTADO - DOCUMENTO COMPLETO */}
              {analiticoExport && (
                <div className="fixed inset-0 bg-black/60 z-[80] flex items-start justify-center p-3 lg:p-6 overflow-y-auto" onClick={()=>setAnaliticoExport(null)}>
                  <div className="bg-[#F6F3EF] rounded-[16px] w-full max-w-[920px] my-4 shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
                    <div className="bg-white m-2 lg:m-4 rounded-[12px] border border-zinc-200 shadow-sm overflow-hidden">
                      {/* Header */}
                      <div className="px-6 lg:px-8 py-6 border-b border-zinc-100 flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-[#FFF6DD] px-3.5 py-1.5 rounded-[10px] border-0"><span className="font-serif text-[18px] text-[#8B6A3A] font-bold">THITA</span></div>
                          <div>
                            <h2 className="font-bold text-[16px] text-zinc-900 leading-tight">
                              {analiticoExport.tipo==='entrada' ? 'Relatório Analítico — Entrada (Completo)' : 'Relatório Analítico — Saída (Completo)'}
                            </h2>
                            <p className="text-[11px] text-zinc-500 mt-0.5">Visualização documento • Gerado em {new Date().toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        <button onClick={()=>setAnaliticoExport(null)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0"><X size={16}/></button>
                      </div>

                      <div className="px-6 lg:px-8 py-6">
                        {analiticoExport.tipo==='entrada' ? (
                          (()=> {
                            const e = analiticoExport.data as Entrada;
                            const forn = fornecedores.find(f=>f.id===e.fornId);
                            return (
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 bg-zinc-50 rounded-[12px] border border-zinc-100 text-[12px]">
                                  <div><span className="text-[10px] uppercase font-bold text-zinc-500 block">Nº Nota</span><span className="font-bold text-[13px]">{e.numNota || e.id}</span></div>
                                  <div><span className="text-[10px] uppercase font-bold text-zinc-500 block">Data</span><span className="font-medium">{e.data}</span></div>
                                  <div><span className="text-[10px] uppercase font-bold text-zinc-500 block">Total</span><span className="font-bold text-[14px]">R$ {e.total.toFixed(2)}</span></div>
                                  <div className="lg:col-span-3 pt-2 border-t border-zinc-200/60 mt-2">
                                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Fornecedor</span>
                                    <span className="font-medium">{forn?.nome || '—'}</span>
                                    <span className="text-zinc-500"> {forn?.cnpj ? `• CNPJ ${forn.cnpj}` : ''} {forn?.endereco ? `• ${forn.endereco}` : ''}</span>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-bold text-[12px] uppercase tracking-wide mb-3">Itens detalhados</h4>
                                  <div className="border border-zinc-200 rounded-[10px] overflow-hidden">
                                    <table className="w-full text-[13px]">
                                      <thead><tr className="text-[10px] uppercase text-zinc-500 bg-zinc-50 border-b text-left"><th className="py-2.5 px-3">Produto</th><th className="text-center">Qtd</th><th className="text-right">Custo un.</th><th className="text-right pr-3">Subtotal</th></tr></thead>
                                      <tbody>
                                        {e.itens.map((it,idx)=>{
                                          const prod = produtos.find(p=>p.id===it.prodId);
                                          return (
                                            <tr key={idx} className="border-b border-zinc-100 last:border-0">
                                              <td className="py-2.5 px-3"><div className="font-medium">{prod?.nome || it.prodId}</div><div className="text-[11px] text-zinc-500">{prod?.cat || ''} • Estoque atual {prod?.estoque ?? '—'}</div></td>
                                              <td className="text-center">{it.qtd}</td>
                                              <td className="text-right">R$ {it.custo.toFixed(2)}</td>
                                              <td className="text-right pr-3 font-bold">R$ {(it.qtd*it.custo).toFixed(2)}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <div className="bg-zinc-900 text-white rounded-[12px] p-4 flex justify-between items-center">
                                  <span className="text-[12px] text-white/70">Total geral da nota</span><span className="font-bold text-[18px]">R$ {e.total.toFixed(2)}</span>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          (()=> {
                            const v = analiticoExport.data as Venda;
                            const cli = clientes.find(c=>c.id===v.clienteId);
                            const parcelas = crediario.filter(cr=>cr.vendaId===v.id).sort((a,b)=>a.num-b.num);
                            return (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-zinc-50 rounded-[12px] border border-zinc-100 text-[12px]">
                                  <div><span className="text-[10px] uppercase font-bold text-zinc-500 block">Data</span><span className="font-medium">{v.data}</span></div>
                                  <div><span className="text-[10px] uppercase font-bold text-zinc-500 block">Cliente</span><span className="font-bold">{cli?.nome || '—'}</span><div className="text-[11px] text-zinc-500">{cli?.doc || ''}</div></div>
                                  <div><span className="text-[10px] uppercase font-bold text-zinc-500 block">Forma / Parcelas</span><span className="font-medium">{v.forma} • {v.parcelas}x</span><div className="text-[11px] text-zinc-500">Venc: {v.venc}</div></div>
                                  <div><span className="text-[10px] uppercase font-bold text-zinc-500 block">Status</span><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 border ${getStatusVenda(v)==='Quitado'?'bg-green-50 text-green-700 border-green-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>{getStatusVenda(v)}</span></div>
                                </div>
                                <div>
                                  <h4 className="font-bold text-[12px] uppercase tracking-wide mb-3">Itens da venda</h4>
                                  <div className="border border-zinc-200 rounded-[10px] overflow-hidden">
                                    <table className="w-full text-[13px]">
                                      <thead><tr className="text-[10px] uppercase text-zinc-500 bg-zinc-50 border-b text-left"><th className="py-2.5 px-3">Produto</th><th className="text-center">Qtd</th><th className="text-right">Preço</th><th className="text-right pr-3">Subtotal</th></tr></thead>
                                      <tbody>
                                        {v.itens.map((it,idx)=>{
                                          const prod = produtos.find(p=>p.id===it.prodId);
                                          return (
                                            <tr key={idx} className="border-b border-zinc-100 last:border-0">
                                              <td className="py-2.5 px-3"><div className="font-medium">{prod?.nome || it.prodId}</div><div className="text-[11px] text-zinc-500">{prod?.cat || ''}</div></td>
                                              <td className="text-center">{it.qtd}</td>
                                              <td className="text-right">R$ {it.preco.toFixed(2)}</td>
                                              <td className="text-right pr-3 font-bold">R$ {(it.qtd*it.preco).toFixed(2)}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div className="mt-3 bg-zinc-50 rounded-[12px] p-4 space-y-1.5 text-[13px] border border-zinc-100">
                                    <div className="flex justify-between"><span className="text-zinc-500">Subtotal</span><span>R$ {v.total.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span className="text-zinc-500">Desconto</span><span className="text-red-600">- R$ {v.desconto.toFixed(2)}</span></div>
                                    {(v.entrega||false) && (v.entregaValor||0)>0 && <div className="flex justify-between"><span className="text-zinc-500 flex items-center gap-1">🚚 Entrega (cliente paga)</span><span className="text-blue-600">+ R$ {(v.entregaValor||0).toFixed(2)}</span></div>}
                                    <div className="flex justify-between font-bold text-[15px] border-t pt-2 mt-2"><span>Total final</span><span>R$ {v.totalFinal.toFixed(2)}</span></div>
                                    {(v.embalagem||false) && (v.embalagemValor||0)>0 && (
                                      <>
                                        <div className="flex justify-between text-[12px]"><span className="text-zinc-500 flex items-center gap-1">📦 Embalagem (custo loja)</span><span className="text-amber-700">- R$ {(v.embalagemValor||0).toFixed(2)}</span></div>
                                        <div className="flex justify-between font-bold text-[13px] text-green-700 border-t pt-2 mt-1"><span>Líquido</span><span>R$ {(v.totalFinal - (v.embalagemValor||0)).toFixed(2)}</span></div>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {v.forma==='Crediário' && (
                                  <div>
                                    <h4 className="font-bold text-[12px] uppercase tracking-wide mb-3">Parcelas crediário detalhado</h4>
                                    <div className="border border-zinc-200 rounded-[10px] overflow-hidden">
                                      <table className="w-full text-[12px]">
                                        <thead><tr className="text-[10px] uppercase text-zinc-500 bg-zinc-50 border-b text-left"><th className="py-2 px-3">Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Dt Pagamento</th></tr></thead>
                                        <tbody>
                                          {parcelas.map(cr=>(
                                            <tr key={cr.id} className="border-b border-zinc-100 last:border-0">
                                              <td className="py-2 px-3 font-medium">{cr.num}ª</td>
                                              <td>{cr.vencimento}</td>
                                              <td>R$ {cr.valor.toFixed(2)}</td>
                                              <td><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cr.status==='pago'?'bg-green-50 text-green-700 border border-green-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>{cr.status==='pago'?'Pago':'Pendente'}</span></td>
                                              <td>{cr.data_pagamento || '—'}</td>
                                            </tr>
                                          ))}
                                          {parcelas.length===0 && <tr><td colSpan={5} className="py-4 text-center text-zinc-400">Nenhuma parcela</td></tr>}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        )}
                      </div>
                      <div className="px-6 lg:px-8 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                        <p className="text-[10px] text-zinc-400">Documento analítico completo • THITA STORE • {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</p>
                        <div className="flex gap-2">
                          <button onClick={()=>setAnaliticoExport(null)} className="h-9 px-4 rounded-[10px] bg-[#111] text-white text-[12px] font-bold">Fechar visualização</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {adminTab==='Configuração' && (
            <div className="max-w-[680px] space-y-6">
              <div className="bg-white rounded-[12px] border border-zinc-200 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <h2 className="font-bold text-[16px] text-zinc-900">Configuração do Sistema</h2>
                <p className="text-[12px] text-zinc-500 mt-1">Altere o usuário e senha de acesso ao painel administrativo. Os dados ficam salvos em localStorage.</p>
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-zinc-100">
                    <div>
                      <label className="text-xs font-medium text-zinc-700 mb-1 block">Usuário atual</label>
                      <input value={configForm.atualUser} onChange={e=>setConfigForm({...configForm, atualUser:e.target.value})} placeholder="Digite seu usuário atual" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-700 mb-1 block">Senha atual</label>
                      <input type="password" value={configForm.atualPass} onChange={e=>setConfigForm({...configForm, atualPass:e.target.value})} placeholder="Digite sua senha atual" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Novo usuário</label>
                    <input value={configForm.novoUser} onChange={e=>setConfigForm({...configForm, novoUser:e.target.value})} placeholder="Novo usuário (deixe vazio para manter)" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Nova senha</label>
                    <input type="password" value={configForm.novaPass} onChange={e=>setConfigForm({...configForm, novaPass:e.target.value})} placeholder="Nova senha (mínimo 4 caracteres)" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Confirmar nova senha</label>
                    <input type="password" value={configForm.confirmarPass} onChange={e=>setConfigForm({...configForm, confirmarPass:e.target.value})} placeholder="Repita a nova senha" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  {configMsg && <div className={`text-[12px] rounded-[10px] px-3 py-2 flex items-center gap-2 ${configMsg.type==='ok'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}><AlertCircle size={14}/>{configMsg.text}</div>}
                  <div className="pt-2">
                    <button onClick={()=>{
                      setConfigMsg(null);
                      const stored = userConfig || { usuario:'admin', senha:'thita2024' };
                      if(!configForm.atualUser || !configForm.atualPass){
                        setConfigMsg({type:'err', text:'Preencha usuário atual e senha atual.'});
                        return;
                      }
                      if(configForm.atualUser !== stored.usuario || configForm.atualPass !== stored.senha){
                        setConfigMsg({type:'err', text:'Usuário atual ou senha atual incorretos.'});
                        return;
                      }
                      if(configForm.novaPass && configForm.novaPass.length < 4){
                        setConfigMsg({type:'err', text:'Nova senha deve ter pelo menos 4 caracteres.'});
                        return;
                      }
                      if(configForm.novaPass && configForm.novaPass !== configForm.confirmarPass){
                        setConfigMsg({type:'err', text:'Confirmação de senha não confere.'});
                        return;
                      }
                      const newUser = configForm.novoUser.trim() || stored.usuario;
                      const newPass = configForm.novaPass.trim() || stored.senha;
                      setUserConfig({ usuario: newUser, senha: newPass });
                      setConfigMsg({type:'ok', text:`Login alterado com sucesso. Novo usuário: ${newUser}`});
                      setConfigForm({ atualUser:'', atualPass:'', novoUser:'', novaPass:'', confirmarPass:'' });
                    }} className="h-11 px-6 rounded-[10px] bg-[#111] text-white text-[13px] font-bold hover:bg-black transition">Salvar Alterações</button>
                    <p className="text-[11px] text-zinc-400 mt-3">Usuário atual salvo: <b className="text-zinc-600">{userConfig.usuario}</b> • Padrão de fábrica: admin / thita2024</p>
                  </div>
                </div>
              </div>

              {/* Dados da Empresa THITA - NOVA SEÇÃO */}
              <div className="bg-white rounded-[16px] border border-zinc-200 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-[8px] bg-[#C80082] text-white flex items-center justify-center">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h2 className="font-bold text-[16px] text-zinc-900">Dados da Empresa</h2>
                    <p className="text-[11px] text-zinc-500">Informações usadas no catálogo e WhatsApp</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Nome da Empresa</label>
                    <input value={empresa.nome} onChange={e=>setEmpresa({...empresa, nome:e.target.value})} placeholder="Ex: THITA STORE" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">CNPJ</label>
                    <input value={empresa.cnpj} onChange={e=>{
                      let v = e.target.value.replace(/\D/g,'');
                      if(v.length<=14){
                        v = v.replace(/^(\d{2})(\d)/,'$1.$2');
                        v = v.replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3');
                        v = v.replace(/\.(\d{3})(\d)/,'.$1/$2');
                        v = v.replace(/(\d{4})(\d)/,'$1-$2');
                      }
                      setEmpresa({...empresa, cnpj:v});
                    }} placeholder="00.000.000/0000-00" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Contato WhatsApp</label>
                    <input value={empresa.contato} onChange={e=>setEmpresa({...empresa, contato:e.target.value})} placeholder="Ex: 75999999999" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                    <p className="text-[10px] text-zinc-500 mt-1">Usado no ícone flutuante do catálogo • só números com DDD</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Rua / Logradouro</label>
                    <input value={empresa.rua} onChange={e=>setEmpresa({...empresa, rua:e.target.value})} placeholder="Ex: Rua das Flores" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Número</label>
                    <input value={empresa.numero} onChange={e=>setEmpresa({...empresa, numero:e.target.value})} placeholder="Ex: 123" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Bairro</label>
                    <input value={empresa.bairro} onChange={e=>setEmpresa({...empresa, bairro:e.target.value})} placeholder="Ex: Centro" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Cidade / Estado</label>
                    <input value={empresa.cidade} onChange={e=>setEmpresa({...empresa, cidade:e.target.value})} placeholder="Ex: Alagoinhas, BA" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
               </div>
                {/* BANNERS SEPARADOS - DESKTOP E CELULAR */}
                <div className="mt-6 pt-6 border-t border-zinc-200">
                  <div className="mb-5">
                    <h3 className="font-semibold text-[15px] text-zinc-900 flex items-center gap-2"><ImageIcon size={16}/> Banners do Catálogo</h3>
                    <p className="text-[12px] text-zinc-500 mt-1 leading-snug">Configure banners diferentes para celular e desktop. O sistema detecta automaticamente o dispositivo do cliente.</p>
                  </div>

                  {/* Toggle tabs - visível sempre, mas em desktop os dois cards ficam lado a lado */}
                  <div className="flex items-center gap-2 mb-5 bg-zinc-50 p-1 rounded-[10px] border border-zinc-100 w-fit">
                    <button
                      type="button"
                      onClick={()=>setBannerConfigTab('mobile')}
                      className={`h-8 px-4 rounded-[8px] text-[12px] font-semibold flex items-center gap-1.5 transition ${bannerConfigTab==='mobile' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      <Smartphone size={14}/> Celular / Tablet
                      <span className="ml-1 bg-[#E8F0FE] text-[#1A56DB] text-[10px] px-1.5 py-0.5 rounded-full border border-[#C2D7FF]">{(empresa.bannersMobile?.length || 0)}/5</span>
                    </button>
                    <button
                      type="button"
                      onClick={()=>setBannerConfigTab('desktop')}
                      className={`h-8 px-4 rounded-[8px] text-[12px] font-semibold flex items-center gap-1.5 transition ${bannerConfigTab==='desktop' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      <Building2 size={14}/> Desktop
                      <span className="ml-1 bg-[#FFF0E8] text-[#B45309] text-[10px] px-1.5 py-0.5 rounded-full border border-[#FED7AA]">{(empresa.bannersDesktop?.length || 0)}/5</span>
                    </button>
                  </div>

                  {/* Inputs ocultos */}
                  <input ref={bannerMobileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleBannerUploadMobile} />
                  <input ref={bannerDesktopRef} type="file" multiple accept="image/*" className="hidden" onChange={handleBannerUploadDesktop} />

                  {/* Grid 2 colunas em desktop, empilhado + condicional em mobile */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* CARD MOBILE */}
                    <div className={`${bannerConfigTab!=='mobile' ? 'hidden lg:flex' : 'flex'} flex-col bg-[#FCFDFF] border border-[#D6E3FF] rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#E8F0FE] border border-[#C2D7FF] text-[#1A56DB] text-[11px] font-semibold">
                            <Smartphone size={13}/> Celular / Tablet
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-2 leading-snug">Tamanho recomendado: <b className="text-zinc-700">562×300</b> (largura x altura)</p>
                        </div>
                        <span className="text-[10px] text-zinc-500 bg-white border border-zinc-200 px-2 py-1 rounded-full">{(empresa.bannersMobile?.length||0)}/5</span>
                      </div>

                      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                        <button
                          type="button"
                          onClick={()=>bannerMobileRef.current?.click()}
                          disabled={(empresa.bannersMobile?.length||0) >=5}
                          className={`relative flex flex-col items-center justify-center gap-2 border border-dashed rounded-[12px] transition bg-white
                            ${(empresa.bannersMobile?.length||0)>=5 ? 'border-zinc-200 opacity-60 cursor-not-allowed' : 'border-[#C2D7FF] hover:bg-[#F0F6FF] cursor-pointer'}`}
                          style={{ aspectRatio:'562 / 300', width:'100%' }}
                        >
                          <div className="w-8 h-8 rounded-full bg-[#E8F0FE] border border-[#C2D7FF] flex items-center justify-center"><Plus size={16} className="text-[#1A56DB]"/></div>
                          <span className="text-[11px] font-medium text-[#1A56DB]">Adicionar</span>
                          <span className="text-[9px] text-zinc-400">562×300</span>
                        </button>
                        {(empresa.bannersMobile||[]).map((b,i)=>(
                          <div key={i} className="group relative bg-white rounded-[12px] overflow-hidden border border-[#E2E8F0]" style={{ aspectRatio:'562 / 300', width:'100%' }}>
                            <img src={b} alt={`Mobile ${i+1}`} onClick={()=>setBannerZoom(b)} className="w-full h-full object-cover cursor-zoom-in" />
                            <button onClick={()=>removerBannerMobile(i)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white border border-zinc-200 shadow flex items-center justify-center text-zinc-500 hover:text-red-600"><X size={12}/></button>
                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">562×300</span>
                          </div>
                        ))}
                      </div>
                      {bannerMobileError && <p className="text-[11px] text-red-600 mt-2 flex items-center gap-1"><AlertCircle size={12}/>{bannerMobileError}</p>}
                      <p className="text-[10px] text-zinc-400 mt-3">Aparece quando o cliente abre no celular/tablet. Se vazio, usa banner antigo como fallback.</p>
                    </div>

                    {/* CARD DESKTOP */}
                    <div className={`${bannerConfigTab!=='desktop' ? 'hidden lg:flex' : 'flex'} flex-col bg-[#FFFBF5] border border-[#FED7AA] rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#FFF7ED] border border-[#FED7AA] text-[#B45309] text-[11px] font-semibold">
                            <Building2 size={13}/> Desktop
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-2 leading-snug">Tamanho recomendado: <b className="text-zinc-700">1200×400 ou 1920×500</b></p>
                        </div>
                        <span className="text-[10px] text-zinc-500 bg-white border border-zinc-200 px-2 py-1 rounded-full">{(empresa.bannersDesktop?.length||0)}/5</span>
                      </div>

                      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                        <button
                          type="button"
                          onClick={()=>bannerDesktopRef.current?.click()}
                          disabled={(empresa.bannersDesktop?.length||0) >=5}
                          className={`relative flex flex-col items-center justify-center gap-2 border border-dashed rounded-[12px] transition bg-white
                            ${(empresa.bannersDesktop?.length||0)>=5 ? 'border-zinc-200 opacity-60 cursor-not-allowed' : 'border-[#FED7AA] hover:bg-[#FFF7ED] cursor-pointer'}`}
                          style={{ aspectRatio:'1200 / 400', width:'100%' }}
                        >
                          <div className="w-8 h-8 rounded-full bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center"><Plus size={16} className="text-[#B45309]"/></div>
                          <span className="text-[11px] font-medium text-[#B45309]">Adicionar</span>
                          <span className="text-[9px] text-zinc-400">1200×400</span>
                        </button>
                        {(empresa.bannersDesktop||[]).map((b,i)=>(
                          <div key={i} className="group relative bg-white rounded-[12px] overflow-hidden border border-[#FDE68A]" style={{ aspectRatio:'1200 / 400', width:'100%' }}>
                            <img src={b} alt={`Desktop ${i+1}`} onClick={()=>setBannerZoom(b)} className="w-full h-full object-cover cursor-zoom-in" />
                            <button onClick={()=>removerBannerDesktop(i)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white border border-zinc-200 shadow flex items-center justify-center text-zinc-500 hover:text-red-600"><X size={12}/></button>
                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">1200×400</span>
                          </div>
                        ))}
                      </div>
                      {bannerDesktopError && <p className="text-[11px] text-red-600 mt-2 flex items-center gap-1"><AlertCircle size={12}/>{bannerDesktopError}</p>}
                      <p className="text-[10px] text-zinc-400 mt-3">Aparece no computador. Mais largo, ocupa toda largura do catálogo.</p>
                    </div>
                  </div>

                  {/* Fallback legacy notice + migration helper */}
                  {(empresa.banners && empresa.banners.length>0) && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-[12px] flex items-start gap-2">
                      <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0"/>
                      <div className="text-[11px] leading-snug">
                        <p className="font-semibold text-amber-800">Banners antigos detectados ({empresa.banners.length})</p>
                        <p className="text-amber-700 mt-1">Esses banners são usados como fallback quando não há banners específicos de celular ou desktop. Você pode mantê-los ou migrar copiando para as novas áreas.</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <button onClick={()=>{
                            if(!empresa.banners?.length) return;
                            setEmpresa((prev:any)=>({
                              ...prev,
                              bannersMobile: [...(prev.bannersMobile||[]), ...prev.banners].slice(0,5),
                              bannersDesktop: [...(prev.bannersDesktop||[]), ...prev.banners].slice(0,5)
                            }));
                          }} className="h-7 px-3 rounded-[8px] bg-white border border-amber-200 text-[11px] font-semibold text-amber-800 hover:bg-amber-100">Copiar para mobile e desktop</button>
                          <button onClick={()=>{
                            if(!confirm('Remover todos banners antigos?')) return;
                            setEmpresa((prev:any)=>({...prev, banners: []}));
                          }} className="h-7 px-3 rounded-[8px] bg-white border border-zinc-200 text-[11px] text-zinc-600 hover:bg-zinc-50">Limpar antigos</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {bannerZoom && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={()=>setBannerZoom(null)}>
                      <div className="bg-white rounded-[16px] p-2 max-w-[95vw] max-h-[92vh] overflow-auto shadow-2xl relative" onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>setBannerZoom(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-md z-10"><X size={14}/></button>
                        <img src={bannerZoom} alt="Zoom banner" style={{ maxWidth:'90vw', maxHeight:'80vh', objectFit:'contain', display:'block', borderRadius:12 }} />
                        <p className="text-[11px] text-zinc-500 text-center mt-2">Preview • clique fora para fechar</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-5 bg-zinc-50 border border-zinc-100 rounded-[12px] p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold text-zinc-800">{empresa.nome || 'THITA'} • {empresa.cidade || '—'}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{empresa.rua ? `${empresa.rua}, ${empresa.numero||'s/n'} - ${empresa.bairro}` : 'Endereço não informado'} • WhatsApp: {empresa.contato||'—'}</p>
                  </div>
                  <a href={waLinkGeneric} target="_blank" rel="noopener" className="h-9 px-4 rounded-[10px] bg-[#25D366] text-white text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#1ebe5d] transition shrink-0">
                    <MessageCircle size={14}/> Testar WhatsApp
                  </a>
                </div>
                <p className="text-[11px] text-zinc-400 mt-3">Dados salvos automaticamente em <b>thita_empresa</b> no localStorage.</p>
              </div>

              {/* Backup e Segurança - FIEL AO PRINT image_52cf7f.png */}
              <div className="bg-white rounded-[16px] border border-zinc-200 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-[8px] bg-zinc-900 text-white flex items-center justify-center">
                    <Database size={16} />
                  </div>
                  <h2 className="font-bold text-[16px] text-zinc-900">Backup e Segurança</h2>
                </div>

                <div className="bg-[#F9F8F6] border border-zinc-100 rounded-[12px] px-4 py-3 flex items-center justify-between mb-5">
                  <span className="text-[12px] font-medium text-zinc-500">Status último backup</span>
                  <span className="text-[13px] font-semibold text-zinc-900">{lastBackupDisplay}</span>
                </div>

                <input ref={restoreInputRef} type="file" accept=".json,application/json" className="hidden" onChange={e=>handleRestoreBackupFile(e.target.files?.[0] || null)} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={handleDownloadBackup} className="h-[48px] rounded-[12px] bg-[#111] text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-black transition">
                    <Download size={16} /> Baixar backup completo
                  </button>
                  <button onClick={()=>restoreInputRef.current?.click()} className="h-[48px] rounded-[12px] bg-white border border-zinc-200 text-zinc-900 text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-zinc-50 transition">
                    <Upload size={16} /> Restaurar backup
                  </button>
                  <button onClick={handleDownloadClientesCSV} className="h-[48px] rounded-[12px] bg-white border border-zinc-200 text-zinc-900 text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-zinc-50 transition">
                    <Download size={16} /> Baixar planilha Clientes
                  </button>
                  <button onClick={handleDownloadFinanceiroCSV} className="h-[48px] rounded-[12px] bg-white border border-zinc-200 text-zinc-900 text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-zinc-50 transition">
                    <Download size={16} /> Baixar planilha Financeiro
                  </button>
                </div>
                {backupMsg && (
                  <div className={`mt-4 text-[12px] rounded-[10px] px-3 py-2.5 flex items-center gap-2 border ${backupMsg.type==='ok'?'bg-green-50 text-green-700 border-green-200':'bg-red-50 text-red-700 border-red-200'}`}>
                    <AlertCircle size={14} /> {backupMsg.text}
                  </div>
                )}
                <p className="text-[11px] text-zinc-400 mt-4 leading-snug">Backup inclui produtos, fornecedores, clientes, entradas, vendas e configurações. Armazene em local seguro.</p>
              </div>
            </div>
          )}
        </div>

        {/* Finalizar modal */}
        {showFinalizar && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[16px] w-full max-w-[420px] p-6 shadow-2xl">
              <h3 className="font-bold text-[16px]">Finalizar Venda</h3>
              <div className="mt-4 space-y-4">
                <div className="bg-zinc-50 rounded-[12px] p-3 text-[13px]">
                  <label className="text-xs font-medium text-zinc-700 mb-1 block">Valor total</label>
                  <p>Total: <b>R$ {carrinhoTotal.toFixed(2)}</b></p>
                  <p className="text-zinc-500">Cliente: {clientes.find(c=>c.id===vendaClienteId)?.nome}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Desconto em R$</label>
                    <input type="number" value={finalForm.desconto} onChange={e=>setFinalForm({...finalForm,desconto:Number(e.target.value)})} placeholder="Ex: 10.00" className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[12px] font-medium cursor-pointer">
                      <input type="checkbox" checked={finalForm.embalagem} onChange={e=>setFinalForm({...finalForm,embalagem:e.target.checked})} className="accent-[#C80082] w-4 h-4" />
                      Uso de Embalagem
                    </label>
                    {finalForm.embalagem && (
                      <input type="number" value={finalForm.embalagemValor} onChange={e=>setFinalForm({...finalForm,embalagemValor:Number(e.target.value)})} placeholder="R$ custo" className="w-full h-9 rounded-[8px] border border-zinc-200 px-2 text-[12px]" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <label className="flex items-center gap-2 text-[12px] font-medium cursor-pointer">
                    <input type="checkbox" checked={finalForm.entrega} onChange={e=>setFinalForm({...finalForm,entrega:e.target.checked})} className="accent-[#C80082] w-4 h-4" />
                    Entrega (cliente paga)
                  </label>
                  {finalForm.entrega && (
                    <input type="number" value={finalForm.entregaValor} onChange={e=>setFinalForm({...finalForm,entregaValor:Number(e.target.value)})} placeholder="R$ entrega" className="w-full h-9 rounded-[8px] border border-zinc-200 px-3 text-[12px]" />
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-700 mb-1 block">Forma de pagamento</label>
                  <select value={finalForm.forma} onChange={e=>setFinalForm({...finalForm,forma:e.target.value})} className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] bg-white focus:outline-none focus:border-zinc-900">
                    <option>À vista</option>
                    <option>Pix</option>
                    <option>Cartão de Débito</option>
                    <option>Cartão de Crédito</option>
                    <option>Crediário</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Número de parcelas</label>
                    {formaSemParcelas ? (
                      <div className="h-10 rounded-[10px] border border-zinc-200 bg-zinc-50 px-3 flex items-center text-[12px] text-zinc-500">Pagamento à vista - sem parcelas</div>
                    ) : (
                      <select value={finalForm.parcelas} onChange={e=>setFinalForm({...finalForm,parcelas:Number(e.target.value)})} className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] bg-white focus:outline-none focus:border-zinc-900">
                        {Array.from({length:10},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}x de R$ {((carrinhoTotal-finalForm.desconto + (finalForm.entrega?finalForm.entregaValor:0))/n).toFixed(2)}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1 block">Data de vencimento</label>
                    <input type="date" value={finalForm.venc} onChange={e=>setFinalForm({...finalForm,venc:e.target.value})} className="w-full h-10 rounded-[10px] border border-zinc-200 px-3 text-[13px] focus:outline-none focus:border-zinc-900" />
                  </div>
                </div>
                <div className="text-[12px] text-zinc-700 bg-[#FFF0F6] border border-[#FFD1E3] rounded-[10px] p-3 space-y-1"><p>Total produtos: R$ {carrinhoTotal.toFixed(2)} - Desconto R$ {finalForm.desconto.toFixed(2)} {finalForm.entrega ? `+ Entrega R$ ${finalForm.entregaValor.toFixed(2)}` : ''} = <b>R$ {(carrinhoTotal - finalForm.desconto + (finalForm.entrega?finalForm.entregaValor:0)).toFixed(2)}</b></p>{finalForm.embalagem && <p className="text-[11px] text-zinc-500">Custo embalagem: R$ {finalForm.embalagemValor.toFixed(2)} → Líquido: R$ {(carrinhoTotal - finalForm.desconto + (finalForm.entrega?finalForm.entregaValor:0) - finalForm.embalagemValor).toFixed(2)}</p>}<p className="text-[11px] text-zinc-500">{finalForm.parcelas>1?` em ${finalForm.parcelas}x de R$ ${((carrinhoTotal-finalForm.desconto + (finalForm.entrega?finalForm.entregaValor:0))/finalForm.parcelas).toFixed(2)}`:''}</p></div>
                <div className="flex gap-2 pt-2">
                  <button onClick={()=>setShowFinalizar(false)} className="flex-1 h-10 rounded-[10px] bg-zinc-100 text-[13px]">Cancelar</button>
                  <button onClick={()=>{
                    const entregaAdd = finalForm.entrega ? finalForm.entregaValor : 0;
                    const totalFinal = Math.max(0, carrinhoTotal - finalForm.desconto + entregaAdd);
                    const venda: Venda = {
                      id:`v${Date.now()}`,
                      clienteId: vendaClienteId,
                      data: new Date().toISOString().slice(0,10),
                      itens: carrinho.map(it=>{ const p=produtos.find(pp=>pp.id===it.prodId); return {prodId:it.prodId,qtd:it.qtd, preco: p?.venda||0}; }),
                      total: carrinhoTotal,
                      desconto: finalForm.desconto,
                      entrega: finalForm.entrega,
                      entregaValor: finalForm.entrega ? finalForm.entregaValor : 0,
                      embalagem: finalForm.embalagem,
                      embalagemValor: finalForm.embalagem ? finalForm.embalagemValor : 0,
                      totalFinal,
                      forma: finalForm.forma,
                      parcelas: finalForm.parcelas,
                      venc: finalForm.venc,
                    };
                    setVendas(prev=>[...prev,venda]);
                    // baixa estoque
                    setProdutos(prev=>prev.map(p=>{ const inCart = carrinho.find(c=>c.prodId===p.id); if(inCart) return {...p, estoque: Math.max(0,p.estoque-inCart.qtd)}; return p; }));
                    // crediario
                    if(finalForm.forma==='Crediário'){
                      const baseDate = finalForm.venc ? new Date(finalForm.venc) : new Date();
                      const novas: Crediario[] = Array.from({length:finalForm.parcelas},(_,i)=>{
                        const d = new Date(baseDate); d.setDate(d.getDate()+30*i);
                        return { id:`cr${Date.now()}_${i}`, vendaId:venda.id, clienteId:vendaClienteId, num:i+1, vencimento: d.toISOString().slice(0,10), valor: totalFinal/finalForm.parcelas, status:'aberto' as const };
                      });
                      setCrediario(prev=>[...prev,...novas]);
                    }
                    setCarrinho([]);
                    setVendaClienteId('');
                    setShowFinalizar(false);
                    setFinalForm({ desconto:0, forma:'À vista', parcelas:1, venc: new Date().toISOString().slice(0,10), embalagem:false, embalagemValor:3.5, entrega:false, entregaValor:10 });
                  }} className="flex-1 h-10 rounded-[10px] bg-[#C80082] text-white font-bold text-[13px]">Confirmar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
