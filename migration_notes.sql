-- 6. NOTES TABLE
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  customer_id uuid references public.customers(id),
  is_pinned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for notes
alter table public.notes enable row level security;

drop policy if exists "Enable all for authenticated users" on public.notes;
create policy "Enable all for authenticated users" on public.notes for all using (true);

-- Add index
create index if not exists idx_notes_created_at on public.notes(created_at);
create index if not exists idx_notes_is_pinned on public.notes(is_pinned);
