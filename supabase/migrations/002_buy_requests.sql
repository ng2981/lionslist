-- Buy requests table
create table buy_requests (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  unique(listing_id, buyer_id)
);

-- RLS
alter table buy_requests enable row level security;

create policy "Users can view their own buy requests"
  on buy_requests for select
  using (buyer_id = auth.uid());

create policy "Sellers can view requests on their listings"
  on buy_requests for select
  using (listing_id in (select id from listings where seller_id = auth.uid()));

create policy "Users can create buy requests"
  on buy_requests for insert
  with check (buyer_id = auth.uid());

create policy "Sellers can update request status"
  on buy_requests for update
  using (listing_id in (select id from listings where seller_id = auth.uid()));

create policy "Users can delete their own requests"
  on buy_requests for delete
  using (buyer_id = auth.uid());
