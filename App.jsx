import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Package, Plus, ShoppingCart, Wallet, Users, ChartNoAxesCombined,
  LogOut, Copy, RefreshCw, Search, AlertTriangle, Trash2, CheckCircle2,
  Store, ArrowDownToLine, ArrowUpFromLine, Menu, X
} from 'lucide-react';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = url && key ? createClient(url, key) : null;
const brands = ['O Boticário', 'Natura', 'Avon', 'Jequiti'];
const categories = ['Perfumaria', 'Maquiagem', 'Cuidados com a pele', 'Corpo e banho', 'Cabelos', 'Desodorantes', 'Outros'];
const money = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = d => new Date(d).toLocaleDateString('pt-BR');

function Notice({ message, type='ok' }) {
  if (!message) return null;
  return <div className={`notice ${type}`}>{message}</div>;
}

function Auth({ onReady }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(''); setInfo('');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setInfo('Cadastro iniciado. Confira seu e-mail para confirmar a conta e depois entre no aplicativo.');
        else onReady(data.session.user);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onReady(data.user);
      }
    } catch (e) { setError(e.message || 'Não foi possível autenticar.'); }
    finally { setBusy(false); }
  }
  return <div className="auth-wrap">
    <div className="auth-card">
      <div className="brand-mark"><Store size={25}/></div>
      <p className="eyebrow">CONTROLE DA LOJA</p>
      <h1>Minha Loja</h1>
      <p className="muted">Estoque, vendas e contas a receber em um só lugar.</p>
      <div className="tabs">
        <button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>Entrar</button>
        <button className={mode==='signup'?'active':''} onClick={()=>setMode('signup')}>Criar conta</button>
      </div>
      <form onSubmit={submit} className="stack">
        <label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></label>
        <label>Senha<input type="password" minLength="6" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></label>
        <button className="primary full" disabled={busy}>{busy?'Aguarde...':mode==='login'?'Entrar':'Criar minha conta'}</button>
      </form>
      <Notice message={error} type="error"/><Notice message={info}/>
      <p className="tiny muted">Cada familiar deve criar seu próprio acesso. Não compartilhe a mesma senha.</p>
    </div>
  </div>;
}

function Workspace({ user, onSignOut }) {
  const [shop, setShop] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState('Minha Loja');
  const [invite, setInvite] = useState('');
  const [error, setError] = useState('');

  async function loadMemberships() {
    setLoading(true); setError('');
    const { data, error } = await supabase.from('shop_members').select('shop_id, role, shops(id,name,invite_code)').eq('user_id', user.id);
    if (error) setError(error.message);
    const rows = data || []; setMemberships(rows);
    if (rows.length) setShop(rows[0].shops);
    setLoading(false);
  }
  useEffect(() => { loadMemberships(); }, []);
  async function createShop(e) {
    e.preventDefault(); setError('');
    const { data, error } = await supabase.rpc('create_shop', { p_name: shopName });
    if (error) return setError(error.message);
    await loadMemberships();
  }
  async function joinShop(e) {
    e.preventDefault(); setError('');
    const { error } = await supabase.rpc('join_shop', { p_invite_code: invite.trim().toUpperCase() });
    if (error) return setError(error.message);
    setInvite(''); await loadMemberships();
  }
  if (loading) return <div className="center-page">Carregando seus dados...</div>;
  if (!shop) return <div className="auth-wrap"><div className="auth-card wide">
    <div className="brand-mark"><Store/></div><h1>Vamos configurar sua loja</h1>
    <p className="muted">Crie a loja principal ou entre em uma loja já criada por um familiar.</p>
    <form className="stack" onSubmit={createShop}>
      <label>Nome da loja<input value={shopName} onChange={e=>setShopName(e.target.value)} required/></label>
      <button className="primary full">Criar loja</button>
    </form>
    <div className="or">OU</div>
    <form className="stack" onSubmit={joinShop}>
      <label>Código de convite<input value={invite} onChange={e=>setInvite(e.target.value)} placeholder="Ex.: A1B2C3D4" required/></label>
      <button className="secondary full">Entrar com convite</button>
    </form>
    <Notice message={error} type="error"/>
    <button className="link-btn" onClick={onSignOut}>Sair da conta</button>
  </div></div>;
  return <Dashboard user={user} shop={shop} onSignOut={onSignOut} />;
}

function Dashboard({ user, shop, onSignOut }) {
  const [tab, setTab] = useState('inicio');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [productForm, setProductForm] = useState({name:'',brand:'Natura',category:'Perfumaria',quantity:'1',cost:'0',price:'0',sku:''});
  const [customerForm, setCustomerForm] = useState({name:'',phone:''});
  const [saleForm, setSaleForm] = useState({product_id:'',quantity:'1',customer_id:'',payment_method:'fiado',paid:'0'});
  const [paymentFor, setPaymentFor] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  async function refresh() {
    setBusy(true); setError('');
    const [p,c,s] = await Promise.all([
      supabase.from('products').select('*').eq('shop_id',shop.id).order('name'),
      supabase.from('customers').select('*').eq('shop_id',shop.id).order('name'),
      supabase.from('sales').select('*').eq('shop_id',shop.id).order('created_at',{ascending:false})
    ]);
    const err = p.error || c.error || s.error;
    if (err) setError(err.message);
    setProducts(p.data||[]); setCustomers(c.data||[]); setSales(s.data||[]);
    setBusy(false);
  }
  useEffect(() => { refresh(); }, [shop.id]);
  const totalStock = products.reduce((a,p)=>a+Number(p.quantity),0);
  const stockCost = products.reduce((a,p)=>a+Number(p.quantity)*Number(p.cost_price),0);
  const openDebt = sales.reduce((a,s)=>a+Math.max(0,Number(s.total)-Number(s.amount_paid)),0);
  const filtered = products.filter(p => `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
  const nav = [
    ['inicio','Visão geral',ChartNoAxesCombined],['estoque','Estoque',Package],
    ['vendas','Registrar venda',ShoppingCart],['fiado','Fiado / receber',Wallet],
    ['clientes','Clientes',Users]
  ];
  function flash(msg) { setNotice(msg); setTimeout(()=>setNotice(''),3500); }
  async function addProduct(e) {
    e.preventDefault(); setError('');
    const row = {shop_id:shop.id,name:productForm.name.trim(),brand:productForm.brand,category:productForm.category,quantity:Number(productForm.quantity),cost_price:Number(productForm.cost),sale_price:Number(productForm.price),sku:productForm.sku||null};
    const {error} = await supabase.from('products').insert(row);
    if (error) return setError(error.message);
    setProductForm({name:'',brand:'Natura',category:'Perfumaria',quantity:'1',cost:'0',price:'0',sku:''});
    flash('Produto cadastrado.'); refresh();
  }
  async function adjustStock(p, delta) {
    const next = Number(p.quantity)+delta;
    if (next<0) return;
    const {error} = await supabase.from('products').update({quantity:next}).eq('id',p.id).eq('shop_id',shop.id);
    if (error) setError(error.message); else { flash('Estoque atualizado.'); refresh(); }
  }
  async function deleteProduct(p) {
    if (!confirm(`Excluir ${p.name}?`)) return;
    const {error} = await supabase.from('products').delete().eq('id',p.id).eq('shop_id',shop.id);
    if (error) setError(error.message); else { flash('Produto excluído.'); refresh(); }
  }
  async function addCustomer(e) {
    e.preventDefault();
    const {error} = await supabase.from('customers').insert({shop_id:shop.id,name:customerForm.name.trim(),phone:customerForm.phone||null});
    if (error) setError(error.message); else {setCustomerForm({name:'',phone:''});flash('Cliente cadastrado.');refresh();}
  }
  async function recordSale(e) {
    e.preventDefault(); setError('');
    const p = products.find(x=>x.id===saleForm.product_id);
    if (!p) return setError('Selecione um produto.');
    const qty = Number(saleForm.quantity);
    if (qty<1 || qty>p.quantity) return setError('Quantidade inválida ou maior que o estoque.');
    const customer = customers.find(x=>x.id===saleForm.customer_id);
    const {error} = await supabase.rpc('record_sale',{p_shop_id:shop.id,p_product_id:p.id,p_quantity:qty,p_customer_id:customer?.id||null,p_customer_name:customer?.name||null,p_payment_method:saleForm.payment_method,p_amount_paid:Number(saleForm.paid||0)});
    if (error) return setError(error.message);
    setSaleForm({product_id:'',quantity:'1',customer_id:'',payment_method:'fiado',paid:'0'});
    flash('Venda registrada e estoque atualizado.'); refresh();
  }
  async function registerPayment(e) {
    e.preventDefault();
    const {error} = await supabase.rpc('register_sale_payment',{p_sale_id:paymentFor.id,p_amount:Number(paymentAmount)});
    if (error) return setError(error.message);
    setPaymentFor(null); setPaymentAmount(''); flash('Pagamento registrado.'); refresh();
  }
  async function copyInvite() {
    try { await navigator.clipboard.writeText(shop.invite_code); flash('Código de convite copiado.'); }
    catch { flash(`Código de convite: ${shop.invite_code}`); }
  }
  const pendingSales = sales.filter(s=>Number(s.total)>Number(s.amount_paid));
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'open':''}`}>
      <div className="side-brand"><div className="brand-mark small"><Store size={19}/></div><div><b>Minha Loja</b><small>Gestão familiar</small></div><button className="icon-btn close-nav" onClick={()=>setMobileNav(false)}><X/></button></div>
      <div className="shop-chip"><span className="dot"></span>{shop.name}</div>
      <nav>{nav.map(([id,label,Icon])=><button key={id} className={tab===id?'selected':''} onClick={()=>{setTab(id);setMobileNav(false)}}><Icon size={18}/>{label}</button>)}</nav>
      <div className="side-bottom">
        <div className="invite-box"><small>Convide familiares</small><b>{shop.invite_code}</b><button onClick={copyInvite}><Copy size={14}/> Copiar código</button></div>
        <small className="user-email">{user.email}</small>
        <button className="logout" onClick={onSignOut}><LogOut size={16}/> Sair</button>
      </div>
    </aside>
    {mobileNav && <div className="scrim" onClick={()=>setMobileNav(false)}></div>}
    <main className="main">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={()=>setMobileNav(true)}><Menu/></button><div><p className="eyebrow">PAINEL DE CONTROLE</p><h2>{nav.find(n=>n[0]===tab)?.[1]}</h2></div><button className="icon-btn" onClick={refresh} title="Atualizar"><RefreshCw size={18}/></button></header>
      <div className="content">
        <Notice message={notice}/><Notice message={error} type="error"/>
        {tab==='inicio' && <section>
          <div className="welcome"><div><h1>Olá! 👋</h1><p>Veja como está a sua loja hoje.</p></div><span className="date-pill">{date(new Date())}</span></div>
          <div className="stats">
            <Stat title="Produtos cadastrados" value={products.length} detail={`${totalStock} unidades no estoque`} icon={Package}/>
            <Stat title="Valor investido" value={money(stockCost)} detail="Custo dos itens disponíveis" icon={ArrowDownToLine}/>
            <Stat title="A receber (fiado)" value={money(openDebt)} detail={`${pendingSales.length} vendas pendentes`} icon={Wallet}/>
            <Stat title="Estoque baixo" value={products.filter(p=>p.quantity<=2).length} detail="Produtos com até 2 unidades" icon={AlertTriangle}/>
          </div>
          <div className="panel"><div className="panel-head"><div><h3>Estoque precisando de atenção</h3><p>Produtos com duas unidades ou menos.</p></div><button className="text-btn" onClick={()=>setTab('estoque')}>Ver estoque</button></div>
            {products.filter(p=>p.quantity<=2).length===0?<Empty text="Nenhum produto com estoque baixo."/>:products.filter(p=>p.quantity<=2).map(p=><div className="list-row" key={p.id}><div><b>{p.name}</b><small>{p.brand}</small></div><span className="pill warn">{p.quantity} un.</span></div>)}
          </div>
        </section>}
        {tab==='estoque' && <section>
          <div className="section-head"><div><h1>Estoque</h1><p>Cadastre produtos e atualize as quantidades.</p></div><button className="primary" onClick={()=>document.getElementById('product-form')?.scrollIntoView({behavior:'smooth'})}><Plus size={17}/> Novo produto</button></div>
          <div className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por produto ou marca..."/></div>
          <div className="product-grid">{filtered.map(p=><article className="product-card" key={p.id}><div className="product-top"><span className="brand-label">{p.brand}</span><span className={`pill ${p.quantity<=2?'warn':'good'}`}>{p.quantity} un.</span></div><h3>{p.name}</h3><p>{p.category}{p.sku?` · ${p.sku}`:''}</p><div className="price-line"><span>Custo <b>{money(p.cost_price)}</b></span><span>Venda <b>{money(p.sale_price)}</b></span></div><div className="card-actions"><button className="secondary small-btn" onClick={()=>adjustStock(p,-1)} disabled={p.quantity<=0}>− Saída</button><button className="secondary small-btn" onClick={()=>adjustStock(p,1)}>+ Entrada</button><button className="danger-icon" title="Excluir" onClick={()=>deleteProduct(p)}><Trash2 size={16}/></button></div></article>)}</div>
          {filtered.length===0&&<Empty text="Nenhum produto encontrado."/>}
          <div className="panel form-panel" id="product-form"><h3>Cadastrar produto</h3><form className="form-grid" onSubmit={addProduct}>
            <label className="span2">Nome do produto<input required value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})} placeholder="Ex.: Perfume Lily"/></label>
            <label>Marca<select value={productForm.brand} onChange={e=>setProductForm({...productForm,brand:e.target.value})}>{brands.map(x=><option>{x}</option>)}</select></label>
            <label>Categoria<select value={productForm.category} onChange={e=>setProductForm({...productForm,category:e.target.value})}>{categories.map(x=><option>{x}</option>)}</select></label>
            <label>Quantidade<input type="number" min="0" required value={productForm.quantity} onChange={e=>setProductForm({...productForm,quantity:e.target.value})}/></label>
            <label>Custo (R$)<input type="number" min="0" step="0.01" required value={productForm.cost} onChange={e=>setProductForm({...productForm,cost:e.target.value})}/></label>
            <label>Preço de venda (R$)<input type="number" min="0" step="0.01" required value={productForm.price} onChange={e=>setProductForm({...productForm,price:e.target.value})}/></label>
            <label>Código (opcional)<input value={productForm.sku} onChange={e=>setProductForm({...productForm,sku:e.target.value})}/></label>
            <button className="primary span2"><Plus size={16}/> Salvar produto</button>
          </form></div>
        </section>}
        {tab==='vendas' && <section>
          <div className="section-head"><div><h1>Registrar venda</h1><p>A quantidade vendida será descontada do estoque.</p></div></div>
          <div className="panel form-panel narrow"><form className="stack" onSubmit={recordSale}>
            <label>Produto<select required value={saleForm.product_id} onChange={e=>setSaleForm({...saleForm,product_id:e.target.value})}><option value="">Selecione um produto</option>{products.filter(p=>p.quantity>0).map(p=><option value={p.id}>{p.name} — {p.quantity} disponíveis · {money(p.sale_price)}</option>)}</select></label>
            <label>Quantidade<input type="number" min="1" required value={saleForm.quantity} onChange={e=>setSaleForm({...saleForm,quantity:e.target.value})}/></label>
            <label>Cliente (opcional)<select value={saleForm.customer_id} onChange={e=>setSaleForm({...saleForm,customer_id:e.target.value})}><option value="">Venda sem cliente cadastrado</option>{customers.map(c=><option value={c.id}>{c.name}</option>)}</select></label>
            <label>Forma de pagamento<select value={saleForm.payment_method} onChange={e=>setSaleForm({...saleForm,payment_method:e.target.value})}><option value="fiado">Fiado</option><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="cartao">Cartão</option><option value="outro">Outro</option></select></label>
            <label>Valor recebido agora (R$)<input type="number" min="0" step="0.01" value={saleForm.paid} onChange={e=>setSaleForm({...saleForm,paid:e.target.value})}/></label>
            <button className="primary full"><ShoppingCart size={17}/> Confirmar venda</button>
          </form></div>
          <div className="panel"><h3>Vendas recentes</h3>{sales.slice(0,10).map(s=><div className="list-row"><div><b>{s.product_name}</b><small>{s.customer_name||'Sem cliente'} · {date(s.created_at)}</small></div><b>{money(s.total)}</b></div>)}{sales.length===0&&<Empty text="Nenhuma venda registrada."/>}</div>
        </section>}
        {tab==='fiado' && <section>
          <div className="section-head"><div><h1>Fiado e recebimentos</h1><p>Acompanhe os valores que ainda faltam receber.</p></div></div>
          <div className="debt-total"><span>Total em aberto</span><b>{money(openDebt)}</b></div>
          <div className="panel"><h3>Contas pendentes</h3>{pendingSales.map(s=><div className="debt-row"><div className="debt-info"><b>{s.customer_name||'Cliente não informado'}</b><small>{s.product_name} · {date(s.created_at)}</small><span>Venda: {money(s.total)} · Pago: {money(s.amount_paid)}</span></div><div className="debt-right"><b>{money(Number(s.total)-Number(s.amount_paid))}</b><button className="primary small-btn" onClick={()=>{setPaymentFor(s);setPaymentAmount('')}}>Receber</button></div></div>)}{pendingSales.length===0&&<Empty text="Nenhuma conta pendente."/>}</div>
          {paymentFor&&<div className="modal-backdrop"><div className="modal"><button className="modal-x" onClick={()=>setPaymentFor(null)}><X/></button><h3>Registrar recebimento</h3><p className="muted">{paymentFor.customer_name||'Cliente'} · saldo {money(paymentFor.total-paymentFor.amount_paid)}</p><form className="stack" onSubmit={registerPayment}><label>Valor recebido (R$)<input type="number" min="0.01" max={paymentFor.total-paymentFor.amount_paid} step="0.01" required value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)}/></label><button className="primary full">Confirmar recebimento</button></form></div></div>}
        </section>}
        {tab==='clientes' && <section>
          <div className="section-head"><div><h1>Clientes</h1><p>Cadastre clientes para associar às vendas.</p></div></div>
          <div className="panel form-panel"><form className="form-grid" onSubmit={addCustomer}><label>Nome<input required value={customerForm.name} onChange={e=>setCustomerForm({...customerForm,name:e.target.value})} placeholder="Nome do cliente"/></label><label>Telefone (opcional)<input value={customerForm.phone} onChange={e=>setCustomerForm({...customerForm,phone:e.target.value})} placeholder="(21) 99999-9999"/></label><button className="primary span2"><Plus size={16}/> Cadastrar cliente</button></form></div>
          <div className="panel"><h3>Lista de clientes</h3>{customers.map(c=><div className="list-row"><div><b>{c.name}</b><small>{c.phone||'Telefone não informado'}</small></div><span className="pill neutral">{sales.filter(s=>s.customer_id===c.id).length} vendas</span></div>)}{customers.length===0&&<Empty text="Nenhum cliente cadastrado."/>}</div>
        </section>}
        <footer className="footer">Minha Loja · Acesso familiar protegido por conta individual</footer>
      </div>
    </main>
  </div>;
}

function Stat({title,value,detail,icon:Icon}) { return <div className="stat-card"><div className="stat-icon"><Icon size={19}/></div><p>{title}</p><strong>{value}</strong><small>{detail}</small></div>; }
function Empty({text}) { return <div className="empty"><Package size={24}/><p>{text}</p></div>; }

export default function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [configError, setConfigError] = useState(false);
  useEffect(() => {
    if (!supabase) { setConfigError(true); setChecking(false); return; }
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setChecking(false);});
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  }, []);
  async function signOut() { await supabase.auth.signOut(); setSession(null); }
  if (checking) return <div className="center-page">Abrindo Minha Loja...</div>;
  if (configError) return <div className="center-page"><div className="auth-card"><h1>Configuração pendente</h1><p>Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY conforme o arquivo README.</p></div></div>;
  return session ? <Workspace user={session.user} onSignOut={signOut}/> : <Auth onReady={()=>supabase.auth.getSession().then(({data})=>setSession(data.session))}/>;
}
