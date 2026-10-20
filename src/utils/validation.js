export function isCitEmail(email) {
  return /^[^\s@]+@cit\.edu$/i.test(email.trim());
}
