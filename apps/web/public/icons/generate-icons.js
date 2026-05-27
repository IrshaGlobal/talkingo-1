/**
 * PWA Icon Generator for Talkingo
 * 
 * Run: node public/icons/generate-icons.js
 * 
 * This generates PNG icons from the SVG favicon at all required PWA sizes.
 * Since we can't use sharp/canvas in this environment, we'll create the icons
 * using an inline SVG-to-PNG approach with a simple Node.js script.
 * 
 * For production, you should generate proper PNG files using:
 *   - https://realfavicongenerator.net
 *   - Or run: npx pwa-asset-generator public/icons/favicon.svg public/icons
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG template with the Talkingo "T" logo
const generateSVG = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}">
  <rect x="10" y="10" width="100" height="100" rx="24" fill="#FF6A45"/>
  <path d="M35 38H85M60 38V88" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Maskable icon has extra padding (safe zone is inner 80%)
const generateMaskableSVG = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}">
  <rect width="120" height="120" fill="#FF6A45"/>
  <path d="M35 38H85M60 38V88" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

console.log('Generating PWA icon SVGs (convert to PNG for production)...');
console.log('');
console.log('For now, SVG icons are used. For production deployment, generate PNGs using:');
console.log('  npx pwa-asset-generator public/icons/favicon.svg public/icons --padding "20%"');
console.log('');

// Write SVG versions that browsers can use
sizes.forEach(size => {
  const svg = generateSVG(size);
  const filePath = path.join(__dirname, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filePath, svg);
  console.log(`  Created: icon-${size}x${size}.svg`);
});

// Maskable
const maskableSvg = generateMaskableSVG(512);
fs.writeFileSync(path.join(__dirname, 'maskable-icon-512x512.svg'), maskableSvg);
console.log('  Created: maskable-icon-512x512.svg');

console.log('');
console.log('Done! Remember to convert SVGs to PNGs for full browser compatibility.');
