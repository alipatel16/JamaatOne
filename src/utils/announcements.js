function announcementPayload(value) {
  const announcement = String(value || "").trim();
  if (!announcement) throw new Error("Enter an announcement.");
  if (announcement.length > 4000) throw new Error("Announcement must be 4,000 characters or fewer.");
  return { announcement };
}
function newestAnnouncements(items) {
  return [...(items || [])].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) || Number(b.announcementId) - Number(a.announcementId));
}
module.exports = { announcementPayload, newestAnnouncements };
