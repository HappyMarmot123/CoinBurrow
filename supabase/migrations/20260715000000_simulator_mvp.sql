create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  starting_cash numeric(20, 2) not null default 100000000 check (starting_cash > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sim_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  cash_balance numeric(20, 2) not null check (cash_balance >= 0),
  mode text not null default 'paper' check (mode = 'paper'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sim_positions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.sim_accounts(id) on delete cascade,
  symbol text not null check (symbol in ('BTC', 'ETH')),
  quantity numeric(28, 8) not null check (quantity > 0),
  avg_price numeric(20, 2) not null check (avg_price > 0),
  updated_at timestamptz not null default now(),
  unique (account_id, symbol)
);

create table if not exists public.sim_orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.sim_accounts(id) on delete cascade,
  symbol text not null check (symbol in ('BTC', 'ETH')),
  side text not null check (side in ('buy', 'sell')),
  quantity numeric(28, 8) not null check (quantity > 0),
  price numeric(20, 2) not null check (price > 0),
  executed_at timestamptz not null default now(),
  status text not null default 'filled' check (status = 'filled')
);

create index if not exists sim_orders_account_executed_idx
  on public.sim_orders (account_id, executed_at desc);

alter table public.profiles enable row level security;
alter table public.sim_accounts enable row level security;
alter table public.sim_positions enable row level security;
alter table public.sim_orders enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists accounts_select_own on public.sim_accounts;
create policy accounts_select_own on public.sim_accounts
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists positions_select_own on public.sim_positions;
create policy positions_select_own on public.sim_positions
  for select to authenticated
  using (
    exists (
      select 1
      from public.sim_accounts account
      where account.id = sim_positions.account_id
        and account.user_id = auth.uid()
    )
  );

drop policy if exists orders_select_own on public.sim_orders;
create policy orders_select_own on public.sim_orders
  for select to authenticated
  using (
    exists (
      select 1
      from public.sim_accounts account
      where account.id = sim_orders.account_id
        and account.user_id = auth.uid()
    )
  );

create or replace function public.ensure_sim_account(p_user_id uuid)
returns table (
  account_id uuid,
  starting_cash numeric,
  cash_balance numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'INVALID_USER';
  end if;

  insert into public.profiles (id)
  values (p_user_id)
  on conflict (id) do nothing;

  insert into public.sim_accounts (user_id, cash_balance)
  select profile.id, profile.starting_cash
  from public.profiles profile
  where profile.id = p_user_id
  on conflict (user_id) do nothing;

  return query
  select account.id, profile.starting_cash, account.cash_balance
  from public.sim_accounts account
  join public.profiles profile on profile.id = account.user_id
  where account.user_id = p_user_id;
end;
$$;

create or replace function public.execute_sim_order(
  p_user_id uuid,
  p_symbol text,
  p_side text,
  p_quantity numeric,
  p_price numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_id uuid;
  v_cash numeric;
  v_position public.sim_positions%rowtype;
  v_notional numeric;
  v_symbol text := upper(trim(p_symbol));
  v_side text := lower(trim(p_side));
begin
  if v_symbol not in ('BTC', 'ETH') then
    raise exception using errcode = '22023', message = 'INVALID_SYMBOL';
  end if;
  if v_side not in ('buy', 'sell') then
    raise exception using errcode = '22023', message = 'INVALID_SIDE';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > 1000000 then
    raise exception using errcode = '22023', message = 'INVALID_QUANTITY';
  end if;
  if p_price is null or p_price <= 0 then
    raise exception using errcode = '22023', message = 'INVALID_PRICE';
  end if;

  perform public.ensure_sim_account(p_user_id);

  select account.id, account.cash_balance
  into v_account_id, v_cash
  from public.sim_accounts account
  where account.user_id = p_user_id
  for update;

  if v_account_id is null then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_NOT_FOUND';
  end if;

  v_notional := round(p_quantity * p_price, 2);

  if v_side = 'buy' then
    if v_cash < v_notional then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_CASH';
    end if;

    update public.sim_accounts
    set cash_balance = cash_balance - v_notional,
        updated_at = now()
    where id = v_account_id;

    insert into public.sim_positions (account_id, symbol, quantity, avg_price)
    values (v_account_id, v_symbol, p_quantity, p_price)
    on conflict (account_id, symbol) do update
    set avg_price = round(
          (
            public.sim_positions.quantity * public.sim_positions.avg_price
            + excluded.quantity * excluded.avg_price
          ) / (public.sim_positions.quantity + excluded.quantity),
          2
        ),
        quantity = public.sim_positions.quantity + excluded.quantity,
        updated_at = now();
  else
    select position.*
    into v_position
    from public.sim_positions position
    where position.account_id = v_account_id
      and position.symbol = v_symbol
    for update;

    if v_position.id is null or v_position.quantity < p_quantity then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_POSITION';
    end if;

    update public.sim_accounts
    set cash_balance = cash_balance + v_notional,
        updated_at = now()
    where id = v_account_id;

    if v_position.quantity = p_quantity then
      delete from public.sim_positions where id = v_position.id;
    else
      update public.sim_positions
      set quantity = quantity - p_quantity,
          updated_at = now()
      where id = v_position.id;
    end if;
  end if;

  insert into public.sim_orders (account_id, symbol, side, quantity, price)
  values (v_account_id, v_symbol, v_side, p_quantity, p_price);
end;
$$;

create or replace function public.reset_simulator(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_id uuid;
  v_starting_cash numeric;
begin
  perform public.ensure_sim_account(p_user_id);

  select account.id, profile.starting_cash
  into v_account_id, v_starting_cash
  from public.sim_accounts account
  join public.profiles profile on profile.id = account.user_id
  where account.user_id = p_user_id
  for update of account;

  delete from public.sim_orders where account_id = v_account_id;
  delete from public.sim_positions where account_id = v_account_id;

  update public.sim_accounts
  set cash_balance = v_starting_cash,
      updated_at = now()
  where id = v_account_id;
end;
$$;

revoke all on function public.ensure_sim_account(uuid) from public, anon, authenticated;
revoke all on function public.execute_sim_order(uuid, text, text, numeric, numeric) from public, anon, authenticated;
revoke all on function public.reset_simulator(uuid) from public, anon, authenticated;

grant execute on function public.ensure_sim_account(uuid) to service_role;
grant execute on function public.execute_sim_order(uuid, text, text, numeric, numeric) to service_role;
grant execute on function public.reset_simulator(uuid) to service_role;

