# Migration 010 — Lion Hunt item request board

Run this in your Supabase SQL Editor **after** migration 009.

```sql
create table lion_hunts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category text not null,
  description text,
  budget_max numeric(10, 2),
  urgency text not null default 'normal' check (urgency in ('low', 'normal', 'urgent')),
  requester_id uuid not null references profiles(id) on delete cascade,
  fulfilled boolean default false,
  created_at timestamptz default now()
);

alter table lion_hunts enable row level security;

create policy "Lion hunts are viewable by authenticated users"
  on lion_hunts for select to authenticated using (true);

create policy "Users can create their own lion hunts"
  on lion_hunts for insert to authenticated with check (auth.uid() = requester_id);

create policy "Users can update their own lion hunts"
  on lion_hunts for update to authenticated using (auth.uid() = requester_id);

create policy "Users can delete their own lion hunts"
  on lion_hunts for delete to authenticated using (auth.uid() = requester_id);

create table lion_hunt_responses (
  id uuid primary key default uuid_generate_v4(),
  hunt_id uuid not null references lion_hunts(id) on delete cascade,
  responder_id uuid not null references profiles(id) on delete cascade,
  message text,
  price numeric(10, 2),
  created_at timestamptz default now(),
  unique(hunt_id, responder_id)
);

alter table lion_hunt_responses enable row level security;

create policy "Hunt responses are viewable by authenticated users"
  on lion_hunt_responses for select to authenticated using (true);

create policy "Users can create hunt responses"
  on lion_hunt_responses for insert to authenticated with check (auth.uid() = responder_id);

create policy "Users can delete their own hunt responses"
  on lion_hunt_responses for delete to authenticated using (auth.uid() = responder_id);
```
