'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSocket, onRatingUpdated, joinHospitalRoom, joinDoctorRoom } from '@/lib/realtime';

type RealtimeContextType = {
  connected: boolean;
  joinHospital: (id: number) => void;
  joinDoctor: (id: number) => void;
};

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const s = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  const api = useMemo<RealtimeContextType>(() => ({
    connected,
    joinHospital: (id: number) => joinHospitalRoom(id),
    joinDoctor: (id: number) => joinDoctorRoom(id),
  }), [connected]);

  return <RealtimeContext.Provider value={api}>{children}</RealtimeContext.Provider>;
};

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}

export function useRatingUpdates(handler: (payload: any) => void) {
  useEffect(() => {
    return onRatingUpdated(handler);
  }, [handler]);
}

