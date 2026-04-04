"use client";

import { useEffect, useState } from "react";
import { apiClient } from '@/lib/api';
import { getSocket, joinDoctorRoom } from '@/lib/realtime';

export default function DoctorTokenPanel({ doctorId }: { doctorId: number }) {
  const [currentToken, setCurrentToken] = useState<number>(0);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    let intervalId: any = null;
    const load = async () => {
      try {
        setLoading(true);
        const resp = await apiClient.getDoctorTokensToday(doctorId);
        if (!mounted) return;
        const tokens = Array.isArray(resp.tokens) ? resp.tokens : [];
        let total = tokens.length;
        if (total === 0) {
          try {
            const me = await apiClient.getMyAppointments();
            const fmtDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
            const todayStr = fmtDate.format(new Date());
            total = (Array.isArray(me) ? me : []).filter(a =>
              Number((a as any)?.doctorId) === doctorId &&
              String((a as any)?.status) !== 'CANCELLED' &&
              fmtDate.format(new Date((a as any)?.date)) === todayStr
            ).length;
          } catch {}
        }
        setCurrentToken(Number(resp.currentToken || 0));
        setTotalTokens(total);
      } catch (e: any) {
        setError(e?.message || 'Failed to load tokens');
      } finally {
        setLoading(false);
      }
    };
    load();
    const s = getSocket();
    joinDoctorRoom(doctorId);
    const handler = (payload: any) => {
      if (payload && Number(payload?.doctorId) === doctorId) {
        setCurrentToken(Number(payload.currentToken || 0));
      }
    };
    const refresh = async () => { try { await load(); } catch {} };
    s.on('token:updated', handler);
    s.on('appointment-booked', refresh);
    intervalId = setInterval(() => {
      refresh();
    }, 30000);
    return () => {
      mounted = false;
      s.off('token:updated', handler);
      s.off('appointment-booked', refresh);
      if (intervalId) {
        try { clearInterval(intervalId); } catch {}
      }
    };
  }, [doctorId]);

  const next = async () => {
    try {
      setLoading(true);
      const resp = await apiClient.advanceDoctorToken(doctorId);
      setCurrentToken(Number(resp.currentToken || 0));
    } catch (e: any) {
      setError(e?.message || 'Failed to advance token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Today's Queue</div>
          <div className="text-2xl font-bold text-gray-900">Token {currentToken} / {totalTokens}</div>
        </div>
        <button
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300"
          onClick={next}
          disabled={loading || currentToken >= totalTokens}
          aria-label="Next Token"
        >
          Next
        </button>
      </div>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      {loading && <div className="mt-2 text-sm text-gray-500">Loading…</div>}
    </div>
  );
}
