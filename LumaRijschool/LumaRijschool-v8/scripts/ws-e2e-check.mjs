// Ad-hoc end-to-end real-time check (not part of the app build).
// Connects a Socket.io client THROUGH nginx (TLS) and waits for a 'notification'
// event that is published to Redis by the app's publish() path.
import { io } from 'socket.io-client'

const URL = process.env.WS_TEST_URL || 'https://localhost'
const socket = io(URL, {
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  rejectUnauthorized: false, // self-signed cert in local verification
  reconnection: false,
  timeout: 8000,
})

let done = false
const finish = (code, msg) => { if (done) return; done = true; console.log(msg); socket.close(); process.exit(code) }

socket.on('connect', () => {
  console.log('CONNECTED id=' + socket.id)
  console.log('READY_FOR_PUBLISH')
})
socket.on('notification', (data) => finish(0, 'RECEIVED notification: ' + JSON.stringify(data)))
socket.on('announcement', (data) => finish(0, 'RECEIVED announcement: ' + JSON.stringify(data)))
socket.on('connect_error', (e) => finish(2, 'CONNECT_ERROR: ' + e.message))
setTimeout(() => finish(3, 'TIMEOUT: no event received'), 15000)
