import { motion } from 'motion/react';

export function TypingIndicator() {
  return (
    <div className="typing-indicator" aria-label="Victus is preparing a response">
      {[0, 1, 2].map((index) => (
        <motion.span
          className="typing-dot"
          key={index}
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.15 }}
        />
      ))}
    </div>
  );
}
