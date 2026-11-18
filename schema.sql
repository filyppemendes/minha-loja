-- Minha Loja: banco de dados e segurança multiusuário.
-- Execute este arquivo inteiro no SQL Editor do seu projeto Supabase.

create extension if not exists pgcrypto;

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.shop_members (
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  brand text not null check (brand in ('O Boticário','Natura','Avon','Jequiti')),
  category text not null default 'Outros',
  sku text,
  quantity integer not null default 0 check (quantity >= 0),
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  product_name text not null,
  customer_name text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(12,2) not null check (total >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  payment_method text not null default 'fiado',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  received_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.is_shop_member(p_shop_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shop_members
    where shop_id = p_shop_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_shop_member(uuid) from public;
grant execute on function public.is_shop_member(uuid) to authenticated;

alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_payments enable row level security;

drop policy if exists "members can read their shops" on public.shops;
create policy "members can read their shops" on public.shops
for select to authenticated using (public.is_shop_member(id));

drop policy if exists "members can read memberships" on public.shop_members;
create policy "members can read memberships" on public.shop_members
for select to authenticated using (public.is_shop_member(shop_id));

drop policy if exists "members manage products" on public.products;
create policy "members manage products" on public.products
for all to authenticated using (public.is_shop_member(shop_id))
with check (public.is_shop_member(shop_id));

drop policy if exists "members manage customers" on public.customers;
create policy "members manage customers" on public.customers
for all to authenticated using (public.is_shop_member(shop_id))
with check (public.is_shop_member(shop_id));

drop policy if exists "members read sales" on public.sales;
create policy "members read sales" on public.sales
for select to authenticated using (public.is_shop_member(shop_id));

drop policy if exists "members read payments" on public.sale_payments;
create policy "members read payments" on public.sale_payments
for select to authenticated using (public.is_shop_member(shop_id));

create or replace function public.create_shop(p_name text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare v_shop_id uuid;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  if exists (select 1 from public.shop_members where user_id = auth.uid()) then
    raise exception 'Esta conta já participa de uma loja.';
  end if;
  insert into public.shops(name, owner_id)
  values (coalesce(nullif(trim(p_name),''),'Minha Loja'), auth.uid())
  returning id into v_shop_id;
  insert into public.shop_members(shop_id,user_id,role)
  values (v_shop_id,auth.uid(),'owner');
  return v_shop_id;
end;
$$;

create or replace function public.join_shop(p_invite_code text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare v_shop_id uuid;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  select id into v_shop_id from public.shops
  where invite_code = upper(trim(p_invite_code));
  if v_shop_id is null then raise exception 'Código de convite inválido.'; end if;
  insert into public.shop_members(shop_id,user_id,role)
  values (v_shop_id,auth.uid(),'member')
  on conflict do nothing;
  return v_shop_id;
end;
$$;

create or replace function public.record_sale(
  p_shop_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_customer_id uuid default null,
  p_customer_name text default null,
  p_payment_method text default 'fiado',
  p_amount_paid numeric default 0
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare v_product public.products%rowtype;
declare v_total numeric(12,2);
declare v_sale_id uuid;
begin
  if auth.uid() is null or not public.is_shop_member(p_shop_id) then
    raise exception 'Sem autorização para esta loja.';
  end if;
  if p_quantity < 1 then raise exception 'Quantidade inválida.'; end if;
  select * into v_product from public.products
  where id = p_product_id and shop_id = p_shop_id for update;
  if not found then raise exception 'Produto não encontrado.'; end if;
  if v_product.quantity < p_quantity then raise exception 'Estoque insuficiente.'; end if;
  v_total := v_product.sale_price * p_quantity;
  if p_amount_paid < 0 or p_amount_paid > v_total then
    raise exception 'Valor recebido inválido.';
  end if;
  update public.products set quantity = quantity - p_quantity
  where id = p_product_id and shop_id = p_shop_id;
  insert into public.sales(
    shop_id, product_id, customer_id, product_name, customer_name,
    quantity, unit_price, total, amount_paid, payment_method, created_by
  ) values (
    p_shop_id, p_product_id, p_customer_id, v_product.name, p_customer_name,
    p_quantity, v_product.sale_price, v_total, p_amount_paid, p_payment_method, auth.uid()
  ) returning id into v_sale_id;
  if p_amount_paid > 0 then
    insert into public.sale_payments(shop_id,sale_id,amount,received_by)
    values(p_shop_id,v_sale_id,p_amount_paid,auth.uid());
  end if;
  return v_sale_id;
end;
$$;

create or replace function public.register_sale_payment(p_sale_id uuid, p_amount numeric)
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_sale public.sales%rowtype;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found or not public.is_shop_member(v_sale.shop_id) then
    raise exception 'Venda não encontrada ou sem autorização.';
  end if;
  if p_amount <= 0 or p_amount > (v_sale.total - v_sale.amount_paid) then
    raise exception 'Valor de recebimento inválido.';
  end if;
  update public.sales set amount_paid = amount_paid + p_amount where id = p_sale_id;
  insert into public.sale_payments(shop_id,sale_id,amount,received_by)
  values(v_sale.shop_id,p_sale_id,p_amount,auth.uid());
end;
$$;

grant execute on function public.create_shop(text) to authenticated;
grant execute on function public.join_shop(text) to authenticated;
grant execute on function public.record_sale(uuid,uuid,integer,uuid,text,text,numeric) to authenticated;
grant execute on function public.register_sale_payment(uuid,numeric) to authenticated;

-- Acesso às tabelas para usuários autenticados; RLS limita cada consulta à loja da família.
grant select on public.shops, public.shop_members, public.sales, public.sale_payments to authenticated;
grant select, insert, update, delete on public.products, public.customers to authenticated;
