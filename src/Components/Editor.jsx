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

export default function Editor({ activeFile, socketRef, roomId, onCodeChange, onCursorChange, isPrivate = false }) {
  const editorRef = useRef(null);
  const activeFileRef = useRef(activeFile);

  // Sync ref with current activeFile prop
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  // 1. Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current) {
      const modeMap = {
        javascript: "javascript",
        java: "text/x-java",
        python: "python"
      };
      
      const initialMode = activeFile ? (modeMap[activeFile.language] || "javascript") : "javascript";

      editorRef.current = CodeMirror.fromTextArea(
        document.getElementById('realtimeEditor'),
        {
          mode: initialMode,
          theme: "dracula",
          lineNumbers: true,
          autoCloseTags: true,
          autoCloseBrackets: true,
        }
      );

      // Set initial value
      if (activeFile) {
        editorRef.current.setValue(activeFile.content || '');
        editorRef.current.clearHistory();
      }

      editorRef.current.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);

        // ONLY emit if the change came from the keyboard (local user)
        if (origin !== 'setValue') {
          if (!isPrivate && socketRef.current) {
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
              roomId,
              filename: activeFileRef.current?.filename || 'main.js',
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

  // 2. Handle switching files or remote content changes
  useEffect(() => {
    if (editorRef.current && activeFile) {
      const currentVal = editorRef.current.getValue();
      if (currentVal !== activeFile.content) {
        const cursor = editorRef.current.getCursor();
        editorRef.current.setValue(activeFile.content || '');
        editorRef.current.setCursor(cursor);
        editorRef.current.clearHistory();
      }

      const modeMap = {
        javascript: "javascript",
        java: "text/x-java",
        python: "python"
      };
      editorRef.current.setOption("mode", modeMap[activeFile.language] || "javascript");
    }
  }, [activeFile?.filename, activeFile?.language]);

  // 3. Listen for Socket Changes (Separated to ensure it attaches)
  const remoteCursors = useRef({});

  useEffect(() => {
    if (isPrivate) return;
    const socket = socketRef.current;
    if (!socket) return;

    const handleCodeChange = ({ filename, code }) => {
      // ONLY update the editor if the change corresponds to the currently active file
      if (filename === activeFileRef.current?.filename && editorRef.current) {
        const currentVal = editorRef.current.getValue();
        if (currentVal !== code) {
          const cursor = editorRef.current.getCursor();
          editorRef.current.setValue(code || '');
          editorRef.current.setCursor(cursor);
        }
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
  }, [socketRef.current, isPrivate]);

  return <textarea id="realtimeEditor"></textarea>;
}