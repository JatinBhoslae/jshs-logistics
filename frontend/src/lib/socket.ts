import { io, Socket } from 'socket.io-client'

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000'

export function connectSocket(token: string): Socket {
  return io(SOCKET_URL, {
    transports: ['polling', 'websocket'],
    auth: { token },
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
  })
}
