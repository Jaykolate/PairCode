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

export default function Editor({ language, socketRef, roomId, onCodeChange }) {
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
          if (socketRef.current) {
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
              roomId,
              code,
            });
          }
        }
      });
    }
  }, []);

  // 2. Listen for Socket Changes (Separated to ensure it attaches)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleCodeChange = ({ code }) => {
      if (code !== null && editorRef.current) {
        // We use setValue, and the 'origin' check above prevents infinite loops
        editorRef.current.setValue(code);
      }
    };

    socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);

    return () => {
      socket.off(ACTIONS.CODE_CHANGE, handleCodeChange);
    };
  }, [socketRef.current]); // Dependency on the actual socket instance

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