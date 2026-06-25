/**
 * LumaRijschool — WebSocket Mini-Service
 * Real-time notifications via Socket.io + Redis pub/sub.
 *
 * Port: 3001
 * Path: / (Caddy/Nginx forwards /?XTransformPort=3001 from frontend)
 */
import { Server } from 'socket.io'
import { createServer } from 'http'
import Redis from 'ioredis'

const PORT = parseInt(process.env.WS_PORT || '3001', 10)
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ service: 'lumarijschool-ws', version: '8.0.0' }))
})

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  path: '/socket.io',
})

// Redis subscriber
const subscriber = new Redis(REDIS_URL)
const publisher = new Redis(REDIS_URL)

subscriber.subscribe('notifications:all', 'notifications:user', 'system:announcement')
subscriber.on('message', (channel, msg) => {
  try {
    const data = JSON.parse(msg)
    if (channel === 'notifications:all') {
      io.emit('notification', data)
    } else if (channel === 'notifications:user' && data.userId) {
      io.to(`user:${data.userId}`).emit('notification', data)
    } else if (channel === 'system:announcement') {
      io.emit('announcement', data)
    }
  } catch (e) {
    console.error('[ws] message parse error:', e)
  }
})

// Auth: simple token handshake
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  const userId = socket.handshake.auth?.userId
  if (!userId) {
    // Allow anonymous (for guest live tracking)
    return next()
  }
  ;(socket as any).userId = userId
  next()
})

io.on('connection', (socket) => {
  const userId = (socket as any).userId
  if (userId) {
    socket.join(`user:${userId}`)
    console.log(`[ws] user ${userId} connected`)
  } else {
    console.log(`[ws] anonymous client connected`)
  }

  socket.on('subscribe:user', (userId: string) => {
    socket.join(`user:${userId}`)
    ;(socket as any).userId = userId
  })

  socket.on('typing:tutor', (data: { sessionId: string; isTyping: boolean }) => {
    socket.broadcast.emit('typing:tutor', data)
  })

  socket.on('heartbeat', () => {
    socket.emit('heartbeat:ack')
  })

  socket.on('disconnect', () => {
    if (userId) console.log(`[ws] user ${userId} disconnected`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[ws] LumaRijschool WebSocket service listening on :${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[ws] SIGTERM received, closing...')
  io.close(() => httpServer.close(() => process.exit(0)))
})
process.on('SIGINT', () => {
  io.close(() => httpServer.close(() => process.exit(0)))
})
