interface DataLoadingStateProps {
  label?: string;
}

export function DataLoadingState({ label = 'Cargando datos del usuario…' }: DataLoadingStateProps) {
  return (
    <div className="data-loading-state" role="status">
      <div className="skeleton-grid" aria-hidden="true">
        <span className="skeleton-card skeleton-card-large" />
        <span className="skeleton-card" />
        <span className="skeleton-card" />
      </div>
      <span>{label}</span>
    </div>
  );
}
