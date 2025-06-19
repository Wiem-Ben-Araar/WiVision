// scripts/copy-wasm.js
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../public/wasm/web-ifc.wasm');
const destDir = path.resolve(__dirname, '../.next/static/chunks/wasm');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, path.join(destDir, 'web-ifc.wasm'));
console.log('✅ web-ifc.wasm copied into .next/static/chunks/wasm/');
