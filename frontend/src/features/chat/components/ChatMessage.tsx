import { AnimatePresence, motion } from 'motion/react';
import Markdown from 'react-markdown';
import type { ChatMessageModel } from '../types';
import { TypingIndicator } from './TypingIndicator';
import { useLanguage } from '../../../i18n/LanguageContext';

interface ChatMessageProps {
  message: ChatMessageModel;
  isStreaming?: boolean;
}

const messageTransition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const { t } = useLanguage();
  const isUser = message.role === 'user';

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={messageTransition}
      className={`message-row ${isUser ? 'user' : 'assistant'}`}
    >
      <div className="message-bubble">
        <div className="message-meta">
          <span>{isUser ? t('user') : 'Victus'}</span>
          <span>·</span>
          <span>{message.createdAt}</span>
        </div>
        <div className="message-text">
          {message.text.length > 0 ? <Markdown>{message.text}</Markdown> : <TypingIndicator />}
          {isStreaming && message.text.length > 0 ? <span className="stream-caret" aria-hidden="true" /> : null}
        </div>

        <AnimatePresence>
          {message.evidence?.length ? (
            <motion.div
              className="evidence-mini-list"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16 }}
            >
              {message.evidence.map((item) => (
                <div className="evidence-mini" key={item.id}>
                  <div className="evidence-mini-header">
                    <strong>{item.title}</strong>
                    <span>{item.confidence}</span>
                  </div>
                  <p>{item.summary}</p>
                </div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
