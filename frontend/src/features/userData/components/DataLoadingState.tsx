interface DataLoadingStateProps {
  label?: string;
}

export function DataLoadingState({ label = 'Cargando datos del usuario…' }: DataLoadingStateProps) {
  return (
    <div className="data-loading-state" role="status">
      <div className="typing-indicator" aria-hidden="true">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span>{label}</span>
    </div>
  );
}
