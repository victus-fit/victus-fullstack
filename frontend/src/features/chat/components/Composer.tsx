import { FormEvent, KeyboardEvent, useRef, useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import { motion } from 'motion/react';
import type { ChatStatus } from '../types';

interface ComposerProps {
  status: ChatStatus;
  onSend: (message: string) => void;
}

export function Composer({ status, onSend }: ComposerProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isReady = status === 'ready';

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = value.trim();
    if (!text || !isReady) return;
    onSend(text);
    setValue('');
    window.requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = '34px';
    });
  }

  function updateValue(nextValue: string) {
    setValue(nextValue);
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = '34px';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => updateValue(event.target.value)}
        onKeyDown={onKeyDown}
        disabled={!isReady}
        rows={1}
        placeholder="Pregunta a Victus..."
      />
      <motion.button
        className="send-button"
        type="submit"
        disabled={!value.trim() || !isReady}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.1 }}
        aria-label="Send message"
      >
        <SendHorizonal size={17} />
      </motion.button>
    </form>
  );
}
