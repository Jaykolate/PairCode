import CodeMirror from 'codemirror';
import React, { useEffect, useRef, useState } from 'react';

import '../App.css';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';

import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/clike/clike';

import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import  ACTIONS from '../../Actions.js';

export default function Editor({language,socketRef, roomId, onCodeChange}) {
  const editorRef = useRef(null);
  

  useEffect(() => {
    if (editorRef.current) return;

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

    editorRef.current.on('change', (instance,changes)=>{
      const {origin} = changes;
      const code = instance.getValue();
      onCodeChange(code);
      if(origin !== 'setValue'){
        socketRef.current.emit(ACTIONS.CODE_CHANGE,{
          roomId,
          code,
        })
      }
    });


   
  }, []);

  useEffect(()=>{
    if (socketRef.current) {
         socketRef.current.on(ACTIONS.CODE_CHANGE,({code})=>{
      if (code !== null){
      editorRef.current.setValue(code);
      }
    });

  }
  return ()=>{
    socketRef.current.off(ACTIONS.CODE_CHANGE);
  };

},[socketRef.current]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setOption(
        "mode",
        language === "java" ? "text/x-java" : "javascript"
      );
    }
  }, [language]);

  return (
    <>
      

      <textarea id="realtimeEditor"></textarea>
    </>
  );
}
