'use client';

import { useEffect, useState } from 'react';

const USER_ID = '799956529847205898';
const API_URL = `https://api.lanyard.rest/v1/users/${USER_ID}`;
const POLL_MS = 30_000;

interface SpotifyData {
  song: string;
  artist: string;
  album_art_url: string;
  timestamps: { start: number; end: number };
}

interface Activity {
  name: string;
  details?: string;
  state?: string;
}

interface LanyardData {
  discord_status: 'online' | 'idle' | 'dnd' | 'offline';
  listening_to_spotify: boolean;
  spotify: SpotifyData | null;
  activities: Activity[];
}

const STATUS_COLOR: Record<string, string> = {
  online: '#22c55e',
  idle: '#f59e0b',
  dnd: '#ef4444',
};

function useSpotifyProgress(spotify: SpotifyData | null): number {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!spotify) { setPct(0); return; }
    const tick = () => {
      const now = Date.now();
      const dur = spotify.timestamps.end - spotify.timestamps.start;
      setPct(dur > 0 ? Math.min(100, ((now - spotify.timestamps.start) / dur) * 100) : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [spotify]);

  return pct;
}

export default function DiscordPresence() {
  const [data, setData] = useState<LanyardData | null>(null);

  useEffect(() => {
    let alive = true;
    const fetch_ = () =>
      fetch(API_URL)
        .then(r => r.ok ? r.json() : null)
        .then(j => { if (alive && j?.data) setData(j.data as LanyardData); })
        .catch(() => {});

    fetch_();
    const id = setInterval(fetch_, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const progress = useSpotifyProgress(data?.spotify ?? null);

  if (!data || data.discord_status === 'offline') return null;

  if (data.listening_to_spotify && data.spotify) {
    const { song, artist, album_art_url } = data.spotify;
    return (
      <div style={styles.strip}>
        <img
          src={album_art_url}
          alt={`${song} album art`}
          width={60}
          height={60}
          style={styles.art}
        />
        <div style={styles.info}>
          <span style={styles.songLabel}>Listening to</span>
          <span style={styles.song}>{song}</span>
          <span style={styles.artist}>{artist}</span>
          <div style={styles.barTrack}>
            <div style={{ ...styles.barFill, width: `${progress}%` }} />
          </div>
        </div>
        <SpotifyIcon />
      </div>
    );
  }

  const dot = STATUS_COLOR[data.discord_status];
  const activity = data.activities.find(a => a.name !== 'Spotify');

  return (
    <div style={styles.strip}>
      <span style={{ ...styles.dot, background: dot }} />
      <div style={styles.info}>
        <span style={styles.song}>Online on Discord</span>
        {activity && (
          <span style={styles.artist}>
            {activity.name}{activity.details ? ` — ${activity.details}` : ''}
          </span>
        )}
      </div>
      <DiscordIcon />
    </div>
  );
}

function SpotifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1db954" style={{ flexShrink: 0 }}>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865f2" style={{ flexShrink: 0 }}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  strip: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    background: 'var(--raised, #111)',
    border: '1px solid var(--border, rgba(255,255,255,0.07))',
    borderRadius: '10px',
    maxWidth: '340px',
    width: 'fit-content',
  },
  art: {
    borderRadius: '6px',
    objectFit: 'cover',
    flexShrink: 0,
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
    flex: 1,
  },
  songLabel: {
    fontSize: '10px',
    color: 'var(--primary, #2dd4bf)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  song: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text, #f5f5f5)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  artist: {
    fontSize: '12px',
    color: 'var(--muted, #a3a3a3)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  barTrack: {
    marginTop: '4px',
    height: '3px',
    background: 'var(--overlay, #1a1a1a)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: 'var(--primary, #2dd4bf)',
    borderRadius: '2px',
    transition: 'width 0.5s linear',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
};
