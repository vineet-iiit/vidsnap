<div align="center">

# 🎬 VidSnap
### YouTube & Instagram Video Downloader

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-vidsnap--o7u3.onrender.com-6366f1?style=for-the-badge)](https://vidsnap-o7u3.onrender.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![yt-dlp](https://img.shields.io/badge/yt--dlp-latest-FF0000?style=for-the-badge)](https://github.com/yt-dlp/yt-dlp)

**Download any YouTube or Instagram video in full quality — with a beautiful UI.**

[🚀 Try it Live](https://vidsnap-o7u3.onrender.com) • [📦 Features](#features) • [💻 Run Locally](#run-locally) • [🚢 Deploy](#deploy)

![VidSnap Screenshot](https://raw.githubusercontent.com/vineet-iiit/vidsnap/main/static/preview.png)

</div>

---

## ✨ Features

- 🎞️ **Full Quality Downloads** — Best, 4K, 2K, 1080p, 720p, 480p, 360p
- 🎵 **Audio Only** — Extract MP3 at 320kbps
- 📸 **Instagram Support** — Reels, Posts, Stories
- ▶️ **YouTube Support** — Videos, Shorts, Music
- 📊 **Live Progress Bar** — Real-time speed, ETA, size
- 🎯 **Auto Quality Detection** — Shows only available qualities per video
- 🌙 **Dark Glassmorphism UI** — Beautiful, responsive design
- ⚡ **Fast** — Uses yt-dlp with Android player bypass

---

## 🚀 Try it Live

> **[https://vidsnap-o7u3.onrender.com](https://vidsnap-o7u3.onrender.com)**

> ⚠️ Free tier — may take ~30 seconds to wake up on first visit.

---

## 💻 Run Locally

### Prerequisites
- Python 3.10+
- [FFmpeg](https://ffmpeg.org/download.html) installed and in PATH

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/vineet-iiit/vidsnap.git
cd vidsnap

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run
python app.py
```

Open **http://localhost:5000** in your browser.

---

## 🚢 Deploy

### One-click deploy to Render (free)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

**Manual steps:**
1. Fork this repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your fork
4. Set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
   - **Instance**: Free
5. Deploy 🚀

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python + Flask |
| Downloader | yt-dlp |
| Video Merge | FFmpeg |
| Frontend | Vanilla HTML/CSS/JS |
| Fonts | Inter (Google Fonts) |
| Hosting | Render.com |

---

## 📁 Project Structure

```
vidsnap/
├── app.py              # Flask backend + yt-dlp logic
├── requirements.txt    # Python dependencies
├── render.yaml         # Render deployment config
├── static/
│   ├── index.html      # Frontend UI
│   ├── style.css       # Dark glassmorphism styles
│   └── app.js          # Frontend logic & API calls
└── downloads/          # Temp download folder (local only)
```

---

## ⚖️ Disclaimer

This tool is for **personal use only**. Downloading copyrighted content without permission may violate YouTube/Instagram Terms of Service. Use responsibly.

---

<div align="center">

Made with ❤️ by [vineet-iiit](https://github.com/vineet-iiit)

⭐ Star this repo if you found it useful!

</div>
