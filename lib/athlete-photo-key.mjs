export function normalizePhotoName(name) {
  return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()
}
