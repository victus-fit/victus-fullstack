import type { PreferenceGroup } from '../types';

interface PreferenceTableProps {
  groups: PreferenceGroup[];
}

function importanceLabel(value: number): string {
  if (value >= 5) return 'Crítica';
  if (value === 4) return 'Alta';
  if (value === 3) return 'Media';
  return 'Baja';
}

export function PreferenceTable({ groups }: PreferenceTableProps) {
  return (
    <section className="preference-table-card">
      <div className="section-heading compact">
        <span>Profile memory</span>
        <h2>Preferencias y restricciones</h2>
        <p>Datos estables que el agente debe respetar antes de recomendar dieta, hábitos o cambios de rutina.</p>
      </div>
      <div className="preference-groups">
        {groups.map((group) => (
          <div className="preference-group" key={group.category}>
            <h3>{group.title}</h3>
            <div className="preference-table" role="table" aria-label={group.title}>
              {group.items.map((item) => (
                <div className="preference-row" role="row" key={item.preference_id}>
                  <div role="cell">
                    <strong>{item.label}</strong>
                    <span>{item.value}</span>
                  </div>
                  <span className="importance-pill" role="cell">{importanceLabel(item.importance)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
