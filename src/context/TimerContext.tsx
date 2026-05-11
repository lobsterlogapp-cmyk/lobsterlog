import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  persistSailStart,
  persistHaulStart,
  clearSailStart,
  clearHaulStart,
  loadSailStart,
  loadHaulStart,
} from '../utils/activeTimers';

// --- Helpers ---

const pad = (n: number) => String(n).padStart(2, '0');

const formatTime = (d: Date): string =>
  `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const formatDate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Given a start Unix ms, return "1h 23m 45s" elapsed
const elapsedString = (startMs: number): string => {
  const totalSec = Math.floor((Date.now() - startMs) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
};

// --- Types ---

export interface TimerState {
  // Sail
  sailStartMs: number | null;      // null = not running
  sailStartTime: string;           // "HH:MM" of when sail started
  sailStartDate: string;           // "YYYY-MM-DD" of when sail started
  sailElapsed: string;             // live "1h 23m 45s" string
  sailActive: boolean;

  // Haul
  haulStartMs: number | null;
  haulStartTime: string;
  haulStartDate: string;
  haulEndTime: string;             // set when haul is stopped
  haulEndDate: string;
  haulElapsed: string;
  haulActive: boolean;

  // Actions
  startSail: () => Promise<void>;
  stopSail: () => { date: string; time: string };
  startHaul: () => Promise<{ date: string; time: string }>;
  stopHaul: () => { date: string; time: string };
}

const TimerContext = createContext<TimerState | null>(null);

export const useTimer = (): TimerState => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used inside <TimerProvider>');
  return ctx;
};

// --- Provider ---

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sailStartMs, setSailStartMs] = useState<number | null>(null);
  const [haulStartMs, setHaulStartMs] = useState<number | null>(null);
  const [haulEndTime, setHaulEndTime] = useState('');
  const [haulEndDate, setHaulEndDate] = useState('');
  const [sailElapsed, setSailElapsed] = useState('');
  const [haulElapsed, setHaulElapsed] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore any running timers from AsyncStorage on app boot
  useEffect(() => {
    (async () => {
      const [sail, haul] = await Promise.all([loadSailStart(), loadHaulStart()]);
      if (sail) setSailStartMs(sail);
      if (haul) setHaulStartMs(haul);
      setIsLoaded(true);
    })();
  }, []);

  // Live ticker — updates elapsed strings every second whenever a timer is active
  useEffect(() => {
    if (!isLoaded) return;

    const tick = () => {
      if (sailStartMs) setSailElapsed(elapsedString(sailStartMs));
      if (haulStartMs) setHaulElapsed(elapsedString(haulStartMs));
    };

    if (sailStartMs || haulStartMs) {
      tick(); // immediate first update
      tickRef.current = setInterval(tick, 1000);
    } else {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [sailStartMs, haulStartMs, isLoaded]);

  // --- Actions ---

  const startSail = useCallback(async () => {
    const ms = Date.now();
    setSailStartMs(ms);
    await persistSailStart(ms);
  }, []);

  const stopSail = useCallback((): { date: string; time: string } => {
    const now = new Date();
    setSailStartMs(null);
    setSailElapsed('');
    clearSailStart();
    return { date: formatDate(now), time: formatTime(now) };
  }, []);

  const startHaul = useCallback(async (): Promise<{ date: string; time: string }> => {
    const ms = Date.now();
    const now = new Date(ms);
    setHaulStartMs(ms);
    setHaulEndTime('');
    setHaulEndDate('');
    await persistHaulStart(ms);
    return { date: formatDate(now), time: formatTime(now) };
  }, []);

  const stopHaul = useCallback((): { date: string; time: string } => {
    const now = new Date();
    const result = { date: formatDate(now), time: formatTime(now) };
    setHaulEndTime(result.time);
    setHaulEndDate(result.date);
    setHaulStartMs(null);
    setHaulElapsed('');
    clearHaulStart();
    return result;
  }, []);

  // Derived display values
  const sailStartDate = sailStartMs ? formatDate(new Date(sailStartMs)) : '';
  const sailStartTime = sailStartMs ? formatTime(new Date(sailStartMs)) : '';
  const haulStartDate = haulStartMs ? formatDate(new Date(haulStartMs)) : '';
  const haulStartTime = haulStartMs ? formatTime(new Date(haulStartMs)) : '';

  const value: TimerState = {
    sailStartMs,
    sailStartTime,
    sailStartDate,
    sailElapsed,
    sailActive: sailStartMs !== null,

    haulStartMs,
    haulStartTime,
    haulStartDate,
    haulEndTime,
    haulEndDate,
    haulElapsed,
    haulActive: haulStartMs !== null,

    startSail,
    stopSail,
    startHaul,
    stopHaul,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};
