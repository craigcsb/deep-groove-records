// Mock LP catalog for the CJA/AJO learning site.
// Feel free to edit — the only fields that matter for tracking are id, name, sku, price, category.
// Cover art is generated (css/modernist.css .disc-* + js/site.js discMarkup()) from `color`
// and `sku`, not loaded from an image file — see PRODUCT.md's Evidence on Hand.
const PRODUCTS = [
  { id: "2001", sku: "BEA-ABBEYRD-LP", name: "Abbey Road", artist: "The Beatles", price: 32.99, category: "The Beatles", emoji: "💿", color: "#3d84ff", description: "The Beatles' 1969 masterpiece, famous for its long-form medley on side two and that zebra crossing." },
  { id: "2002", sku: "BEA-SGTPEP-LP", name: "Sgt. Pepper's Lonely Hearts Club Band", artist: "The Beatles", price: 34.99, category: "The Beatles", emoji: "💿", color: "#e0483e", description: "The 1967 concept album that reshaped what a rock record could be, sleeve art included." },
  { id: "2003", sku: "PF-DSOTM-LP", name: "The Dark Side of the Moon", artist: "Pink Floyd", price: 29.99, category: "Pink Floyd", emoji: "💿", color: "#7c5cff", description: "Pink Floyd's 1973 concept album on time, money, and mortality — the prism cover is iconic for a reason." },
  { id: "2004", sku: "PF-WYWH-LP", name: "Wish You Were Here", artist: "Pink Floyd", price: 28.99, category: "Pink Floyd", emoji: "💿", color: "#ff8a3d", description: "A 1975 tribute to absence and to former bandmate Syd Barrett, anchored by Shine On You Crazy Diamond." },
  { id: "2005", sku: "RS-LETITBLEED-LP", name: "Let It Bleed", artist: "The Rolling Stones", price: 27.99, category: "The Rolling Stones", emoji: "💿", color: "#c0392b", description: "The Rolling Stones' 1969 record closing out the decade, featuring Gimme Shelter and You Can't Always Get What You Want." },
  { id: "2006", sku: "DOORS-DEBUT-LP", name: "The Doors", artist: "The Doors", price: 26.99, category: "The Doors", emoji: "💿", color: "#22b8a0", description: "The Doors' self-titled 1967 debut, built around Light My Fire and the extended Light My Fire/The End." }
];

function getProductById(id) {
  return PRODUCTS.find(function (p) { return p.id === id; });
}
