import { Activity, Database, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import type { EvidenceReference, TraceStep } from '../types';

interface ContextRailProps {
  evidence: EvidenceReference[];
  trace: TraceStep[];
}

export function ContextRail({ evidence, trace }: ContextRailProps) {
  return (
    <aside className="context-rail">
      <section className="rail-card">
        <h2>Current answer</h2>
        <div className="metric-row">
          <span>Grounding</span>
          <strong>Evidence first</strong>
        </div>
        <div className="metric-row">
          <span>Confidence</span>
          <strong>Calibrated</strong>
        </div>
        <div className="metric-row">
          <span>Mode</span>
          <strong>Demo stream</strong>
        </div>
      </section>

      <section className="rail-card">
        <h3>Agent trace</h3>
        <div className="trace-list">
          {trace.map((step) => (
            <motion.div
              key={step.id}
              className={`trace-item ${step.state}`}
              animate={{ opacity: step.state === 'pending' ? 0.55 : 1 }}
            >
              <span className="trace-dot" />
              <span>{step.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="rail-card">
        <h3>Evidence snapshot</h3>
        {evidence.length ? (
          evidence.map((source) => (
            <div className="source-card" key={source.id}>
              <strong>{source.title}</strong>
              <p>{source.summary}</p>
            </div>
          ))
        ) : (
          <div className="source-card">
            <strong>No retrieved evidence yet</strong>
            <p>Send a message to show how Victus surfaces supporting evidence next to the chat.</p>
          </div>
        )}
      </section>

      <section className="rail-card">
        <h3>System capabilities</h3>
        <span className="badge high"><Database size={13} /> Scientific RAG</span>{' '}
        <span className="badge"><Activity size={13} /> Plan reasoning</span>{' '}
        <span className="badge"><ShieldCheck size={13} /> Risk checks</span>
      </section>
    </aside>
  );
}
