-- Auto Store Closing & Operational Compliance
-- Adds fields, functions, and triggers for automatic store closing,
-- late/early opening detection, and operational compliance tracking.

-- ── 1. Add compliance columns to store_shifts ──

alter table public.store_shifts
  add column if not exists auto_closed boolean not null default false,
  add column if not exists closing_reason text
    check (closing_reason in ('MANUAL', 'AUTO_CLOSE', 'SYSTEM')),
  add column if not exists scheduled_open_time time,
  add column if not exists scheduled_close_time time,
  add column if not exists late_open_minutes integer,
  add column if not exists early_open_minutes integer,
  add column if not exists late_close_minutes integer;

comment on column public.store_shifts.auto_closed is 'True if this shift was closed automatically by the system';
comment on column public.store_shifts.closing_reason is 'Reason for closing: MANUAL, AUTO_CLOSE, or SYSTEM';
comment on column public.store_shifts.scheduled_open_time is 'Business hours scheduled open time for this shift';
comment on column public.store_shifts.scheduled_close_time is 'Business hours scheduled close time for this shift';
comment on column public.store_shifts.late_open_minutes is 'Minutes the store opened after scheduled time';
comment on column public.store_shifts.early_open_minutes is 'Minutes the store opened before scheduled time';
comment on column public.store_shifts.late_close_minutes is 'Minutes the store closed after scheduled time';

-- ── 2. Auto-close config defaults (brand_settings.metadata.auto_close_settings) ──
-- This is a JSONB field managed by the application layer.

-- ── 3. Function: get_branch_scheduled_time ──
-- Resolves the scheduled open/close time for a branch on a given day.

create or replace function public.get_branch_scheduled_hours(
  p_brand_id integer,
  p_branch_id uuid,
  p_day_of_week text default null -- 'monday','tuesday',etc; defaults to current day
) returns jsonb
language plpgsql
security definer
stable
as $func$
declare
  v_business_hours jsonb;
  v_day text;
  v_result jsonb;
begin
  -- Resolve day of week
  v_day := coalesce(p_day_of_week, lower(trim(to_char(now(), 'Day'))));

  -- Get business hours from brand_settings
  select business_hours into v_business_hours
  from public.brand_settings
  where brand_id = p_brand_id;

  if v_business_hours is null or v_business_hours = '{}'::jsonb then
    return null;
  end if;

  -- Try to get branch-specific schedule, fall back to "__DEFAULT__"
  v_result := v_business_hours -> 'branches' -> p_branch_id::text -> v_day;
  if v_result is null or v_result = 'null'::jsonb then
    v_result := v_business_hours -> 'branches' -> '__DEFAULT__' -> v_day;
  end if;

  if v_result is null or v_result = 'null'::jsonb then
    return null;
  end if;

  return jsonb_build_object(
    'is_open', coalesce((v_result ->> 'isOpen')::boolean, true),
    'open', v_result ->> 'open',
    'close', v_result ->> 'close'
  );
end;
$func$;

comment on function public.get_branch_scheduled_hours is
  'Returns { is_open, open, close } for a branch on a given day from brand_settings.business_hours.';

-- ── 4. Enhanced open_store_shift with compliance tracking ──

drop function if exists public.open_store_shift(p_brand_id integer, p_branch_id uuid, p_opening_cash numeric, p_opening_notes text, p_opened_by uuid, p_metadata jsonb);

create function public.open_store_shift(
  p_brand_id integer,
  p_branch_id uuid,
  p_opening_cash numeric,
  p_opening_notes text default null,
  p_opened_by uuid default null,
  p_metadata jsonb default '{}'
) returns jsonb
language plpgsql
security definer
as $func$
declare
  v_cash_account_id   uuid;
  v_prev_shift        record;
  v_opening_diff      numeric(14,2);
  v_shift_number      text;
  v_shift_id          uuid;
  v_scheduled_hours   jsonb;
  v_open_time         time;
  v_close_time        time;
  v_actual_open_time  time;
  v_late_min          integer;
  v_early_min         integer;
  v_audit_desc        text;
  v_audit_action      text;
  v_audit_details     jsonb;
begin
  -- Validate brand
  perform 1 from public.brands where id = p_brand_id and lower(status) = 'active';
  if not found then
    raise exception 'Brand % not found or deleted', p_brand_id using errcode = 'P0002';
  end if;

  -- Validate branch
  perform 1 from public.branches
  where id = p_branch_id and brand_id = p_brand_id and deleted_at is null;
  if not found then
    raise exception 'Branch % not found, deleted, or does not belong to brand %',
      p_branch_id, p_brand_id using errcode = 'P0002';
  end if;

  -- Ensure no OPEN shift exists
  perform 1 from public.store_shifts
  where branch_id = p_branch_id and shift_status = 'OPEN';
  if found then
    raise exception 'Branch % already has an OPEN shift. Close it before opening a new one.',
      p_branch_id using errcode = 'P0004';
  end if;

  -- Resolve CASH payment account for this branch
  select id into v_cash_account_id
  from public.payment_accounts
  where brand_id = p_brand_id
    and branch_id = p_branch_id
    and type = 'CASH'
    and is_cash_account = true
    and is_active = true
  order by is_system_account desc, is_default_receiving_account desc, id
  limit 1;

  if not found then
    raise exception 'No active CASH payment account found for branch %', p_branch_id
      using errcode = 'P0002';
  end if;

  -- Find previous closed shift
  select counted_closing_cash into v_prev_shift
  from public.store_shifts
  where branch_id = p_branch_id and shift_status = 'CLOSED'
  order by closed_at desc
  limit 1;

  -- Calculate opening difference
  v_opening_diff := p_opening_cash - coalesce(v_prev_shift.counted_closing_cash, 0);

  -- Get scheduled hours for compliance tracking
  v_scheduled_hours := public.get_branch_scheduled_hours(p_brand_id, p_branch_id);
  if v_scheduled_hours is not null and (v_scheduled_hours ->> 'is_open')::boolean then
    v_open_time := (v_scheduled_hours ->> 'open')::time;
    v_close_time := (v_scheduled_hours ->> 'close')::time;
    v_actual_open_time := now()::time;
    v_late_min := case when v_actual_open_time > v_open_time
      then extract(epoch from (v_actual_open_time - v_open_time)) / 60
      else 0
    end;
    v_early_min := case when v_actual_open_time < v_open_time
      then extract(epoch from (v_open_time - v_actual_open_time)) / 60
      else 0
    end;
  end if;

  -- Generate shift number
  v_shift_number := public.generate_store_shift_number(p_brand_id);

  -- Insert shift with compliance data
  insert into public.store_shifts (
    brand_id, branch_id, cash_account_id,
    shift_number, shift_status,
    opening_cash, previous_closing_cash, opening_difference,
    opened_at, opened_by, opening_notes,
    scheduled_open_time, scheduled_close_time,
    late_open_minutes, early_open_minutes,
    metadata, created_at, updated_at
  ) values (
    p_brand_id, p_branch_id, v_cash_account_id,
    v_shift_number, 'OPEN',
    p_opening_cash, v_prev_shift.counted_closing_cash, v_opening_diff,
    now(), p_opened_by, p_opening_notes,
    v_open_time, v_close_time,
    v_late_min, v_early_min,
    p_metadata, now(), now()
  )
  returning id into v_shift_id;

  -- Determine audit event type
  if v_late_min > 0 then
    v_audit_action := 'STORE_LATE_OPEN';
    v_audit_desc := 'Store opened ' || v_late_min::text || ' minutes later than scheduled '
      || v_open_time::text || '. Actual opening: ' || v_actual_open_time::text;
  elsif v_early_min > 0 then
    v_audit_action := 'STORE_EARLY_OPEN';
    v_audit_desc := 'Store opened ' || v_early_min::text || ' minutes earlier than scheduled '
      || v_open_time::text || '. Actual opening: ' || v_actual_open_time::text;
  else
    v_audit_action := 'STORE_SHIFT_OPENED';
    v_audit_desc := 'Opened shift ' || v_shift_number || ' with opening cash ' || p_opening_cash::text;
  end if;

  v_audit_details := jsonb_build_object(
    'shift_number', v_shift_number,
    'opening_cash', p_opening_cash,
    'scheduled_open_time', v_open_time,
    'actual_open_time', v_actual_open_time,
    'late_minutes', v_late_min,
    'early_minutes', v_early_min
  );

  -- Audit log
  insert into public.audit_logs (brand_id, actor_id, action, target_type, target_id, target_label, description, details, created_at)
  values (
    p_brand_id, p_opened_by, v_audit_action, 'store_shifts', v_shift_id, v_shift_number,
    v_audit_desc,
    v_audit_details,
    now()
  );

  return jsonb_build_object(
    'shift_id', v_shift_id,
    'shift_number', v_shift_number,
    'status', 'OPEN',
    'opening_cash', p_opening_cash,
    'opening_difference', v_opening_diff,
    'late_open_minutes', v_late_min,
    'early_open_minutes', v_early_min,
    'scheduled_open_time', v_open_time,
    'scheduled_close_time', v_close_time
  );
end;
$func$;

comment on function public.open_store_shift is
  'Opens a new store shift with compliance tracking for late/early opening detection.';

-- ── 5. Enhanced close_store_shift with compliance tracking ──

create or replace function public.close_store_shift(
  p_shift_id uuid,
  p_counted_closing_cash numeric,
  p_closing_notes text default null,
  p_closed_by uuid default null,
  p_metadata jsonb default '{}'
) returns jsonb
language plpgsql
security definer
as $func$
declare
  v_shift             record;
  v_expected_cash     numeric(14,2);
  v_cash_diff         numeric(14,2);
  v_scheduled_close   time;
  v_actual_close      time;
  v_late_close_min    integer;
  v_audit_action      text;
  v_audit_desc        text;
  v_audit_details     jsonb;
  v_auto_closed       boolean;
  v_closing_reason    text;
begin
  -- Lock shift FOR UPDATE
  select * into v_shift
  from public.store_shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'Shift % not found', p_shift_id using errcode = 'P0002';
  end if;

  if v_shift.shift_status != 'OPEN' then
    raise exception 'Shift % is not OPEN (current status: %). Cannot close.',
      p_shift_id, v_shift.shift_status using errcode = 'P0004';
  end if;

  if p_counted_closing_cash < 0 then
    raise exception 'Counted closing cash cannot be negative, got %', p_counted_closing_cash
      using errcode = '22023';
  end if;

  -- Calculate expected cash
  v_expected_cash := public.calculate_shift_expected_cash(p_shift_id);
  v_cash_diff := p_counted_closing_cash - v_expected_cash;

  -- Determine closing reason and auto_closed flag
  v_auto_closed := coalesce((p_metadata ->> 'auto_closed')::boolean, false);
  v_closing_reason := case
    when v_auto_closed then 'AUTO_CLOSE'
    else 'MANUAL'
  end;

  -- Calculate late close minutes
  v_scheduled_close := v_shift.scheduled_close_time;
  if v_scheduled_close is not null then
    v_actual_close := now()::time;
    v_late_close_min := case when v_actual_close > v_scheduled_close
      then extract(epoch from (v_actual_close - v_scheduled_close)) / 60
      else 0
    end;
  end if;

  -- Close shift
  update public.store_shifts
  set shift_status = 'CLOSED',
      expected_closing_cash = v_expected_cash,
      counted_closing_cash = p_counted_closing_cash,
      cash_difference = v_cash_diff,
      closed_at = now(),
      closed_by = p_closed_by,
      closing_notes = v_closing_reason || case when p_closing_notes is not null then ': ' || p_closing_notes else '' end,
      metadata = metadata || p_metadata,
      updated_at = now(),
      auto_closed = v_auto_closed,
      closing_reason = v_closing_reason,
      late_close_minutes = v_late_close_min
  where id = p_shift_id;

  -- Determine audit event type
  if v_auto_closed then
    v_audit_action := 'STORE_AUTO_CLOSED';
    v_audit_desc := 'Store automatically closed after exceeding operational hours. '
      || 'Scheduled close: ' || v_scheduled_close::text
      || '. Actual close: ' || v_actual_close::text
      || '. Late by ' || v_late_close_min::text || ' minutes.';
  elsif v_late_close_min > 0 then
    v_audit_action := 'STORE_LATE_CLOSE';
    v_audit_desc := 'Store closed ' || v_late_close_min::text
      || ' minutes after scheduled closing time ' || v_scheduled_close::text || '.';
  else
    v_audit_action := 'STORE_SHIFT_CLOSED';
    v_audit_desc := 'Closed shift ' || v_shift.shift_number || ' counted cash '
      || p_counted_closing_cash::text || ' difference ' || v_cash_diff::text;
  end if;

  v_audit_details := jsonb_build_object(
    'shift_number', v_shift.shift_number,
    'expected_closing_cash', v_expected_cash,
    'counted_closing_cash', p_counted_closing_cash,
    'cash_difference', v_cash_diff,
    'scheduled_close_time', v_scheduled_close,
    'actual_close_time', v_actual_close,
    'late_close_minutes', v_late_close_min,
    'auto_closed', v_auto_closed,
    'closing_reason', v_closing_reason,
    'grace_period_minutes', (p_metadata ->> 'grace_period_minutes')::integer
  );

  -- Audit log
  insert into public.audit_logs (brand_id, actor_id, action, target_type, target_id, target_label, description, details, created_at)
  values (
    v_shift.brand_id, p_closed_by, v_audit_action, 'store_shifts', v_shift.id, v_shift.shift_number,
    v_audit_desc,
    v_audit_details,
    now()
  );

  return jsonb_build_object(
    'shift_id', v_shift.id,
    'shift_number', v_shift.shift_number,
    'status', 'CLOSED',
    'opening_cash', v_shift.opening_cash,
    'expected_closing_cash', v_expected_cash,
    'counted_closing_cash', p_counted_closing_cash,
    'cash_difference', v_cash_diff,
    'duration_minutes', extract(epoch from (now() - v_shift.opened_at)) / 60,
    'auto_closed', v_auto_closed,
    'closing_reason', v_closing_reason,
    'late_close_minutes', v_late_close_min
  );
end;
$func$;

comment on function public.close_store_shift is
  'Closes a shift with compliance tracking for late closing and auto-close detection.';

-- ── 6. Function: check_and_auto_close_shifts ──
-- Called by scheduler to auto-close shifts that exceed business hours + grace period.

create or replace function public.check_and_auto_close_shifts()
returns table (
  shift_id uuid,
  branch_id uuid,
  branch_name text,
  shift_number text,
  brand_id integer,
  brand_name text,
  scheduled_close_time time,
  actual_close_time time,
  late_minutes integer,
  grace_period_minutes integer,
  auto_closed boolean
)
language plpgsql
security definer
as $func$
declare
  v_shift record;
  v_settings jsonb;
  v_business_hours jsonb;
  v_day text;
  v_today_schedule jsonb;
  v_scheduled_close time;
  v_grace_period int;
  v_is_auto_close_enabled boolean;
  v_late_minutes int;
  v_now_time time;
  v_branch_name text;
  v_brand_name text;
begin
  v_day := lower(trim(to_char(now(), 'Day')));
  v_now_time := now()::time;

  for v_shift in
    select
      s.id, s.branch_id, s.shift_number, s.brand_id,
      s.scheduled_close_time,
      bs.business_hours,
      bs.metadata,
      b.name as branch_name,
      br.name as brand_name
    from public.store_shifts s
    join public.branches b on b.id = s.branch_id and b.deleted_at is null
    join public.brands br on br.id = s.brand_id and lower(br.status) = 'active'
    left join public.brand_settings bs on bs.brand_id = s.brand_id
    where s.shift_status = 'OPEN'
  loop
    -- Get auto-close settings from metadata
    v_is_auto_close_enabled := false;
    v_grace_period := 120; -- default 2 hours

    if v_shift.metadata is not null then
      v_settings := v_shift.metadata -> 'auto_close_settings';
      if v_settings is not null then
        v_is_auto_close_enabled := coalesce((v_settings ->> 'enabled')::boolean, false);
        v_grace_period := coalesce((v_settings ->> 'grace_period_minutes')::integer, 120);
      end if;
    end if;

    if not v_is_auto_close_enabled then
      continue;
    end if;

    -- Use shift's scheduled_close_time if available, or resolve from business_hours
    v_scheduled_close := v_shift.scheduled_close_time;

    if v_scheduled_close is null and v_shift.business_hours is not null then
      v_today_schedule := v_shift.business_hours -> 'branches' -> v_shift.branch_id::text -> v_day;
      if (v_today_schedule is null or v_today_schedule = 'null'::jsonb) then
        v_today_schedule := v_shift.business_hours -> 'branches' -> '__DEFAULT__' -> v_day;
      end if;
      if v_today_schedule is not null and (v_today_schedule ->> 'isOpen')::boolean then
        v_scheduled_close := (v_today_schedule ->> 'close')::time;
      end if;
    end if;

    if v_scheduled_close is null then
      continue; -- No schedule defined, skip
    end if;

    -- Check if current time exceeds scheduled close + grace period
    v_late_minutes := extract(epoch from (v_now_time - v_scheduled_close)) / 60;
    if v_late_minutes >= v_grace_period then
      -- Auto-close this shift with expected cash
      perform public.close_store_shift(
        p_shift_id => v_shift.id,
        p_counted_closing_cash => public.calculate_shift_expected_cash(v_shift.id),
        p_closing_notes => null,
        p_closed_by => null,
        p_metadata => jsonb_build_object(
          'auto_closed', true,
          'grace_period_minutes', v_grace_period,
          'late_minutes', v_late_minutes,
          'scheduled_close', v_scheduled_close::text,
          'actual_close', v_now_time::text
        )
      );

      shift_id := v_shift.id;
      branch_id := v_shift.branch_id;
      branch_name := v_shift.branch_name;
      shift_number := v_shift.shift_number;
      brand_id := v_shift.brand_id;
      brand_name := v_shift.brand_name;
      scheduled_close_time := v_scheduled_close;
      actual_close_time := v_now_time;
      late_minutes := v_late_minutes;
      grace_period_minutes := v_grace_period;
      auto_closed := true;
      return next;
    end if;
  end loop;
end;
$func$;

comment on function public.check_and_auto_close_shifts is
  'Called by scheduler to auto-close shifts exceeding business hours + grace period.';

-- ── 7. Index for auto-close queries ──

create index if not exists idx_store_shifts_open_branch
  on public.store_shifts(branch_id, shift_status)
  where shift_status = 'OPEN';
