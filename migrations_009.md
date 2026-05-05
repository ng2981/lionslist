# Migration 009 — Remove marketplace dependency, add move-out sales

Run this in your Supabase SQL Editor **first**.

```sql
create table move_out_sales (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references profiles(id) on delete cascade,
  title text not null default 'Move Out Sale',
  description text,
  active boolean default true,
  created_at timestamptz default now()
);

alter table move_out_sales enable row level security;

create policy "Move out sales are viewable by authenticated users"
  on move_out_sales for select to authenticated using (true);

create policy "Users can create their own move out sales"
  on move_out_sales for insert to authenticated with check (auth.uid() = seller_id);

create policy "Users can update their own move out sales"
  on move_out_sales for update to authenticated using (auth.uid() = seller_id);

create policy "Users can delete their own move out sales"
  on move_out_sales for delete to authenticated using (auth.uid() = seller_id);

alter table listings alter column marketplace_id drop not null;

alter table listings add column move_out_sale_id uuid references move_out_sales(id) on delete set null;
```
