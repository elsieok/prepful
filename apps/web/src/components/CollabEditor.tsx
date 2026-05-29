'use client';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditorType } from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { io, Socket } from 'socket.io-client';

interface Props {
  roomId: string;
  language?: string;
}

export function CollabEditor({ roomId, language = 'javascript' }: Props) {
  const editorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const socketRef = useRef<Socket | null>(null);
  // Flag to suppress local onChange while applying remote updates
  const applyingRemote = useRef(false);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState(1);

  useEffect(() => {
    const doc = new Y.Doc();
    const ytext = doc.getText('code');
    docRef.current = doc;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', roomId);
    });

    // Full state sync when joining
    socket.on('sync', (state: number[]) => {
      Y.applyUpdate(doc, new Uint8Array(state));
      if (editorRef.current) {
        applyingRemote.current = true;
        const pos = editorRef.current.getPosition();
        editorRef.current.setValue(ytext.toString());
        if (pos) editorRef.current.setPosition(pos);
        applyingRemote.current = false;
      }
    });

    // Incremental updates from other clients
    socket.on('doc-update', ({ update }: { update: number[] }) => {
      const prevText = ytext.toString();
      Y.applyUpdate(doc, new Uint8Array(update));
      const nextText = ytext.toString();

      if (editorRef.current && prevText !== nextText) {
        applyingRemote.current = true;
        const pos = editorRef.current.getPosition();
        editorRef.current.setValue(nextText);
        if (pos) editorRef.current.setPosition(pos);
        applyingRemote.current = false;
      }
    });

    socket.on('user-joined', () => setUsers((u) => u + 1));
    socket.on('user-left', () => setUsers((u) => Math.max(1, u - 1)));
    socket.on('disconnect', () => setConnected(false));

    // Only broadcast updates that originated locally (not from remote apply)
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'local') {
        socket.emit('doc-update', { roomId, update: Array.from(update) });
      }
    });

    return () => {
      socket.disconnect();
      doc.destroy();
    };
  }, [roomId]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    editor.onDidChangeModelContent(() => {
      // Skip if we're the ones applying a remote update
      if (applyingRemote.current) return;

      const doc = docRef.current;
      if (!doc) return;
      const ytext = doc.getText('code');
      const newValue = editor.getValue();

      if (ytext.toString() !== newValue) {
        doc.transact(() => {
          ytext.delete(0, ytext.length);
          ytext.insert(0, newValue);
        }, 'local'); // tag as local so the update listener broadcasts it
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 bg-gray-900 text-xs text-gray-400">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
        <span>{connected ? `Connected — Room: ${roomId}` : 'Connecting...'}</span>
        <span>· {users} {users === 1 ? 'user' : 'users'}</span>
      </div>
      <Editor
        height="70vh"
        language={language}
        theme="vs-dark"
        onMount={handleEditorMount}
        options={{ fontSize: 14, minimap: { enabled: false } }}
      />
    </div>
  );
}