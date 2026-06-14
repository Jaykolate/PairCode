import React, { useState, useEffect, useRef } from 'react';

export default function NotepadPanel({ notepadContent, onNotepadChange }) {
    const [localText, setLocalText] = useState(notepadContent);
    const textareaRef = useRef(null);

    // Sync state only when notepadContent from props (parent state / remote update) changes
    // and is different from the local state
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea && notepadContent !== localText) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            setLocalText(notepadContent);
            
            // Restore selection coordinates in the next tick to prevent cursor jumps
            setTimeout(() => {
                try {
                    textarea.setSelectionRange(start, end);
                } catch (e) {}
            }, 0);
        }
    }, [notepadContent]);

    const handleChange = (e) => {
        const val = e.target.value;
        setLocalText(val);
        onNotepadChange(val);
    };

    return (
        <div className="ep-notepad">
            <div className="ep-notepad-header">
                <span className="ep-notepad-title">📋 Notepad</span>
                <span className="ep-gemini-badge" style={{ color: 'var(--accent)', borderColor: 'rgba(0, 122, 204, 0.25)' }}>Room State</span>
            </div>
            <div className="ep-notepad-body">
                <textarea
                    ref={textareaRef}
                    className="ep-notepad-textarea"
                    placeholder="Type or paste coding problem statements or other notes here. Changes sync in real-time."
                    value={localText}
                    onChange={handleChange}
                />
            </div>
        </div>
    );
}
