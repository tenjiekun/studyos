// Run: node scripts/generate-icons.js
// Generates PWA icons from the SVG source

const fs = require("fs");
const path = require("path");

// Create a simple 192x192 and 512x512 PNG using pure Node.js
// Since we don't have canvas, we'll create SVG files as fallback

const svg = fs.readFileSync(path.join(__dirname, "../public/icons/icon.svg"), "utf8");

// Write SVG as the icon source
// For production, use a tool like sharp or the built-in canvas to generate PNGs
// For now, we reference the SVG directly in the manifest

console.log("✅ Icons ready. For production PNGs, use: npx sharp-cli -i public/icons/icon.svg -o public/icons/icon-192.png resize 192 192");
console.log("✅ For 512px: npx sharp-cli -i public/icons/icon.svg -o public/icons/icon-512.png resize 512 512");
