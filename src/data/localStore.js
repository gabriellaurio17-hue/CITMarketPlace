import starterListings from './listings';

const KEY = 'cit-marketplace-demo-v1';
export const categories = ['Electronics', 'Lab equipment', 'Textbooks', 'Other'];
const accounts = [
  { id: 'member-ana', username: 'ana', password: 'demo', full_name: 'Ana Reyes', email: 'ana.reyes@cit.edu', role: 'user', classification: 'Student', account_status: 'active', is_verified: true },
  { id: 'member-marco', username: 'marco', password: 'demo', full_name: 'Marco Dela Cruz', email: 'marco.dc@cit.edu', role: 'user', classification: 'Student', account_status: 'active', is_verified: true },
  { id: 'member-bea', username: 'bea', password: 'demo', full_name: 'Bea Santos', email: 'bea.santos@cit.edu', role: 'user', classification: 'Faculty/Staff', account_status: 'active', is_verified: true },
  { id: 'admin-demo', username: 'admin', password: 'demo', full_name: 'CIT Administrator', email: 'admin@cit.edu', role: 'admin', classification: 'Admin', account_status: 'active', is_verified: true },
];
const starter = () => ({
  accounts,
  listings: starterListings.map((item, i) => ({ ...item, owner_id: ['member-ana','member-marco','member-bea','member-ana','member-marco','member-bea'][i], listing_type: item.type, approval_status: 'approved', availability: 'active', created_at: new Date(Date.now() - i * 86400000).toISOString(), categories: { name: item.category }, location: item.pickup, rental_terms: item.type === 'rent' ? 'Return in the same condition. Agree on a campus meetup.' : '' })),
  transactions: [], messages: [], conversations: [], notifications: [], reports: [], logs: [], reviews: [],
});
export function readStore() {
  try { return { ...starter(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return starter(); }
}
export function writeStore(store) { localStorage.setItem(KEY, JSON.stringify(store)); window.dispatchEvent(new Event('marketplace-store-change')); }
export function updateStore(mutator) { const store = readStore(); mutator(store); writeStore(store); return store; }
export function getAccounts() { return readStore().accounts; }
export function findAccount(email) { return getAccounts().find((account) => account.email === email.trim().toLowerCase()); }
export function usernameExists(username) { return getAccounts().some(account => (account.username || account.full_name || '').trim().toLowerCase() === username.trim().toLowerCase()); }
const normalizeStatus = value => String(value || '').trim().toLowerCase();
export function isListingPending(listing) { return normalizeStatus(listing.approval_status ?? listing.status) === 'pending'; }
export function isListingApproved(listing) {
  const status = normalizeStatus(listing.status);
  return status !== 'removed' && status !== 'deleted'
    && !listing.deleted_at && listing.removed !== true
    && normalizeStatus(listing.approval_status ?? listing.status) === 'approved';
}
export function getBrowseListings() {
  return readStore().listings.filter(listing => isListingApproved(listing)
    && (!listing.availability || normalizeStatus(listing.availability) === 'active'));
}
export function setListingApproval(id, status) {
  let updated = false;
  updateStore(store => { updated = updateListingApproval(store, id, status); });
  return updated;
}
export function updateListingApproval(store, id, status) {
  const normalized = normalizeStatus(status);
  if (!['approved', 'rejected'].includes(normalized)) return false;
  const listing = store.listings.find(item => item.id === id);
  if (!listing) return false;
  listing.approval_status = normalized;
  if (['pending', 'approved', 'rejected'].includes(normalizeStatus(listing.status))) listing.status = normalized;
  return true;
}
export function addListing(listing) { let created; updateStore((s) => { created = { ...listing, id: `listing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, created_at: new Date().toISOString(), categories: { name: listing.category }, type: listing.listing_type, owner: s.accounts.find(a => a.id === listing.owner_id)?.full_name || 'CIT member', pickup: listing.location, gradient: 'multimeter', imageUrls: listing.imageUrls || [], approval_status: 'pending', availability: 'active' }; s.listings.unshift(created); }); return created; }
export function logNotification(user_id, type, message) { updateStore(s => s.notifications.unshift({ id: `note-${Date.now()}`, user_id, type, message, is_read: false, created_at: new Date().toISOString() })); }
