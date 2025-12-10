-- 1. Create Policies Table
create table if not exists public.policies (
  id uuid default gen_random_uuid() primary key,
  policy_no text not null,
  customer_id uuid references public.customers(id),
  company_id text references public.settings_companies(id), -- Assuming company ID is text based on current code
  type text not null, -- e.g. 'Trafik Sigortası', 'Kasko'
  start_date date not null,
  end_date date not null,
  premium numeric default 0,
  commission_amount numeric default 0,
  status text check (status in ('Active', 'Expired', 'Cancelled', 'Pending', 'Potential')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Add useful indexes
create index if not exists idx_policies_customer_id on public.policies(customer_id);
create index if not exists idx_policies_company_id on public.policies(company_id);
create index if not exists idx_policies_status on public.policies(status);
create index if not exists idx_policies_end_date on public.policies(end_date);

-- 3. (Optional) If you haven't created the settings_companies table correctly yet, ensure it has the JSONB commissions column
-- alter table public.settings_companies add column if not exists commissions jsonb default '{}'::jsonb;

-- 4. Enable Row Level Security (RLS) - Optional but recommended
alter table public.policies enable row level security;

-- Policy: Allow read access to authenticated users (or everyone for simple apps)
-- Policy: Allow read access to authenticated users (or everyone for simple apps)
drop policy if exists "Enable read access for all users" on public.policies;
create policy "Enable read access for all users" on public.policies for select using (true);

drop policy if exists "Enable insert for authenticated users" on public.policies;
create policy "Enable insert for authenticated users" on public.policies for insert with check (true);

drop policy if exists "Enable update for authenticated users" on public.policies;
create policy "Enable update for authenticated users" on public.policies for update using (true);

-- 5. Brand & Global Settings
create table if not exists public.settings_brand (
  id uuid default gen_random_uuid() primary key,
  company_name text,
  logo_url text,
  address text,
  tax_no text,
  phone text,
  website text,
  theme_preference text default 'light', -- 'light' or 'dark'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure only one row can exist (Optional: Insert default row if not exists)
insert into public.settings_brand (company_name, theme_preference)
select 'Global Hedef Sigorta', 'light'
where not exists (select 1 from public.settings_brand);

-- RLS
alter table public.settings_brand enable row level security;

drop policy if exists "Allow read all" on public.settings_brand;
create policy "Allow read all" on public.settings_brand for select using (true);

drop policy if exists "Allow update all" on public.settings_brand;
create policy "Allow update all" on public.settings_brand for update using (true);

drop policy if exists "Allow insert all" on public.settings_brand;
create policy "Allow insert all" on public.settings_brand for insert with check (true);
