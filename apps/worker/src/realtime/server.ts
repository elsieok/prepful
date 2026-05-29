import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import * as Y from 'yjs';

const httpServer = createServer();

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  },
});

interface DocUpdatePayload {
  roomId: string;
  update: number[];
}

interface CursorMovePayload {
  roomId: string;
  position: { lineNumber: number; column: number };
  name: string;
}

const rooms = new Map<string, Y.Doc>();

io.on('connection', (socket: Socket) => {
  console.log('[ws] Client connected:', socket.id);

  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Y.Doc());
    }

    const doc = rooms.get(roomId)!;
    const state = Y.encodeStateAsUpdate(doc);
    socket.emit('sync', Array.from(state));
    socket.to(roomId).emit('user-joined', { socketId: socket.id });
    console.log(`[ws] ${socket.id} joined room ${roomId}`);
  });

  socket.on('doc-update', ({ roomId, update }: DocUpdatePayload) => {
    const doc = rooms.get(roomId);
    if (!doc) return;
    Y.applyUpdate(doc, new Uint8Array(update));
    socket.to(roomId).emit('doc-update', { update });
  });

  socket.on('cursor-move', ({ roomId, position, name }: CursorMovePayload) => {
    socket.to(roomId).emit('cursor-moved', { socketId: socket.id, position, name });
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