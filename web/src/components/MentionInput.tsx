import { useState, useEffect, useRef, useCallback } from 'react';
import { api, User } from '../lib/api';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  disabled?: boolean;
}

interface MentionOption {
  id: string;
  label: string;
  subtitle: string;
}

export function MentionInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className = '',
  minRows = 1,
  disabled = false,
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);

  // Load users once
  useEffect(() => {
    api.users
      .list()
      .then(setUsers)
      .catch((err) => console.error('API error:', err));
  }, []);

  // Filter users based on query
  const filteredUsers: MentionOption[] = users
    .filter((u) => {
      if (!mentionQuery) return true;
      const q = mentionQuery.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    })
    .slice(0, 8)
    .map((u) => ({
      id: u.id,
      label: u.name,
      subtitle: u.email,
    }));

  // Handle input change — detect @ triggers
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = e.target.value;
      onChange(newVal);

      const pos = e.target.selectionStart || 0;
      setCursorPos(pos);

      // Look backwards for @ trigger
      const textBefore = newVal.slice(0, pos);
      const atIdx = textBefore.lastIndexOf('@');

      if (atIdx >= 0) {
        // Make sure there's no whitespace or another @ before cursor
        const afterAt = textBefore.slice(atIdx + 1);
        // Only trigger if after @ there's no whitespace and no newline
        if (
          !afterAt.includes(' ') &&
          !afterAt.includes('\n') &&
          // Ensure we have a word character boundary: check char before @
          (atIdx === 0 ||
            textBefore[atIdx - 1] === ' ' ||
            textBefore[atIdx - 1] === '\n' ||
            textBefore[atIdx - 1] === '')
        ) {
          const query = afterAt;
          setMentionQuery(query);
          setMentionStart(atIdx);
          setMentionOpen(true);
          setMentionIndex(0);
        } else {
          setMentionOpen(false);
        }
      } else {
        setMentionOpen(false);
      }
    },
    [onChange],
  );

  // Insert mention
  const insertMention = useCallback(
    (option: MentionOption) => {
      if (mentionStart < 0) return;
      const before = value.slice(0, mentionStart);
      const after = value.slice(cursorPos);
      const newVal = `${before}@${option.label} ${after}`;
      onChange(newVal);
      setMentionOpen(false);

      // Restore focus and cursor position after React re-render
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const newCursorPos = mentionStart + option.label.length + 2; // +2 for @ and space
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    },
    [value, mentionStart, cursorPos, onChange],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setMentionIndex((prev) => (prev + 1) % Math.max(filteredUsers.length, 1));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setMentionIndex((prev) => (prev <= 0 ? Math.max(filteredUsers.length - 1, 0) : prev - 1));
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          if (
            filteredUsers.length > 0 &&
            mentionIndex >= 0 &&
            mentionIndex < filteredUsers.length
          ) {
            e.preventDefault();
            insertMention(filteredUsers[mentionIndex]);
            return;
          }
        }
        if (e.key === 'Escape') {
          setMentionOpen(false);
          e.preventDefault();
          return;
        }
      }
      onKeyDown?.(e);
    },
    [mentionOpen, mentionIndex, filteredUsers, insertMention, onKeyDown],
  );

  // Close popup on scroll outside
  useEffect(() => {
    if (!mentionOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mentionOpen]);

  // Calculate popup position
  const popupStyle: React.CSSProperties = {};
  if (textareaRef.current) {
    // Position above the textarea by default
    popupStyle.bottom = '100%';
    popupStyle.marginBottom = '4px';
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={placeholder || 'Text input'}
        className={className}
        rows={minRows}
      />
      {mentionOpen && filteredUsers.length > 0 && (
        <div
          ref={popupRef}
          className="absolute left-0 right-0 z-50 rounded-lg border border-border bg-card shadow-xl overflow-hidden"
          style={popupStyle}
        >
          {filteredUsers.map((option, i) => (
            <button
              key={option.id}
              onClick={() => insertMention(option)}
              onMouseEnter={() => setMentionIndex(i)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                i === mentionIndex ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                {option.label.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{option.label}</div>
                <div className="truncate text-[10px] text-muted-foreground">{option.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
