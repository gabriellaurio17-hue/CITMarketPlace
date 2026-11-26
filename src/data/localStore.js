import starterListings from './listings';

const KEY = 'cit-marketplace-demo-v1';
export const categories = ['Electronics', 'Lab equipment', 'Textbooks', 'Other'];
const accounts = [
  { id: 'member-ana', username: 'ana', password: 'demo', full_name: 'Ana Reyes', email: 'ana.reyes@cit.edu', role: 'user', classification: 'Student', account_status: 'active', is_verified: true, verification_status: 'approved', created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: 'member-marco', username: 'marco', password: 'demo', full_name: 'Marco Dela Cruz', email: 'marco.dc@cit.edu', role: 'user', classification: 'Student', account_status: 'active', is_verified: true, verification_status: 'approved', created_at: new Date(Date.now() - 86400000 * 18).toISOString() },
  { id: 'member-bea', username: 'bea', password: 'demo', full_name: 'Bea Santos', email: 'bea.santos@cit.edu', role: 'user', classification: 'Faculty/Staff', account_status: 'active', is_verified: true, verification_status: 'approved', created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: 'admin-demo', username: 'admin', password: 'demo', full_name: 'CIT Administrator', email: 'admin@cit.edu', role: 'admin', classification: 'Admin', account_status: 'active', is_verified: true, verification_status: 'approved', created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
];
const starter = () => ({
  accounts,
  listings: starterListings.map((item, i) => ({ ...item, owner_id: ['member-ana','member-marco','member-bea','member-ana','member-marco','member-bea'][i], listing_type: item.type, approval_status: 'approved', availability: 'active', created_at: new Date(Date.now() - i * 86400000).toISOString(), categories: { name: item.category }, location: item.pickup, rental_terms: item.type === 'rent' ? 'Return in the same condition. Agree on a campus meetup.' : '' })),
  transactions: [], messages: [], conversations: [], notifications: [], reports: [], logs: [], reviews: [],
});
export function readStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    const base = starter();
    return {
      ...base,
      ...raw,
      accounts: Array.isArray(raw.accounts) ? raw.accounts : base.accounts,
      listings: Array.isArray(raw.listings) ? raw.listings : base.listings,
      transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
      messages: Array.isArray(raw.messages) ? raw.messages : [],
      conversations: Array.isArray(raw.conversations) ? raw.conversations : [],
      notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
      reports: Array.isArray(raw.reports) ? raw.reports : [],
      logs: Array.isArray(raw.logs) ? raw.logs : [],
      reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
    };
  } catch { return starter(); }
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
  const store = readStore();
  const unavailableListingIds = new Set(store.transactions
    .filter(transaction => {
      if (transaction.type === 'sale') {
        return ['accepted', 'ongoing', 'completed'].includes(normalizeStatus(transaction.status));
      }
      if (transaction.type === 'rental') {
        return ['approved', 'ongoing', 'overdue'].includes(normalizeStatus(transaction.status));
      }
      return false;
    })
    .map(transaction => transaction.listing_id));
  return store.listings.filter(listing => isListingApproved(listing)
    && (!listing.availability || normalizeStatus(listing.availability) === 'active')
    && !unavailableListingIds.has(listing.id));
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
  store.notifications.unshift({
    id: `note-${Date.now()}-${normalized}`,
    user_id: listing.owner_id,
    title: normalized === 'approved' ? 'Listing approved' : 'Listing rejected',
    message: normalized === 'approved'
      ? `${listing.title} is approved and will appear in Browse.`
      : `${listing.title} was rejected and will not appear in Browse.`,
    type: `listing_${normalized}`,
    related_id: listing.id,
    is_read: false,
    created_at: new Date().toISOString(),
  });
  return true;
}
export function addListing(listing) { let created; updateStore((s) => { created = { ...listing, id: `listing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), categories: { name: listing.category }, type: listing.listing_type, owner: s.accounts.find(a => a.id === listing.owner_id)?.full_name || 'CIT member', pickup: listing.location, gradient: 'multimeter', imageUrls: listing.imageUrls || listing.images || [], approval_status: 'pending', availability: 'active' }; s.listings.unshift(created); s.notifications.unshift({ id: `note-${Date.now()}-submitted`, user_id: listing.owner_id, title: 'Listing submitted', message: `${created.title} is pending administrator approval.`, type: 'listing_submitted', related_id: created.id, is_read: false, created_at: new Date().toISOString() }); }); return created; }
export function logNotification(user_id, type, message, options = {}) {
  updateStore(s => s.notifications.unshift({
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id,
    type,
    title: options.title || type.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
    message,
    related_id: options.relatedId || null,
    is_read: false,
    created_at: new Date().toISOString(),
  }));
}

export function refreshRentalStatuses(store) {
  const now = new Date();
  (store.transactions || []).forEach(transaction => {
    if (transaction.type !== 'rental') return;
    if (['ongoing', 'approved', 'pending'].includes(transaction.status)) {
      const end = transaction.end_date ? new Date(transaction.end_date) : null;
      if (end && !Number.isNaN(end.getTime()) && end < now && transaction.status !== 'completed') {
        transaction.status = 'overdue';
      }
      if (transaction.status === 'approved' && transaction.start_date) {
        const start = new Date(transaction.start_date);
        if (!Number.isNaN(start.getTime()) && start <= now) transaction.status = 'ongoing';
      }
    }
  });
  return store;
}

export function getAccountRatings(accountId) {
  const store = readStore();
  const reviews = (store.reviews || []).filter(review => review.reviewed_user_id === accountId || review.seller_id === accountId);
  const total = reviews.length;
  const average = total ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total : 0;
  return { average: total ? average.toFixed(1) : null, count: total, reviews };
}

export function getUserReviews(accountId) {
  const store = readStore();
  return (store.reviews || []).filter(review =>
    review.reviewed_user_id === accountId || review.seller_id === accountId ||
    review.reviewer_id === accountId
  );
}
