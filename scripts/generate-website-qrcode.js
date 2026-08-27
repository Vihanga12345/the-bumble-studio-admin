/**
 * Generates a QR code PNG for the Bumble Studio public website.
 * Run with: node scripts/generate-website-qrcode.js
 */

import QRCode from 'qrcode';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBSITE_URL = 'https://the-bumble-studio-public-v2.vercel.app';
const OUTPUT_PATH = join(__dirname, '../../TBS_public/public/website-qrcode.png');

QRCode.toFile(OUTPUT_PATH, WEBSITE_URL, {
  width: 400,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
})
  .then(() => {
    console.log('QR code generated successfully at:', OUTPUT_PATH);
  })
  .catch((err) => {
    console.error('Error generating QR code:', err);
    process.exit(1);
  });
