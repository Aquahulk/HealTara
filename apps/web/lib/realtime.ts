import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socket: Socket | null = null;
let connecting = false;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (connecting && socket) return socket;
  connecting = true;
  
  // Connect directly to the API server for WebSockets
  const url = API_BASE_URL;
  
  socket = io(url, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    withCredentials: true
  });
  socket.on('connect_error', () => {
    // silently ignore; UI will retry
  });
  socket.on('connect', () => {
    connecting = false;
  });
  return socket;
}

export function joinHospitalRoom(hospitalId: number) {
  const s = getSocket();
  if (Number.isFinite(hospitalId)) {
    s.emit('join-hospital', hospitalId);
  }
}

export function joinDoctorRoom(doctorId: number) {
  const s = getSocket();
  if (Number.isFinite(doctorId)) {
    s.emit('join-doctor', doctorId);
  }
}

export function onRatingUpdated(handler: (payload: any) => void) {
  const s = getSocket();
  s.on('rating:updated', handler);
  return () => {
    s.off('rating:updated', handler);
  };
}

export function onTokenUpdated(handler: (payload: any) => void) {
  const s = getSocket();
  s.on('token:updated', handler);
  return () => {
    s.off('token:updated', handler);
  };
}

export function onAppointmentUpdates(handler: (payload: any) => void) {
  const s = getSocket();
  s.on('appointment-booked', handler);
  s.on('appointment-updated', handler);
  s.on('appointment-cancelled', handler);
  s.on('appointment-updated-optimistic', handler);
  return () => {
    s.off('appointment-booked', handler);
    s.off('appointment-updated', handler);
    s.off('appointment-cancelled', handler);
    s.off('appointment-updated-optimistic', handler);
  };
}

export function onSlotUpdates(handler: (payload: any) => void) {
  const s = getSocket();
  s.on('slots:updated', handler);
  s.on('slots:period-updated', handler);
  return () => {
    s.off('slots:updated', handler);
    s.off('slots:period-updated', handler);
  };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
