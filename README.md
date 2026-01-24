# No-as-a-Service (Enhanced)

> **Note:** This is a modernized fork of the original [No-as-a-Service](https://github.com/hotheadhacker/no-as-a-service). It includes a new CLI configuration tool, Docker optimizations, and improved font rendering.

A lightweight API that returns random rejection reasons as JSON or generated images.

## Getting Started

### 1. Automated Setup and Management
The interactive manager handles initial setup, environment configuration, and service deployment.

```bash
git clone https://github.com/benjiden-dev/no-as-a-service.git
cd no-as-a-service
npm install
npm run setup
```

The tool provides two distinct workflows:
*   **Initial Setup:** Configures deployment mode (Docker or Native), feature toggles, networking, and visual styles.
*   **Ongoing Management:** Once configured, the tool offers a simplified menu to update specific settings (colors, fonts, ports) or manage the service (restart, stop, view logs).

---

### 2. Manual Native Deployment
For running without Docker, the project uses `forever` to manage the background process.

```bash
# Start in background
npx forever start index.js

# List running processes
npx forever list

# Stop the server
npx forever stop index.js
```

---

### 3. Docker Deployment
The manager generates a hardened `docker-compose.yml` based on your networking preferences.

```bash
docker compose up -d --build
```

#### Security and Hardening
The Docker configuration includes several production-grade security measures:

*   **Read-Only Filesystem:** The container filesystem is immutable, preventing unauthorized file modifications.
*   **Dropped Capabilities:** All Linux kernel capabilities are removed to minimize the attack surface.
*   **No New Privileges:** Prevents the application from gaining elevated permissions.
*   **Non-Root User:** The process runs under the restricted `node` user account.
*   **Resource Limits:** CPU and memory usage are capped to prevent resource exhaustion.
*   **Isolated Networking:** Supports internal-only Docker networks for use with secure tunnels.

---

### 4. API Endpoints

| Endpoint | Description |
| :--- | :--- |
| `/no` | Returns a random JSON rejection reason. |
| `/S` | Returns a 640x480 (Small) PNG image. |
| `/M` | Returns a 800x600 (Medium) PNG image. |
| `/L` | Returns a 1024x768 (Large) PNG image. |

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