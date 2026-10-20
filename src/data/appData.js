export const initialRentals = [
  { id: 'rental-1', item: 'Digital Multimeter', renter: 'Paolo Garcia', start: 'Oct 18', end: 'Oct 20', deposit: 100, status: 'Ongoing' },
  { id: 'rental-2', item: 'Arduino Uno Kit', renter: 'Mia Flores', start: 'Oct 14', end: 'Oct 17', deposit: 100, status: 'Overdue' },
  { id: 'rental-3', item: 'Soldering Iron Kit', renter: 'Ken Yu', start: 'Oct 09', end: 'Oct 11', deposit: 50, status: 'Returned' },
];

export const myListings = [
  { id: 'mine-1', title: 'Digital Multimeter', category: 'Lab equipment', price: 30, type: 'rent', status: 'Approved' },
  { id: 'mine-2', title: 'Calculus Workbook', category: 'Textbooks', price: 250, type: 'sale', status: 'Pending' },
  { id: 'mine-3', title: 'Old lab coat', category: 'Other', price: 180, type: 'sale', status: 'Rejected' },
  { id: 'mine-4', title: 'Arduino Uno Kit', category: 'Electronics', price: 40, type: 'rent', status: 'Approved' },
];

export const transactions = [
  { id: 'tx-1', title: 'Digital Multimeter rental', date: 'Oct 18, 2026', amount: 60, kind: 'Received' },
  { id: 'tx-2', title: 'Scientific Calculator', date: 'Oct 12, 2026', amount: 450, kind: 'Paid offline' },
  { id: 'tx-3', title: 'Arduino Uno Kit rental', date: 'Oct 08, 2026', amount: 120, kind: 'Received' },
];

export const initialNotifications = [
  { id: 'note-1', title: 'New message from Paolo Garcia', detail: 'Is the multimeter available this afternoon?', time: '10 min ago', unread: true },
  { id: 'note-2', title: 'Return due Oct 20', detail: 'Digital Multimeter is due back at CIT Main Gate.', time: '1 hour ago', unread: true },
  { id: 'note-3', title: 'Your listing is approved', detail: 'Arduino Uno Kit is now live on the marketplace.', time: 'Yesterday', unread: false },
];

export const conversations = [
  { id: 'chat-1', name: 'Paolo Garcia', item: 'Digital Multimeter', lastMessage: 'Could we meet at the main gate?', time: '10:42 AM', unread: true },
  { id: 'chat-2', name: 'Mia Flores', item: 'Arduino Uno Kit', lastMessage: 'Thanks, that works for me!', time: 'Yesterday', unread: false },
  { id: 'chat-3', name: 'Marco Dela Cruz', item: 'Scientific Calculator', lastMessage: 'Is pickup near the library okay?', time: 'Mon', unread: false },
];
