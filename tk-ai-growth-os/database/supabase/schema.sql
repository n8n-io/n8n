-- ============================================================
-- TK AI Growth OS — Supabase (Postgres) schema
-- Multi-tenant: every business row is scoped by company_id.
-- White-label: agencies own child companies via parent_company_id.
-- Run order: extensions → tables → indexes → RLS.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists vector; -- pgvector for knowledge base RAG

-- ------------------------------------------------------------
-- Tenancy
-- ------------------------------------------------------------

create table companies (
  id                uuid primary key default uuid_generate_v4(),
  parent_company_id uuid references companies(id), -- white-label agency tree
  name              text not null,
  vertical_slug     text not null,                 -- fk to vertical_configs.slug
  country           text not null,                 -- ISO 3166-1 alpha-2: US, CA, AU
  timezone          text not null,
  plan              text not null default 'starter',
  branding          jsonb not null default '{}',   -- {logo_url, primary, accent, background, platform_name, sender_domain}
  settings          jsonb not null default '{}',   -- tenant overrides merged over vertical config
  api_keys          jsonb not null default '[]',   -- [{key_hash, role, label, created_at}]
  status            text not null default 'active',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table locations (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references companies(id),
  name        text not null,
  address     jsonb not null default '{}',
  phone       text,
  hours       jsonb not null default '{}',         -- {mon:[["09:00","18:00"]], ...}
  settings    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create table vertical_configs (
  slug        text primary key,                    -- 'nail-salon', 'flower-shop', ...
  name        text not null,
  version     text not null default '1.0.0',
  config      jsonb not null,                      -- mirrors config/verticals/*.json
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- People
-- ------------------------------------------------------------

create table contacts (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references companies(id),
  first_name    text,
  last_name     text,
  phone         text,
  email         text,
  channels      jsonb not null default '{}',       -- {facebook_psid, instagram_id, whatsapp_id, ...}
  source        text,                              -- 'missed_call','web_chat','facebook','referral',...
  lead_score    int not null default 0,
  lead_status   text not null default 'new',       -- new|qualified|nurturing|converted|lost
  tags          text[] not null default '{}',
  custom_fields jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, phone),
  unique (company_id, email)
);

create table customers (
  id             uuid primary key default uuid_generate_v4(),
  company_id     uuid not null references companies(id),
  contact_id     uuid not null references contacts(id),
  first_visit_at timestamptz,
  last_visit_at  timestamptz,
  visit_count    int not null default 0,
  lifetime_value numeric(12,2) not null default 0,
  average_ticket numeric(12,2) not null default 0,
  preferences    jsonb not null default '{}',      -- vertical-specific: nail shape, hair color formula, ...
  created_at     timestamptz not null default now(),
  unique (company_id, contact_id)
);

-- ------------------------------------------------------------
-- Engagement
-- ------------------------------------------------------------

create table appointments (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id),
  location_id  uuid references locations(id),
  contact_id   uuid not null references contacts(id),
  service      jsonb not null,                     -- {name, duration_min, price, staff_id}
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       text not null default 'booked',     -- booked|confirmed|completed|no_show|cancelled
  booked_via   text not null,                      -- channel or 'staff'
  metadata     jsonb not null default '{}',        -- vertical modules: {occasion, delivery_address, ...}
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table calls (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id),
  contact_id   uuid references contacts(id),
  direction    text not null,                      -- inbound|outbound
  status       text not null,                      -- answered|missed|voicemail|recovered
  from_number  text,
  to_number    text,
  duration_sec int,
  recording_url text,
  transcript   text,
  ai_summary   jsonb,
  occurred_at  timestamptz not null default now()
);

create table messages (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id),
  contact_id   uuid references contacts(id),
  channel      text not null,                      -- sms|facebook|instagram|google_business|web_chat|whatsapp
  direction    text not null,                      -- inbound|outbound
  body         text not null,
  ai_generated boolean not null default false,
  intent       text,                               -- detected intent slug
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create table emails (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id),
  contact_id   uuid references contacts(id),
  campaign_id  uuid,
  direction    text not null,
  subject      text,
  body_html    text,
  status       text not null default 'sent',       -- sent|delivered|opened|clicked|replied|bounced
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Commerce & marketing
-- ------------------------------------------------------------

create table campaigns (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id),
  name         text not null,
  type         text not null,                      -- sms|email|mixed
  audience     jsonb not null default '{}',        -- segment definition
  content      jsonb not null default '{}',        -- templates with variables
  schedule     jsonb not null default '{}',
  status       text not null default 'draft',
  stats        jsonb not null default '{}',        -- {sent, opened, replied, booked, revenue}
  created_at   timestamptz not null default now()
);

create table invoices (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id),
  contact_id   uuid references contacts(id),
  appointment_id uuid references appointments(id),
  amount       numeric(12,2) not null,
  currency     text not null default 'USD',
  status       text not null default 'open',       -- open|paid|void|overdue
  line_items   jsonb not null default '[]',
  due_at       timestamptz,
  created_at   timestamptz not null default now()
);

create table payments (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id),
  invoice_id   uuid references invoices(id),
  amount       numeric(12,2) not null,
  currency     text not null default 'USD',
  provider     text,                               -- stripe|square|manual
  provider_ref text,
  status       text not null default 'succeeded',
  paid_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- AI
-- ------------------------------------------------------------

create table knowledge_base (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id),
  title        text not null,
  content      text not null,
  source       text,                               -- 'manual','website','document','faq'
  embedding    vector(1536),
  metadata     jsonb not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table ai_reports (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id),
  type         text not null,                      -- 'weekly_kpi','website_audit','seo','proposal'
  period_start date,
  period_end   date,
  content      jsonb not null,
  created_at   timestamptz not null default now()
);

create table workflow_logs (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid references companies(id),      -- nullable: platform-level events
  request_id   uuid not null,
  workflow     text not null,                      -- 'TK-RCP-001'
  level        text not null default 'info',       -- debug|info|warn|error
  event        text not null,
  detail       jsonb not null default '{}',
  duration_ms  int,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------

create index idx_contacts_company on contacts(company_id);
create index idx_contacts_phone on contacts(company_id, phone);
create index idx_customers_company on customers(company_id);
create index idx_appointments_company_time on appointments(company_id, starts_at);
create index idx_calls_company_time on calls(company_id, occurred_at);
create index idx_messages_contact_time on messages(company_id, contact_id, created_at);
create index idx_emails_company on emails(company_id);
create index idx_campaigns_company on campaigns(company_id);
create index idx_invoices_company on invoices(company_id);
create index idx_kb_company on knowledge_base(company_id);
create index idx_kb_embedding on knowledge_base using ivfflat (embedding vector_cosine_ops);
create index idx_logs_request on workflow_logs(request_id);
create index idx_logs_company_time on workflow_logs(company_id, created_at);

-- ------------------------------------------------------------
-- Row Level Security
-- n8n uses the service role (bypasses RLS); dashboard users are
-- restricted to their company tree via JWT claim company_id.
-- ------------------------------------------------------------

alter table companies      enable row level security;
alter table locations      enable row level security;
alter table contacts       enable row level security;
alter table customers      enable row level security;
alter table appointments   enable row level security;
alter table calls          enable row level security;
alter table messages       enable row level security;
alter table emails         enable row level security;
alter table campaigns      enable row level security;
alter table invoices       enable row level security;
alter table payments       enable row level security;
alter table knowledge_base enable row level security;
alter table ai_reports     enable row level security;
alter table workflow_logs  enable row level security;

-- Company tree: a user sees their company and (for agencies) all children.
create or replace function company_tree(root uuid)
returns setof uuid language sql stable as $$
  with recursive tree as (
    select id from companies where id = root
    union all
    select c.id from companies c join tree t on c.parent_company_id = t.id
  )
  select id from tree;
$$;

-- Template policy — repeat per table (shown for contacts):
create policy tenant_isolation on contacts
  using (company_id in (select company_tree((auth.jwt() ->> 'company_id')::uuid)));

-- Apply the same policy shape to every company_id-scoped table above.
