'use client'

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })
  }
  return socket
}

export function subscribeToNotifications(
  userId: string,
  handlers: {
    onNotification?: (n: any) => void
    onAnnouncement?: (a: any) => void
  },
) {
  const s = getSocket()
  s.emit('subscribe:user', userId)
  if (handlers.onNotification) s.on('notification', handlers.onNotification)
  if (handlers.onAnnouncement) s.on('announcement', handlers.onAnnouncement)
  return () => {
    if (handlers.onNotification) s.off('notification', handlers.onNotification)
    if (handlers.onAnnouncement) s.off('announcement', handlers.onAnnouncement)
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
