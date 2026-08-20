/**
 * Generates PWA icon PNGs for ExamCoach.
 * Run: node scripts/generate-icons.js
 */
const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outDir = path.join(__dirname, "..", "public", "icons");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Minimal valid 1x1 warm orange PNG (base64) — browsers scale via manifest sizes
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/BfAAQEAf8H+QdKsgAAAABJRU5ErkJggg==";

const buffer = Buffer.from(PNG_BASE64, "base64");

for (const size of sizes) {
  fs.writeFileSync(path.join(outDir, `icon-${size}x${size}.png`), buffer);
  console.log(`Created icon-${size}x${size}.png`);
}

console.log("Done. Replace with branded icons for production.");
