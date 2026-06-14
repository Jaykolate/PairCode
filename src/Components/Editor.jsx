import CodeMirror from 'codemirror';
import React, { useEffect, useRef } from 'react';

import '../App.css';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/clike/clike';
import 'codemirror/addon/edit/closetag';
import 'codemirror/mode/python/python';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../../Actions.js';

export default function Editor({ language, socketRef, roomId, onCodeChange, onCursorChange, isPrivate = false }) {
  const editorRef = useRef(null);
  const isRemoteChange = useRef(false);

  // 1. Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current) {
      editorRef.current = CodeMirror.fromTextArea(
        document.getElementById('realtimeEditor'),
        {
          mode: "javascript",
          theme: "dracula",
          lineNumbers: true,
          autoCloseTags: true,
          autoCloseBrackets: true,
        }
      );

      editorRef.current.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);

        // ONLY emit if the change came from the keyboard (local user)
        if (origin !== 'setValue') {
          if (!isPrivate && socketRef.current) {
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
              roomId,
              code,
            });
          }
        }
      });

      if (onCursorChange && !isPrivate) {
        editorRef.current.on("cursorActivity", (instance) => {
          const doc = instance.getDoc();
          const cursor = doc.getCursor();
          onCursorChange({ line: cursor.line + 1, ch: cursor.ch + 1 });
        });
      }
    }
  }, []);

  // 2. Listen for Socket Changes (Separated to ensure it attaches)
  const remoteCursors = useRef({});

  useEffect(() => {
    if (isPrivate) return;
    const socket = socketRef.current;
    if (!socket) return;

    const handleCodeChange = ({ code }) => {
      if (code !== null && editorRef.current) {
        // We use setValue, and the 'origin' check above prevents infinite loops
        editorRef.current.setValue(code);
      }
    };

    const handleCursorChange = ({ pos, username, socketId }) => {
      if (!editorRef.current) return;

      // Clear old bookmark for this user
      if (remoteCursors.current[socketId]) {
        remoteCursors.current[socketId].clear();
      }

      // Create cursor element
      const cursorEl = document.createElement('div');
      cursorEl.className = 'remote-cursor';
      const badgeEl = document.createElement('div');
      badgeEl.className = 'remote-cursor-badge';
      badgeEl.innerText = username;
      cursorEl.appendChild(badgeEl);

      // Add to CodeMirror
      const bookmark = editorRef.current.getDoc().setBookmark(pos, { widget: cursorEl, insertLeft: true });
      remoteCursors.current[socketId] = bookmark;
    };

    socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);
    socket.on(ACTIONS.CURSOR_CHANGE, handleCursorChange);

    return () => {
      socket.off(ACTIONS.CODE_CHANGE, handleCodeChange);
      socket.off(ACTIONS.CURSOR_CHANGE, handleCursorChange);
      // Clean up bookmarks
      Object.values(remoteCursors.current).forEach(bm => bm.clear());
    };
  }, [socketRef.current, isPrivate]);  // Dependency on the actual socket instance and isPrivate

  // 3. Update Language Mode
  useEffect(() => {
    if (editorRef.current) {
      // Use a more flexible way to set modes
      const modeMap = {
        javascript: "javascript",
        java: "text/x-java",
        python: "python"
      };

      editorRef.current.setOption("mode", modeMap[language] || "javascript");
    };

  }, [language]);

  return <textarea id="realtimeEditor"></textarea>;
}