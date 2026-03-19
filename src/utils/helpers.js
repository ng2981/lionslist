export function abbr(school) {
  const m = school.match(/\(([^)]+)\)/);
  return m ? m[1] : school;
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString();
}

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function whatsappLink(phone, listingName, marketplaceName) {
  const clean = (phone || "").replace(/[^0-9+]/g, "");
  const text = encodeURIComponent(
    `Hi! I'm interested in "${listingName}" on LionsList (${marketplaceName})`
  );
  return `https://wa.me/${clean}?text=${text}`;
}
