-- Add a human-readable code to marketplaces
alter table marketplaces add column code text unique;

-- Generate codes for existing marketplaces
update marketplaces set code = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || row_number() over (order by created_at)
where code is null;

-- Make code not null after backfill
alter table marketplaces alter column code set not null;
