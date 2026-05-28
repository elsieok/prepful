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
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState(0);

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

    socket.on('sync', (state: number[]) => {
      Y.applyUpdate(doc, new Uint8Array(state));
      if (editorRef.current) {
        editorRef.current.setValue(ytext.toString());
      }
    });

    socket.on('doc-update', ({ update }: { update: number[] }) => {
      Y.applyUpdate(doc, new Uint8Array(update));
      if (editorRef.current) {
        const current = editorRef.current.getValue();
        const newValue = ytext.toString();
        if (current !== newValue) {
          const position = editorRef.current.getPosition();
          editorRef.current.setValue(newValue);
          if (position) {
            editorRef.current.setPosition(position); // null check fixes the error
          }
        }
      }
    });

    socket.on('user-joined', () => setUsers(u => u + 1));
    socket.on('disconnect', () => setConnected(false));

    doc.on('update', (update: Uint8Array) => {
      socket.emit('doc-update', {
        roomId,
        update: Array.from(update)
      });
    });

    return () => {
      socket.disconnect();
      doc.destroy();
    };
  }, [roomId]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    editor.onDidChangeModelContent(() => {
      const doc = docRef.current;
      if (!doc) return;
      const ytext = doc.getText('code');
      const current = ytext.toString();
      const newValue = editor.getValue();
      if (current !== newValue) {
        doc.transact(() => {
          ytext.delete(0, ytext.length);
          ytext.insert(0, newValue);
        });
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 bg-gray-900 text-xs text-gray-400">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
        <span>{connected ? `Connected — Room: ${roomId}` : 'Connecting...'}</span>
        {users > 0 && <span>· {users + 1} users</span>}
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