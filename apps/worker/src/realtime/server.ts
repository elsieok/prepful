import { createServer } from 'http';
import { Server } from 'socket.io';
import * as Y from 'yjs';

const httpServer = createServer();

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true
  }
});

// Store Yjs documents per room
const rooms = new Map<string, Y.Doc>();

io.on('connection', (socket) => {
  console.log('[ws] Client connected:', socket.id);

  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Y.Doc());
    }

    // Send current document state to new joiner
    const doc = rooms.get(roomId)!;
    const state = Y.encodeStateAsUpdate(doc);
    socket.emit('sync', Array.from(state));

    socket.to(roomId).emit('user-joined', { socketId: socket.id });
    console.log(`[ws] ${socket.id} joined room ${roomId}`);
  });

  socket.on('doc-update', ({ roomId, update }: { roomId: string; update: number[] }) => {
    const doc = rooms.get(roomId);
    if (!doc) return;

    // Apply update to server-side document
    Y.applyUpdate(doc, new Uint8Array(update));

    // Broadcast to everyone else in the room
    socket.to(roomId).emit('doc-update', { update });
  });

  socket.on('cursor-move', ({ roomId, position, name }: any) => {
    socket.to(roomId).emit('cursor-moved', {
      socketId: socket.id,
      position,
      name
    });
  });

  socket.on('disconnect', () => {
    console.log('[ws] Client disconnected:', socket.id);
  });
});

export function startRealtimeServer(port = 3001) {
  httpServer.listen(port, () => {
    console.log(`[ws] Realtime server running on port ${port}`);
  });
}