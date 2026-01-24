const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, 'fonts', 'CamiRaeRegular-l2x0.otf');
const family = 'CamiRaeRegular L2x0';

try {
  registerFont(fontPath, { family });
  console.log(`Registered: ${family}`);
} catch (e) {
  console.error('Failed to register font:', e);
}

const canvas = createCanvas(200, 50);
const ctx = canvas.getContext('2d');

// Test 1: Bold (Current implementation)
ctx.font = `bold 20px "${family}"`;
ctx.fillText('Test Bold', 10, 20);
console.log('Test 1 (Bold) font string:', ctx.font);

// Check if it fell back (hard to detect programmatically without visual inspection, 
// but sometimes ctx.font changes if invalid. Actually canvas keeps the string even if invalid).

// Test 2: Normal
ctx.font = `20px "${family}"`;
ctx.fillText('Test Normal', 10, 40);
console.log('Test 2 (Normal) font string:', ctx.font);

console.log('Done. If "bold" is the issue, the text might look default in the output image.');
