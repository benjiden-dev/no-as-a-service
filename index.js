require('dotenv').config();
const express = require('express');
const cors = require("cors");
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

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

// Random rejection reason endpoint (API)
app.get('/no', (req, res) => {
  const reason = reasons[Math.floor(Math.random() * reasons.length)];
  res.json({ reason });
});

// --- Image Generation Feature ---
if (process.env.ENABLE_IMAGES === 'true') {
  const { createCanvas, registerFont } = require('canvas');

  // Register Fonts
  const fontsDir = path.join(__dirname, 'fonts');
  if (fs.existsSync(fontsDir)) {
    fs.readdirSync(fontsDir).forEach(file => {
      if ((file.endsWith('.ttf') || file.endsWith('.otf')) && !file.startsWith('._')) {
        const family = file.replace(/\.(ttf|otf)$/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        registerFont(path.join(fontsDir, file), { family });
        console.log(`Registered font: "${family}" from ${file}`);
      }
    });
  }

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

  // Helper to generate and send image
  function sendImage(res, width, height) {
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');

    // Background
    const bgColor = process.env.IMG_BG_COLOR || '#f0f0f0';
    context.fillStyle = bgColor;
    context.fillRect(0, 0, width, height);

    // Text configuration
    const textColor = process.env.IMG_TEXT_COLOR || '#333';
    const fontFamily = process.env.IMG_FONT_FAMILY || 'sans-serif';
    context.fillStyle = textColor;
    // Scale font size roughly based on width (base ~110px for 1200w, ~58px for 640w)
    const fontSize = Math.floor(width / 11); 
    context.font = `${fontSize}px "${fontFamily}", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Wrap and draw text
    // Adjust padding (reduced to 5%) and line height (increased to 1.3 for fancy fonts)
    const padding = width * 0.05;
    const lineHeight = fontSize * 1.3;
    
    // Sanitize text to replace common unsupported characters in display fonts
    const sanitizedReason = reason
      .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
      .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
      .replace(/[\u2013\u2014]/g, "-") // En/Em dash
      .replace(/\u00E9/g, "e")         // é
      .replace(/\u2026/g, "...")       // Ellipsis
      .replace(/[^\x00-\x7F]/g, "");   // Remove any remaining non-ASCII characters

    console.log(`Rendering: "${sanitizedReason}" using font "${fontFamily}"`);

    wrapText(context, sanitizedReason, width / 2, height / 2, width - padding, lineHeight);

    res.setHeader('Content-Type', 'image/png');
    canvas.createPNGStream().pipe(res);
  }

  // Image endpoints
  // S: Small (640x480)
  app.get('/S', (req, res) => sendImage(res, 640, 480));
  // M: Medium (800x600)
  app.get('/M', (req, res) => sendImage(res, 800, 600));
  // L: Large (1024x768)
  app.get('/L', (req, res) => sendImage(res, 1024, 768));

} else {
  console.log("Image generation disabled (ENABLE_IMAGES != true)");
  const disabledHandler = (req, res) => {
    res.status(501).json({ error: "Image generation is disabled on this server." });
  };
  app.get('/S', disabledHandler);
  app.get('/M', disabledHandler);
  app.get('/L', disabledHandler);
}

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
