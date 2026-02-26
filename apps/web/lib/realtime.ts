import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let connecting = false;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (connecting && socket) return socket;
  connecting = true;
  const url = typeof window !== 'undefined' ? window.location.origin : '';
  socket = io(url, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
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

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

