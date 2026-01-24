# No-as-a-Service (Enhanced)

> **Note:** This is a modernized fork of the original [No-as-a-Service](https://github.com/hotheadhacker/no-as-a-service). It includes a new CLI configuration tool, Docker optimizations, and improved font rendering.

A lightweight API that returns random rejection reasons as JSON or generated images.

## ✨ New Features
*   **Interactive Configuration:** A TUI wizard (`configure.js`) to set ports, colors, and fonts easily.
*   **Dockerized:** Fully compatible with `docker compose` (v2) on Debian-based Node images.
*   **Custom Fonts:** Automatic registration of custom fonts (supports `.ttf` and `.otf`) with improved rendering (no more "boxes").
*   **Sanitization:** Smart handling of special characters (em-dashes, smart quotes) for decorative fonts.

## 🚀 Getting Started

### 1. Clone & Setup
```bash
git clone https://github.com/benjiden-dev/no-as-a-service.git
cd no-as-a-service
npm install
```

### 2. Configure & Deploy
Run the configuration wizard. This tool will scan your `fonts/` directory, help you pick colors, and automatically deploy the Docker container.

```bash
node configure.js
```

### 3. API Endpoints

| Endpoint | Description |
| :--- | :--- |
| `/no` | Returns a random JSON rejection reason. |
| `/img` | Returns a 1200x630 PNG image. |
| `/simg` | Returns a 640x480 PNG image. |
| `/mimg` | Returns a 800x600 PNG image. |
| `/limg` | Returns a 1024x768 PNG image. |

## 🛠 Manual Configuration
If you prefer not to use the wizard, you can edit the `.env` file manually:

```bash
PORT=3005
IMG_BG_COLOR=#000000
IMG_TEXT_COLOR=#ffffff
IMG_FONT_FAMILY="Magnolia Sky" # Must match a filename in /fonts
```

## 📜 Credits
*   Original concept and implementation by [hotheadhacker](https://github.com/hotheadhacker).
*   Enhanced and maintained by [benjiden-dev](https://github.com/benjiden-dev).