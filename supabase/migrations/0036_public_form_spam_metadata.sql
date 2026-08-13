alter table public.contact_messages
  add column if not exists ip_hash text,
  add column if not exists content_hash text;

create index if not exists contact_messages_email_created_idx
  on public.contact_messages (lower(email), created_at desc);

create index if not exists contact_messages_spam_hash_created_idx
  on public.contact_messages (ip_hash, content_hash, created_at desc);

alter table public.admission_applications
  add column if not exists ip_hash text,
  add column if not exists content_hash text;

create index if not exists admission_applications_email_created_idx
  on public.admission_applications (lower(parent_email), created_at desc);

create index if not exists admission_applications_spam_hash_created_idx
  on public.admission_applications (ip_hash, content_hash, created_at desc);
