# Cyferion Tech — Landing & Links

A fast, modern, static landing page for **Cyferion Tech** that links out to games, apps, and docs. Built with plain HTML/CSS/JS for maximum reliability and easy hosting (VPS, Netlify/Vercel, or anywhere that serves static files).

**Live domain:** `https://cyferion.tech`
**Main app (example):** `https://app.cyferion.tech`

---

## Features

* ⚡ **Lightweight & fast** — no frameworks, minimal JS
* 📱 **Responsive** — even nav, mobile menu with accessible toggle
* 🧱 **Stable layout** — sticky header, pinned footer, `main{flex:1}` frame
* 🧭 **Active link highlighting** & smooth scrolling
* 📨 **Progressive contact form** (logs to console until a backend is wired)
* 🧩 **Easy to extend** — drop new pages or cards; styles are componentized

---

## Tech Stack

* HTML5, modern CSS (custom properties, grid/flex), vanilla JS
* Optional deployment: **Docker + Traefik** on a VPS, fronted by **Cloudflare**
* Alternative hosting: **Netlify** / **Vercel**

---

## Repo Structure

```
/
├─ index.html       # landing (root)
├─ about.html
├─ games.html
├─ contact.html
├─ styles.css       # shared stylesheet
├─ script.js        # nav toggle, year stamp, small UX helpers
└─ /assets          # images, icons, og.png, etc. (optional)
```

> 🔗 Navigation links are **relative** (e.g., `about.html`) so the site works locally, on subpaths, and on your domain.

---

## Getting Started (Local)

### 1) Open directly (quick check)

Just open `index.html` in a browser.
Links work because paths are relative.

### 2) Serve locally (recommended for dev)

Any static server is fine. Examples:

**Node (http-server)**

```bash
# from the repo root
npm i -g http-server
http-server .
# visit the URL it prints (usually http://127.0.0.1:8080)
```

**Python 3**

```bash
# from the repo root
python -m http.server 8080
# http://127.0.0.1:8080
```

---

## Deployment Options

### Option A — VPS with Docker + Traefik (production)

This is the “always-on” setup that plays nice with Cloudflare.

1. **Copy files to the VPS**

```
/srv/cyferion/site/
  index.html
  about.html
  games.html
  contact.html
  styles.css
  script.js
  assets/...
```

2. **Traefik compose** (example)
   Your main `docker-compose.yml` might look like this (Traefik + Nginx):

```yaml
services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    command: [ "--api.dashboard=true" ]
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /srv/cyferion/traefik/traefik.yml:/traefik.yml:ro
      - /srv/cyferion/traefik/letsencrypt:/letsencrypt
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped

  website:
    image: nginx:stable
    container_name: cyferion_site
    volumes:
      - /srv/cyferion/site:/usr/share/nginx/html:ro
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.cyferion.rule=Host(`cyferion.tech`,`www.cyferion.tech`)
      - "traefik.http.routers.cyferion.entrypoints=websecure"
      - "traefik.http.routers.cyferion.tls.certresolver=letsencrypt"
      - "traefik.http.routers.cyferion-http.rule=Host(`cyferion.tech`,`www.cyferion.tech`)
      - "traefik.http.routers.cyferion-http.entrypoints=web"
      - "traefik.http.routers.cyferion-http.middlewares=redirect-https"
      - "traefik.http.middlewares.redirect-https.redirectscheme.scheme=https"
    restart: unless-stopped
```

3. **Cloudflare DNS**

* `A  cyferion.tech` → `VPS_PUBLIC_IP` (orange proxy ON)
* `A  www` → `VPS_PUBLIC_IP` (orange proxy ON)

4. **Bring it up**

```bash
# on the VPS
cd /srv/cyferion
docker compose up -d
```

> If you’re also running **home services behind CGNAT** via **Cloudflare Tunnel**, keep those on **subdomains** (e.g., `grafana.cyferion.tech`) so the landing site stays up even when the home PC is off.

---

### Option B — Netlify / Vercel (static hosting)

* Create a new site, drag-and-drop the repo (or connect Git).
* In Cloudflare DNS, create a `CNAME` (e.g., `www` → provider’s URL).
* Keep `cyferion.tech` on your VPS, or point both to the host—your call.

---

## GitHub Actions — Auto Deploy to VPS

This workflow uses `scp` over SSH to copy files to your VPS whenever you push to `main`.

**.github/workflows/deploy.yml**

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ "main" ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Copy files to VPS
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: "*"
          target: "/srv/cyferion/site"
```

**Setup instructions:**

1. In your repo settings → Secrets → Actions, add:

   * `VPS_HOST` (your server IP)
   * `VPS_USER` (your SSH username)
   * `VPS_SSH_KEY` (private key contents for passwordless login)
2. Ensure the target folder `/srv/cyferion/site` exists on the VPS.
3. Push to `main` → workflow deploys automatically.

---

## Updating Content

* Edit `index.html`, `about.html`, `games.html`, or `contact.html`.
* Add new project cards on `games.html`.
* Put images in `/assets` and reference them relatively:  `./assets/og.png`

---

## Wiring the Contact Form (later)

The form currently logs data to the console (progressive enhancement).
To enable real email:

* Add a small **Node/Express** endpoint (or use a form service)
* Set the form’s `action="/contact"` and implement POST handling
* Add server-side validation + rate limiting

---

## Roadmap / TODO

* [ ] Hook contact form to backend (Node/Express + email)
* [ ] Add `assets/og.png` and favicons
* [ ] Add a `games/` subfolder per project with dedicated pages
* [ ] Analytics (privacy-respecting) & uptime/status page
* [ ] SEO fine-tuning

---

## License

MIT — do what you want, just don’t sue us if you trip over your own cables.

---

## Contact

* Email: **[dariuspal28@gmail.com](mailto:dariuspal28@gmail.com)**
* Domain: **cyferion.tech**
