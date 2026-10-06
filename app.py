import os
import re
import shutil
import threading
import uuid
import subprocess
from pathlib import Path
from urllib.parse import quote
from flask import Flask, request, jsonify, send_from_directory, send_file, Response
from flask_cors import CORS
import yt_dlp

app = Flask(__name__, static_folder="static")
CORS(app)

# Use /tmp on cloud (Render/Railway), local "downloads" folder otherwise
IS_CLOUD = os.environ.get("RENDER") or os.environ.get("RAILWAY_ENVIRONMENT")
DOWNLOAD_DIR = Path("/tmp/vidsnap") if IS_CLOUD else Path("downloads")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

PORT = int(os.environ.get("PORT", 5000))

jobs = {}


def detect_platform(url: str) -> str:
    u = url.lower()
    if "instagram.com" in u:
        return "instagram"
    if "youtube.com" in u or "youtu.be" in u:
        return "youtube"
    return "other"


def safe_ascii(name: str) -> str:
    """ASCII-only fallback for Content-Disposition filename= field."""
    return re.sub(r'[^\x20-\x7e]', '_', name).strip() or "video"


def get_base_opts(platform: str) -> dict:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "extractor_args": {"youtube": {"player_client": ["android", "web"]}},
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Linux; Android 13; Pixel 7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.6099.43 Mobile Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        },
    }
    if platform == "instagram":
        opts["http_headers"]["User-Agent"] = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    return opts


def make_progress_hook(job_id: str):
    def hook(d):
        job = jobs.get(job_id)
        if not job:
            return
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
            downloaded = d.get("downloaded_bytes", 0)
            job.update({
                "status": "downloading",
                "percent": round((downloaded / total * 100) if total else 0, 1),
                "speed": d.get("speed", 0),
                "eta": d.get("eta", 0),
                "downloaded_bytes": downloaded,
                "total_bytes": total,
            })
        elif d["status"] == "finished":
            job.update({"status": "processing", "percent": 99})
        elif d["status"] == "error":
            job.update({"status": "error", "error": str(d.get("error", "Unknown"))})
    return hook


def run_download(job_id: str, url: str, quality: str, format_type: str):
    job = jobs[job_id]
    try:
        platform = detect_platform(url)
        tmp_dir = DOWNLOAD_DIR / job_id
        tmp_dir.mkdir(parents=True, exist_ok=True)

        base = get_base_opts(platform)

        if format_type == "audio":
            ydl_opts = {
                **base,
                "format": "bestaudio/best",
                "postprocessors": [{"key": "FFmpegExtractAudio",
                                    "preferredcodec": "mp3",
                                    "preferredquality": "320"}],
                "outtmpl": str(tmp_dir / "%(title)s.%(ext)s"),
                "progress_hooks": [make_progress_hook(job_id)],
            }
        else:
            qmap = {
                "best": "bestvideo+bestaudio/best",
                "2160p": "bestvideo[height<=2160]+bestaudio/best[height<=2160]/best",
                "1440p": "bestvideo[height<=1440]+bestaudio/best[height<=1440]/best",
                "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
                "720p":  "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
                "480p":  "bestvideo[height<=480]+bestaudio/best[height<=480]/best",
                "360p":  "bestvideo[height<=360]+bestaudio/best[height<=360]/best",
            }
            ydl_opts = {
                **base,
                "format": qmap.get(quality, "bestvideo+bestaudio/best"),
                "merge_output_format": "mp4",
                "outtmpl": str(tmp_dir / "%(title)s.%(ext)s"),
                "progress_hooks": [make_progress_hook(job_id)],
                "postprocessors": [{"key": "FFmpegVideoConvertor", "preferedformat": "mp4"}],
            }

        job.update({"status": "starting", "percent": 0})

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get("title", "video") if info else "video"
            thumbnail = info.get("thumbnail", "") if info else ""

        files = list(tmp_dir.iterdir())
        if not files:
            raise RuntimeError("No file produced by yt-dlp")

        dl_file = files[0]
        job.update({
            "status": "done",
            "percent": 100,
            "title": title,
            "thumbnail": thumbnail,
            "filename": dl_file.name,
            "file_path": str(dl_file),
            "job_id": job_id,
            "platform": platform,
        })
    except Exception as e:
        jobs[job_id].update({"status": "error", "error": str(e)})


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/info", methods=["POST"])
def get_info():
    data = request.json or {}
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400
    try:
        platform = detect_platform(url)
        ydl_opts = {**get_base_opts(platform), "skip_download": True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        if not info:
            return jsonify({"error": "Could not fetch video info"}), 400
        heights = sorted(
            {f.get("height") for f in info.get("formats", []) if f.get("height")},
            reverse=True
        )
        return jsonify({
            "title": info.get("title", "Unknown"),
            "thumbnail": info.get("thumbnail", ""),
            "duration": info.get("duration", 0),
            "uploader": info.get("uploader", ""),
            "platform": platform,
            "available_qualities": heights,
            "view_count": info.get("view_count", 0),
            "description": (info.get("description") or "")[:200],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/download", methods=["POST"])
def start_download():
    data = request.json or {}
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status": "queued", "percent": 0, "job_id": job_id}
    threading.Thread(
        target=run_download,
        args=(job_id, data.get("url", "").strip(),
              data.get("quality", "best"), data.get("format", "video")),
        daemon=True
    ).start()
    return jsonify({"job_id": job_id})


@app.route("/api/status/<job_id>")
def job_status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job)


@app.route("/api/file/<job_id>")
def download_file(job_id):
    job = jobs.get(job_id)
    if not job or job.get("status") != "done":
        return jsonify({"error": "File not ready"}), 404

    file_path = Path(job["file_path"])
    if not file_path.exists():
        return jsonify({"error": "File missing on server"}), 404

    filename = file_path.name
    ext = file_path.suffix.lower()
    mime_map = {".mp4": "video/mp4", ".webm": "video/webm",
                ".mkv": "video/x-matroska", ".mp3": "audio/mpeg",
                ".m4a": "audio/mp4", ".opus": "audio/ogg"}
    mimetype = mime_map.get(ext, "application/octet-stream")

    # RFC 5987 — safe Unicode filename in HTTP header
    ascii_name = safe_ascii(filename)
    encoded_name = quote(filename, safe="")

    resp = Response(
        open(str(file_path), "rb"),
        mimetype=mimetype,
        headers={
            "Content-Disposition": (
                f"attachment; "
                f'filename="{ascii_name}"; '
                f"filename*=UTF-8''{encoded_name}"
            ),
            "Content-Length": str(file_path.stat().st_size),
        }
    )
    return resp


if __name__ == "__main__":
    print("=" * 50)
    print("  VidSnap  -  YouTube & Instagram Downloader")
    print("=" * 50)
    print(f"  Running on port {PORT}")
    print("=" * 50)
    app.run(debug=False, port=PORT, host="0.0.0.0", threaded=True)

