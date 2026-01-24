const express = require('express');
const cors = require("cors");
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const { createCanvas } = require('canvas');

const app = express();
app.use(cors());
app.set('trust proxy', true);
const PORT = process.env.PORT || 3000;

// Load reasons from JSON
const reasons = JSON.parse(fs.readFileSync('./reasons.json', 'utf-8'));

// Rate limiter: 120 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  keyGenerator: (req, res) => {
    return req.headers['cf-connecting-ip'] || req.ip; // Fallback if header missing (or for non-CF)
  },
  message: { error: "Too many requests, please try again later. (120 reqs/min/IP)" }
});

app.use(limiter);

// Helper for wrapping text on canvas
function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  const lines = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = context.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  const totalHeight = lines.length * lineHeight;
  let startY = y - (totalHeight / 2) + (lineHeight / 2);

  for (let i = 0; i < lines.length; i++) {
    context.fillText(lines[i], x, startY + (i * lineHeight));
  }
}

// Random rejection reason endpoint (API)
app.get('/no', (req, res) => {
  const reason = reasons[Math.floor(Math.random() * reasons.length)];
  res.json({ reason });
});

// Helper to generate and send image
function sendImage(res, width, height) {
  const reason = reasons[Math.floor(Math.random() * reasons.length)];
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  // Background
  context.fillStyle = '#f0f0f0';
  context.fillRect(0, 0, width, height);

  // Text configuration
  context.fillStyle = '#333';
  // Scale font size roughly based on width (base 80px for 1200w)
  const fontSize = Math.floor(width / 15);
  context.font = `bold ${fontSize}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Wrap and draw text
  // Adjust padding and line height based on font size
  const padding = width * 0.1;
  const lineHeight = fontSize * 1.1;

  wrapText(context, reason.toUpperCase(), width / 2, height / 2, width - padding, lineHeight);

  res.setHeader('Content-Type', 'image/png');
  canvas.createPNGStream().pipe(res);
}

// Image endpoints
app.get('/img', (req, res) => sendImage(res, 1200, 630));
app.get('/simg', (req, res) => sendImage(res, 640, 480));
app.get('/mimg', (req, res) => sendImage(res, 800, 600));
app.get('/limg', (req, res) => sendImage(res, 1024, 768));

// Serve static files from 'public' directory
app.use(express.static('public'));
app.use('/assets', express.static('assets'));

// Plain text endpoint (optional, keeping it for backward compatibility or if requested specifically via header, otherwise static file handles root)
// app.get('/', ... ) is no longer strictly needed for root if static is used, 
// BUT to be explicit and ensure / serves index.html:
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start server
app.listen(PORT, () => {
  console.log(`No-as-a-Service is running on port ${PORT}`);
});
