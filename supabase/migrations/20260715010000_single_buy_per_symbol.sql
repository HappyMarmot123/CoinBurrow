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
    if exists (
      select 1
      from public.sim_orders orders
      where orders.account_id = v_account_id
        and orders.symbol = v_symbol
        and orders.side = 'buy'
    ) or exists (
      select 1
      from public.sim_positions positions
      where positions.account_id = v_account_id
        and positions.symbol = v_symbol
    ) then
      raise exception using errcode = 'P0001', message = 'BUY_LIMIT_REACHED';
    end if;

    if v_cash < v_notional then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_CASH';
    end if;

    update public.sim_accounts
    set cash_balance = cash_balance - v_notional,
        updated_at = now()
    where id = v_account_id;

    insert into public.sim_positions (account_id, symbol, quantity, avg_price)
    values (v_account_id, v_symbol, p_quantity, p_price);
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

revoke all on function public.execute_sim_order(uuid, text, text, numeric, numeric)
  from public, anon, authenticated;
grant execute on function public.execute_sim_order(uuid, text, text, numeric, numeric)
  to service_role;
