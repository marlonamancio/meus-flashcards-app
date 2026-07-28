// Strips accents/diacritics and anything outside a safe filename charset. Used client-side to
// build the Storage object key ({user_id}/{timestamp}-{name}) before uploading directly to
// Supabase Storage — the Storage RLS policies (013_storage_materiais_policies.sql) only key off
// the {user_id}/ path prefix, but an unsanitized name could still contain characters the Storage
// API itself rejects.
export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
}
