import { io, Socket } from "socket.io-client";

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl) return envUrl;

  // Auto-detect IP for local network access
  const { hostname, protocol } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000";
  }

  // If accessing via IP (e.g. 192.168.x.x), use the same IP for the backend
  return `${protocol}//${hostname}:4000`;
};

export const SOCKET_URL = getSocketUrl();

export function connectSocket(token: string): Socket {
  return io(SOCKET_URL, {
    transports: ["polling", "websocket"],
    auth: { token },
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
  });
}

export function connectCCTVSocket(token: string): Socket {
  return io(`${SOCKET_URL}/cctv`, {
    transports: ["polling", "websocket"],
    auth: { token },
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
  });
}
