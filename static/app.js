/* =========================================
   VidSnap – Frontend Logic
   ========================================= */

let currentFormat = 'video';
let selectedQuality = 'best';
let currentJobId = null;
let pollInterval = null;
let videoInfo = null;

// ---- Browser cookie picker ----
async function setBrowser(btn) {
  const browser = btn.dataset.browser;
  try {
    await fetch('/api/set-browser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ browser }),
    });
    // Update active chip UI
    document.querySelectorAll('.b-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const hint = $('browserHint');
    if (browser === 'none') {
      hint.textContent = '⚠️ May fail on some videos without cookies';
      hint.style.color = '#f59e0b';
    } else {
      hint.textContent = `✅ Using ${browser} cookies — bot errors fixed`;
      hint.style.color = '#22c55e';
    }
  } catch (e) {
    console.warn('Could not set browser:', e);
  }
}

// ---- Utility helpers ----
function $(id) { return document.getElementById(id); }
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatSpeed(bps) {
  if (!bps) return '—';
  if (bps < 1024 * 1024) return (bps / 1024).toFixed(0) + ' KB/s';
  return (bps / (1024 * 1024)).toFixed(1) + ' MB/s';
}

function formatETA(seconds) {
  if (!seconds) return '—';
  if (seconds < 60) return seconds + 's';
  return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
}

function formatDuration(secs) {
  if (!secs) return '--:--';
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return h + ':' + String(m % 60).padStart(2, '0') + ':' + s;
  }
  return m + ':' + s;
}

function formatViews(n) {
  if (!n) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n;
}

// ---- Format toggle ----
function setFormat(fmt) {
  currentFormat = fmt;
  $('btnVideo').classList.toggle('active', fmt === 'video');
  $('btnAudio').classList.toggle('active', fmt === 'audio');
  const qGroup = $('qualityGroup');
  if (fmt === 'audio') {
    qGroup.style.opacity = '0.4';
    qGroup.style.pointerEvents = 'none';
    selectedQuality = 'best';
  } else {
    qGroup.style.opacity = '1';
    qGroup.style.pointerEvents = '';
  }
}

// ---- Quality chips ----
function renderQualityChips(heights) {
  const container = $('qualityChips');
  container.innerHTML = '';

  const labels = [
    { key: 'best', label: '🏆 Best' },
    ...heights.filter(h => h >= 360).map(h => ({
      key: h + 'p',
      label: h >= 2160 ? '🔷 4K ' + h + 'p'
           : h >= 1440 ? '💎 2K ' + h + 'p'
           : h >= 1080 ? '⭐ ' + h + 'p'
           : '📺 ' + h + 'p',
    })),
  ];

  labels.forEach(({ key, label }) => {
    const chip = document.createElement('button');
    chip.className = 'q-chip' + (key === selectedQuality ? ' selected' : '');
    chip.textContent = label;
    chip.onclick = () => {
      selectedQuality = key;
      container.querySelectorAll('.q-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    };
    container.appendChild(chip);
  });
}

// ---- Fetch video info ----
async function fetchInfo() {
  const url = $('urlInput').value.trim();
  if (!url) {
    $('urlInput').focus();
    return;
  }

  // Show spinner
  $('fetchSpinner').classList.remove('hidden');
  $('fetchBtn').querySelector('.btn-text').textContent = 'Fetching…';
  $('fetchBtn').disabled = true;

  hide('infoCard');
  hide('progressCard');
  hide('doneCard');
  hide('errorCard');
  hide('platformPill');

  try {
    const res = await fetch('/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    videoInfo = data;

    // Platform pill
    const platPill = $('platformPill');
    platPill.classList.remove('hidden');
    $('platformIcon').textContent = data.platform === 'youtube' ? '▶️' : data.platform === 'instagram' ? '📸' : '🔗';
    $('platformLabel').textContent = 'Detected: ' + (data.platform === 'youtube' ? 'YouTube' : data.platform === 'instagram' ? 'Instagram' : 'Unknown');

    // Populate info card
    $('thumbnail').src = data.thumbnail || '';
    $('thumbnail').onerror = function() { this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"><rect width="160" height="100" fill="%23111"/><text x="80" y="55" text-anchor="middle" fill="%23666" font-size="14">No Thumbnail</text></svg>'; };
    $('videoTitle').textContent = data.title || 'Unknown';
    $('videoTitle').title = data.title || '';
    $('videoUploader').textContent = '👤 ' + (data.uploader || 'Unknown');
    $('videoDuration').textContent = '⏱ ' + formatDuration(data.duration);
    $('videoPlatform').textContent = data.platform === 'youtube' ? '▶️ YouTube' : '📸 Instagram';
    $('videoViews').textContent = '👁 ' + formatViews(data.view_count);
    $('videoDesc').textContent = data.description || '';

    // Render quality chips
    selectedQuality = 'best';
    renderQualityChips(data.available_qualities || []);
    setFormat('video');

    show('infoCard');
    $('infoCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (err) {
    showError(err.message);
  } finally {
    $('fetchSpinner').classList.add('hidden');
    $('fetchBtn').querySelector('.btn-text').textContent = 'Fetch';
    $('fetchBtn').disabled = false;
  }
}

// ---- Start download ----
async function startDownload() {
  const url = $('urlInput').value.trim();
  if (!url) return;

  hide('infoCard');
  hide('doneCard');
  hide('errorCard');
  show('progressCard');

  $('progressFill').style.width = '0%';
  $('progressPct').textContent = '0%';
  $('progressTitle').textContent = 'Queuing download…';
  $('progressSub').textContent = 'Starting yt-dlp';
  $('progressIcon').textContent = '⬇️';
  $('statSpeed').textContent = 'Speed: —';
  $('statETA').textContent = 'ETA: —';
  $('statSize').textContent = 'Size: —';

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        quality: selectedQuality,
        format: currentFormat,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    currentJobId = data.job_id;
    startPolling(data.job_id);
  } catch (err) {
    showError(err.message);
  }
}

// ---- Poll status ----
function startPolling(jobId) {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => pollStatus(jobId), 1000);
}

async function pollStatus(jobId) {
  try {
    const res = await fetch('/api/status/' + jobId);
    const job = await res.json();

    if (job.status === 'downloading') {
      const pct = Math.min(job.percent || 0, 99);
      $('progressFill').style.width = pct + '%';
      $('progressPct').textContent = pct.toFixed(1) + '%';
      $('progressTitle').textContent = 'Downloading…';
      $('progressSub').textContent = currentFormat === 'audio' ? '🎵 Extracting audio…' : '🎞️ Downloading video + audio…';
      $('statSpeed').textContent = 'Speed: ' + formatSpeed(job.speed);
      $('statETA').textContent = 'ETA: ' + formatETA(job.eta);
      $('statSize').textContent = 'Size: ' + formatBytes(job.total_bytes);
    } else if (job.status === 'processing') {
      $('progressFill').style.width = '99%';
      $('progressPct').textContent = '99%';
      $('progressTitle').textContent = 'Merging & processing…';
      $('progressSub').textContent = '🔧 FFmpeg is working its magic…';
      $('progressIcon').textContent = '⚙️';
    } else if (job.status === 'starting') {
      $('progressTitle').textContent = 'Starting…';
      $('progressSub').textContent = 'Connecting to server';
    } else if (job.status === 'done') {
      clearInterval(pollInterval);
      $('progressFill').style.width = '100%';
      $('progressPct').textContent = '100%';
      setTimeout(() => showDone(job), 600);
    } else if (job.status === 'error') {
      clearInterval(pollInterval);
      showError(job.error || 'Download failed');
    }
  } catch (e) {
    // ignore transient errors
  }
}

// ---- Show done ----
function showDone(job) {
  hide('progressCard');
  show('doneCard');
  const filename = job.filename || 'video.mp4';
  $('doneFilename').textContent = filename;
  $('saveBtn').href = '/api/file/' + job.job_id;
  $('saveBtn').setAttribute('download', filename);
  $('doneCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---- Open Downloads folder (localhost only) ----
function openFolder() {
  fetch('/api/open-folder', { method: 'POST' }).catch(() => {});
}

// ---- Show error ----
function showError(msg) {
  hide('progressCard');
  hide('infoCard');
  show('errorCard');
  $('errorMsg').textContent = msg;
}

// ---- Reset ----
function resetApp() {
  hide('infoCard');
  hide('progressCard');
  hide('doneCard');
  hide('errorCard');
  hide('platformPill');
  $('urlInput').value = '';
  $('urlInput').focus();
  if (pollInterval) clearInterval(pollInterval);
  currentJobId = null;
  videoInfo = null;
  selectedQuality = 'best';
  setFormat('video');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Enter key support ----
document.addEventListener('DOMContentLoaded', () => {
  $('urlInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fetchInfo();
  });
  // Handle paste
  $('urlInput').addEventListener('paste', () => {
    setTimeout(() => {
      if ($('urlInput').value.trim()) fetchInfo();
    }, 100);
  });
});
