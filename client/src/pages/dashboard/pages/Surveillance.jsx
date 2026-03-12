import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MdVideocam, MdVideocamOff, MdFullscreen, MdFullscreenExit,
  MdPhotoCamera, MdSettings, MdRefresh, MdPlayArrow, MdStop,
  MdSignalWifi4Bar, MdSignalWifiOff, MdClose, MdCheck,
  MdFiberManualRecord, MdInfo, MdWifi, MdHome, MdMyLocation,
  MdArrowUpward, MdArrowDownward, MdArrowBack, MdArrowForward,
  MdZoomIn, MdZoomOut, MdRadar, MdTune
} from 'react-icons/md';
import './Surveillance.css';

const API = 'http://localhost:5000';

function fmtTime(d) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── Settings Modal ─────────────────────────────────── */
function SettingsModal({ camera, onSave, onClose }) {
  const [form, setForm] = useState({
    label:       camera.label,
    ip:          camera.ip,
    http_port:   camera.http_port,
    rtsp_port:   camera.rtsp_port,
    username:    camera.username,
    password:    '',
    channel:     camera.channel,
    stream:      camera.stream,
    ptz_enabled: camera.ptz_enabled ?? false,
    ptz_speed:   camera.ptz_speed ?? 5,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/api/surveillance/cameras/${camera.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, http_port: +form.http_port, rtsp_port: +form.rtsp_port, channel: +form.channel }),
      });
      const data = await res.json();
      if (data.success) { setMsg('Saved!'); onSave(); setTimeout(onClose, 900); }
      else setMsg(data.error || 'Failed to save');
    } catch {
      setMsg('Connection error');
    }
    setSaving(false);
  };

  return (
    <div className="sv-modal-overlay" onClick={onClose}>
      <div className="sv-modal" onClick={e => e.stopPropagation()}>
        <div className="sv-modal-header">
          <span className="sv-modal-title"><MdSettings /> Camera Settings</span>
          <button className="sv-icon-btn" onClick={onClose}><MdClose /></button>
        </div>
        <div className="sv-modal-body">
          <label>Label
            <input value={form.label} onChange={e => set('label', e.target.value)} />
          </label>
          <div className="sv-form-row">
            <label>IP Address
              <input value={form.ip} onChange={e => set('ip', e.target.value)} placeholder="192.168.1.183" />
            </label>
            <label>HTTP Port
              <input type="number" value={form.http_port} onChange={e => set('http_port', e.target.value)} />
            </label>
            <label>RTSP Port
              <input type="number" value={form.rtsp_port} onChange={e => set('rtsp_port', e.target.value)} />
            </label>
          </div>
          <div className="sv-form-row">
            <label>Username
              <input value={form.username} onChange={e => set('username', e.target.value)} placeholder="admin" />
            </label>
            <label>Password
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="(unchanged)" />
            </label>
          </div>
          <div className="sv-form-row">
            <label>Channel
              <input type="number" min={1} max={16} value={form.channel} onChange={e => set('channel', e.target.value)} />
            </label>
            <label>Stream Quality
              <select value={form.stream} onChange={e => set('stream', +e.target.value)}>
                <option value={1}>1 – Main (High)</option>
                <option value={2}>2 – Sub (Low)</option>
                <option value={3}>3 – Third</option>
              </select>
            </label>
          </div>
          <div className="sv-form-row">
            <label style={{flexDirection:'row', alignItems:'center', gap:10, cursor:'pointer'}}>
              <input type="checkbox" checked={form.ptz_enabled}
                onChange={e => set('ptz_enabled', e.target.checked)}
                style={{width:16,height:16,accentColor:'#818cf8'}} />
              Enable PTZ Controls
            </label>
            <label>PTZ Speed (1–10)
              <input type="number" min={1} max={10} value={form.ptz_speed}
                onChange={e => set('ptz_speed', +e.target.value)}
                disabled={!form.ptz_enabled} />
            </label>
          </div>
          <div className="sv-rtsp-preview">
            <MdInfo size={14} />
            <span>RTSP: rtsp://{form.username}:***@{form.ip}:{form.rtsp_port}/{form.channel}/{form.stream}</span>
          </div>
        </div>
        <div className="sv-modal-footer">
          {msg && <span className={`sv-msg ${msg === 'Saved!' ? 'ok' : 'err'}`}>{msg === 'Saved!' ? <MdCheck /> : null} {msg}</span>}
          <button className="sv-btn sv-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sv-btn sv-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save & Reconnect'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── PTZ Panel ──────────────────────────────────── */
function PTZPanel({ camId, ptzSpeed, patrolActive, patrolSequence }) {
  const [speed, setSpeed]         = useState(ptzSpeed || 5);
  const [patrol, setPatrol]       = useState(patrolActive);
  const [presets, setPresets]     = useState([]);
  const [selToken, setSelToken]   = useState('1');
  const [feedback, setFeedback]   = useState('');
  const pressRef                  = useRef(null);

  const flash = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(''), 2000); };

  // Load ONVIF presets from camera
  const loadPresets = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/surveillance/ptz/${camId}/presets`);
      const data = await res.json();
      if (data.success && data.presets.length) {
        setPresets(data.presets);
        setSelToken(data.presets[0].token);
        flash(`✓ ${data.presets.length} preset(s) loaded`);
      } else {
        flash(data.error || 'No presets found');
      }
    } catch { flash('Could not load presets'); }
  }, [camId]);

  useEffect(() => { loadPresets(); }, [loadPresets]);

  // Hold-to-move helpers
  const handlePress = (direction) => {
    fetch(`${API}/api/surveillance/ptz/${camId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction, speed }),
    }).catch(() => {});
    pressRef.current = direction;
  };

  const handleRelease = () => {
    if (!pressRef.current) return;
    fetch(`${API}/api/surveillance/ptz/${camId}/stop`, { method: 'POST' }).catch(() => {});
    pressRef.current = null;
  };

  const btn = (direction, icon, title, extraClass = '') => (
    <button
      className={`ptz-btn ${extraClass}`}
      title={title}
      onMouseDown={() => handlePress(direction)}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      onTouchStart={(e) => { e.preventDefault(); handlePress(direction); }}
      onTouchEnd={handleRelease}
    >{icon}</button>
  );

  const handleHome = () => {
    fetch(`${API}/api/surveillance/ptz/${camId}/home`, { method: 'POST' }).catch(() => {});
    flash('↩ Home');
  };

  const handleZoom = (dir) => {
    fetch(`${API}/api/surveillance/ptz/${camId}/zoom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction: dir, speed }),
    }).catch(() => {});
  };
  const handleZoomRelease = () => {
    fetch(`${API}/api/surveillance/ptz/${camId}/stop`, { method: 'POST' }).catch(() => {});
  };

  const handlePreset = (action) => {
    const name = presets.find(p => p.token === selToken)?.name || `Preset ${selToken}`;
    fetch(`${API}/api/surveillance/ptz/${camId}/preset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, token: selToken, name }),
    }).catch(() => {});
    flash(action === 'goto' ? `▶ ${name}` : `💾 Saved ${name}`);
    if (action === 'set') setTimeout(loadPresets, 800);
  };

  const togglePatrol = async () => {
    const endpoint = patrol ? 'stop' : 'start';
    await fetch(`${API}/api/surveillance/patrol/${camId}/${endpoint}`, { method: 'POST' }).catch(() => {});
    setPatrol(p => !p);
    flash(patrol ? '⏹ Patrol stopped' : '🔄 Patrol started');
  };

  return (
    <div className="sv-ptz-panel">
      <div className="sv-ptz-header">
        <span><MdTune size={14} /> PTZ Control · ONVIF</span>
        {feedback && <span className="sv-ptz-feedback">{feedback}</span>}
      </div>

      <div className="sv-ptz-body">
        {/* D-pad */}
        <div className="ptz-dpad">
          <div className="ptz-row">
            {btn('up_left',  '↖', 'Up-Left')}
            {btn('up',       <MdArrowUpward size={18}/>, 'Up', 'ptz-main')}
            {btn('up_right', '↗', 'Up-Right')}
          </div>
          <div className="ptz-row">
            {btn('left',  <MdArrowBack size={18}/>,    'Left',  'ptz-main')}
            <button className="ptz-btn ptz-home" title="Home" onClick={handleHome}><MdHome size={16}/></button>
            {btn('right', <MdArrowForward size={18}/>, 'Right', 'ptz-main')}
          </div>
          <div className="ptz-row">
            {btn('down_left',  '↙', 'Down-Left')}
            {btn('down',       <MdArrowDownward size={18}/>, 'Down', 'ptz-main')}
            {btn('down_right', '↘', 'Down-Right')}
          </div>
        </div>

        {/* Right column */}
        <div className="ptz-right">
          {/* Zoom */}
          <div className="ptz-zoom">
            <button className="ptz-btn ptz-zoom-btn"
              onMouseDown={() => handleZoom('in')} onMouseUp={handleZoomRelease} onMouseLeave={handleZoomRelease}
              onTouchStart={e => { e.preventDefault(); handleZoom('in'); }} onTouchEnd={handleZoomRelease}
              title="Zoom In"><MdZoomIn size={18}/></button>
            <span className="ptz-zoom-label">ZOOM</span>
            <button className="ptz-btn ptz-zoom-btn"
              onMouseDown={() => handleZoom('out')} onMouseUp={handleZoomRelease} onMouseLeave={handleZoomRelease}
              onTouchStart={e => { e.preventDefault(); handleZoom('out'); }} onTouchEnd={handleZoomRelease}
              title="Zoom Out"><MdZoomOut size={18}/></button>
          </div>

          {/* Speed */}
          <div className="ptz-speed">
            <span>Speed</span>
            <input type="range" min={1} max={10} value={speed} onChange={e => setSpeed(+e.target.value)} />
            <span className="ptz-speed-val">{speed}</span>
          </div>

          {/* Presets */}
          <div className="ptz-presets">
            <div className="ptz-presets-top">
              <span className="ptz-label">Presets</span>
              <button className="sv-btn sv-btn-xs sv-btn-ghost" onClick={loadPresets} title="Reload presets from camera">
                <MdRefresh size={12}/>
              </button>
            </div>
            {presets.length > 0 ? (
              <select className="ptz-preset-select"
                value={selToken} onChange={e => setSelToken(e.target.value)}>
                {presets.map(p => (
                  <option key={p.token} value={p.token}>{p.name || `Preset ${p.token}`}</option>
                ))}
              </select>
            ) : (
              <span className="ptz-no-presets">No presets – save one first</span>
            )}
            <div className="ptz-preset-actions">
              <button className="sv-btn sv-btn-xs sv-btn-primary" onClick={() => handlePreset('goto')}>Go</button>
              <button className="sv-btn sv-btn-xs sv-btn-ghost"   onClick={() => handlePreset('set')}>Save Here</button>
            </div>
          </div>

          {/* Patrol */}
          <button className={`sv-btn sv-btn-sm ${patrol ? 'sv-btn-danger' : 'sv-btn-patrol'}`}
                  onClick={togglePatrol}>
            <MdRadar size={15}/>
            {patrol ? 'Stop Patrol' : 'Auto Patrol'}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ─── Snapshot Gallery Card ──────────────────────────── */
function SnapshotCard({ snap, onRemove }) {
  return (
    <div className="sv-snap-card">
      <img src={snap.url} alt="snapshot" />
      <div className="sv-snap-meta">
        <span>{snap.label}</span>
        <span>{fmtTime(snap.ts)}</span>
      </div>
      <div className="sv-snap-actions">
        <a href={snap.url} download={snap.filename} className="sv-btn sv-btn-xs sv-btn-ghost">Download</a>
        <button className="sv-btn sv-btn-xs sv-btn-danger" onClick={() => onRemove(snap.id)}>Remove</button>
      </div>
    </div>
  );
}

/* ─── Camera Feed Card ───────────────────────────────── */
function CameraCard({ camera, onSettingsOpen, onSnapshot }) {
  const [status, setStatus]    = useState({ connected: false, has_frame: false, last_error: '' });
  const [fullscreen, setFs]    = useState(false);
  const [streaming, setStream] = useState(true);
  const [ts, setTs]            = useState(Date.now());
  const [showPTZ, setShowPTZ]  = useState(false);
  const [patrolActive, setPatrolActive] = useState(camera.patrol_active || false);
  const pollRef                = useRef(null);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/surveillance/status/${camera.id}`);
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false, has_frame: false, last_error: 'Backend unreachable' });
    }
  }, [camera.id]);

  useEffect(() => {
    pollStatus();
    pollRef.current = setInterval(pollStatus, 4000);
    return () => clearInterval(pollRef.current);
  }, [pollStatus]);

  useEffect(() => {
    fetch(`${API}/api/surveillance/start/${camera.id}`, { method: 'POST' }).catch(() => {});
  }, [camera.id]);

  const handleToggleStream = async () => {
    if (streaming) {
      await fetch(`${API}/api/surveillance/stop/${camera.id}`, { method: 'POST' }).catch(() => {});
      setStream(false);
    } else {
      await fetch(`${API}/api/surveillance/start/${camera.id}`, { method: 'POST' }).catch(() => {});
      setStream(true);
      setTs(Date.now());
    }
  };

  const handleSnapshot = async () => {
    try {
      const res = await fetch(`${API}/api/surveillance/snapshot/${camera.id}`);
      if (!res.ok) { alert('No frame available yet.'); return; }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      onSnapshot({
        id: Date.now(),
        url: objectUrl,
        filename: `snapshot_${camera.id}_${Date.now()}.jpg`,
        label: camera.label,
        ts: new Date(),
      });
    } catch {
      alert('Failed to capture snapshot.');
    }
  };

  const streamSrc = `${API}/api/surveillance/stream/${camera.id}?t=${ts}`;

  return (
    <div className={`sv-camera-card ${fullscreen ? 'sv-fullscreen' : ''}`}>
      <div className="sv-camera-header">
        <div className="sv-camera-title">
          <span className={`sv-status-dot ${status.connected ? 'live' : 'offline'}`} />
          <span className="sv-camera-label">{camera.label}</span>
          {status.connected
            ? <span className="sv-badge live"><MdFiberManualRecord size={10} /> LIVE</span>
            : <span className="sv-badge offline"><MdVideocamOff size={11} /> OFFLINE</span>}
        </div>
        <div className="sv-camera-controls">
          <button className="sv-icon-btn" title="Reload stream" onClick={() => setTs(Date.now())}><MdRefresh /></button>
          <button className="sv-icon-btn" title="Take snapshot" onClick={handleSnapshot}><MdPhotoCamera /></button>
          {camera.ptz_enabled && (
            <button className={`sv-icon-btn ${showPTZ ? 'ptz-active' : ''}`}
                    title="PTZ Controls" onClick={() => setShowPTZ(p => !p)}>
              <MdMyLocation />
            </button>
          )}
          <button className={`sv-icon-btn ${streaming ? 'active-stop' : 'active-play'}`}
                  title={streaming ? 'Stop stream' : 'Start stream'}
                  onClick={handleToggleStream}>
            {streaming ? <MdStop /> : <MdPlayArrow />}
          </button>
          <button className="sv-icon-btn" title="Camera settings" onClick={onSettingsOpen}><MdSettings /></button>
          <button className="sv-icon-btn" title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  onClick={() => setFs(f => !f)}>
            {fullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
          </button>
        </div>
      </div>

      <div className="sv-video-wrap">
        {streaming ? (
          <>
            <img
              className="sv-video"
              src={streamSrc}
              alt="live feed"
              onError={() => setStatus(s => ({ ...s, connected: false }))}
            />
            <div className="sv-osd">
              <span><MdWifi size={12} /> {camera.ip}</span>
              <span>{fmtDate(new Date())}  {fmtTime(new Date())}</span>
            </div>
          </>
        ) : (
          <div className="sv-offline-screen">
            <MdVideocamOff size={56} />
            <p>Stream stopped</p>
            <button className="sv-btn sv-btn-primary" onClick={handleToggleStream}>
              <MdPlayArrow /> Start Stream
            </button>
          </div>
        )}
        {!status.connected && streaming && (
          <div className="sv-connecting-overlay">
            <div className="sv-spinner" />
            <span>{status.last_error || 'Connecting to camera…'}</span>
          </div>
        )}
      </div>

      <div className="sv-camera-footer">
        <span className="sv-footer-chip">
          {status.connected ? <MdSignalWifi4Bar size={13} /> : <MdSignalWifiOff size={13} />}
          &nbsp;{status.connected ? 'Connected' : 'Disconnected'}
        </span>
        <span className="sv-footer-chip">CH{camera.channel} · Stream {camera.stream}</span>
        <span className="sv-footer-chip">RTSP :{camera.rtsp_port}</span>
        {patrolActive && <span className="sv-footer-chip patrol-chip"><MdRadar size={11}/>&nbsp;Patrolling</span>}
        {status.last_error && !status.connected && (
          <span className="sv-footer-chip err" title={status.last_error}>⚠ {status.last_error}</span>
        )}
      </div>

      {showPTZ && camera.ptz_enabled && (
        <PTZPanel
          camId={camera.id}
          ptzSpeed={camera.ptz_speed}
          patrolActive={patrolActive}
          patrolSequence={camera.patrol}
        />
      )}
    </div>
  );
}

/* ─── Surveillance Page ──────────────────────────────── */
export default function Surveillance() {
  const [cameras, setCameras]      = useState([]);
  const [loading, setLoading]      = useState(true);
  const [error, setError]          = useState('');
  const [settingsCam, setSettings] = useState(null);
  const [snapshots, setSnapshots]  = useState([]);
  const [showGallery, setGallery]  = useState(false);
  const [clock, setClock]          = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchCameras = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`${API}/api/surveillance/cameras`);
      const data = await res.json();
      setCameras(data.cameras || []);
    } catch {
      setError('Cannot reach backend. Make sure the Flask server is running on port 5000.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCameras(); }, [fetchCameras]);

  const addSnapshot = (snap) => {
    setSnapshots(prev => [snap, ...prev]);
    setGallery(true);
  };

  return (
    <div className="sv-wrapper">
      {/* Page header */}
      <div className="sv-page-header">
        <div className="sv-page-title-block">
          <MdVideocam size={28} className="sv-page-icon" />
          <div>
            <h1>Surveillance</h1>
            <p>Live CCTV monitoring · Tiandy TC-H334S</p>
          </div>
        </div>
        <div className="sv-page-meta">
          <span className="sv-meta-chip">
            <MdFiberManualRecord size={10} className="blink-dot" />
            &nbsp;{fmtDate(clock)}
          </span>
          <span className="sv-meta-chip clock">{fmtTime(clock)}</span>
          <button className="sv-btn sv-btn-ghost sv-btn-sm" onClick={fetchCameras}>
            <MdRefresh /> Refresh
          </button>
          <button className={`sv-btn sv-btn-sm ${showGallery ? 'sv-btn-primary' : 'sv-btn-ghost'}`}
                  onClick={() => setGallery(g => !g)}>
            <MdPhotoCamera /> Snapshots
            {snapshots.length > 0 && <span className="sv-badge-count">{snapshots.length}</span>}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="sv-error-banner">
          <MdVideocamOff /> &nbsp;{error}
        </div>
      )}

      {/* Camera grid */}
      {loading ? (
        <div className="sv-loading">
          <div className="sv-spinner large" />
          <span>Loading cameras…</span>
        </div>
      ) : (
        <div className={`sv-cameras-grid grid-${Math.min(cameras.length, 4)}`}>
          {cameras.map(cam => (
            <CameraCard
              key={cam.id}
              camera={cam}
              onSettingsOpen={() => setSettings(cam)}
              onSnapshot={addSnapshot}
            />
          ))}
          {cameras.length === 0 && !error && (
            <div className="sv-no-cameras">
              <MdVideocamOff size={48} />
              <p>No cameras configured.</p>
            </div>
          )}
        </div>
      )}

      {/* Snapshot Gallery */}
      {showGallery && (
        <div className="sv-gallery-panel">
          <div className="sv-gallery-header">
            <span><MdPhotoCamera /> Snapshot Gallery ({snapshots.length})</span>
            <button className="sv-icon-btn" onClick={() => setGallery(false)}><MdClose /></button>
          </div>
          {snapshots.length === 0 ? (
            <div className="sv-gallery-empty">
              <MdPhotoCamera size={36} />
              <p>No snapshots yet. Click the camera icon on a feed.</p>
            </div>
          ) : (
            <div className="sv-gallery-grid">
              {snapshots.map(s => (
                <SnapshotCard key={s.id} snap={s} onRemove={id => setSnapshots(p => p.filter(x => x.id !== id))} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings modal */}
      {settingsCam && (
        <SettingsModal
          camera={settingsCam}
          onSave={fetchCameras}
          onClose={() => setSettings(null)}
        />
      )}
    </div>
  );
}