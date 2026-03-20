function generateTicketNumber() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SFX-${year}${month}${day}-${suffix}`;
}

module.exports = {
  generateTicketNumber,
};
