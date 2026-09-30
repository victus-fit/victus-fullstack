import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createMealLogEntry, deleteMealLogEntry, getFoodDetail, updateMealLogEntry } from '../api';
import { useFoodSearch } from '../hooks/useFoodSearch';
import { useMealLogCalendar } from '../hooks/useMealLogCalendar';
import { useMealLogDay } from '../hooks/useMealLogDay';
import type { FoodDetail, FoodSearchResult, MealLogEntry, MealType } from '../types';

const defaultMealType: MealType = 'snack';

const numberFormat = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
const dayFormat = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric' });
const fullDateFormat = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

function localDate(value = new Date()): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function addDays(date: string, amount: number): string {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + amount);
  return localDate(next);
}

function startOfWeek(date: string): string {
  const value = new Date(`${date}T12:00:00`);
  const offset = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - offset);
  return localDate(value);
}

function numeric(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface FoodEntryEditorProps {
  date: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function FoodEntryEditor({ date, onClose, onSaved }: FoodEntryEditorProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FoodDetail | null>(null);
  const [grams, setGrams] = useState('100');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const search = useFoodSearch(query);

  async function selectFood(food: FoodSearchResult) {
    setIsSelecting(true);
    setError(null);
    try {
      const detail = await getFoodDetail(food.food_id);
      setSelected(detail);
      setGrams('100');
      setQuery(food.name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar el alimento');
    } finally {
      setIsSelecting(false);
    }
  }

  async function save() {
    if (!selected) return;
    setIsSaving(true);
    setError(null);
    try {
      await createMealLogEntry(date, {
        meal_type: defaultMealType,
        food_id: selected.food_id,
        quantity: numeric(quantity),
        serving_grams: numeric(grams),
        notes: notes.trim() || null,
      });
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la comida');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="meal-editor" aria-label="Agregar alimento">
      <div className="meal-editor-search">
        <Search size={16} aria-hidden="true" />
        <input value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} placeholder="Buscar alimento" autoFocus />
        <button className="meal-icon-button" type="button" title="Cerrar" aria-label="Cerrar" onClick={onClose}><X size={16} /></button>
      </div>
      {!selected && query.trim().length >= 2 ? (
        <div className="food-search-results" role="listbox" aria-label="Resultados de alimentos">
          {search.isLoading || isSelecting ? <span className="meal-status">Buscando alimentos…</span> : null}
          {search.error ? <span className="meal-error">{search.error}</span> : null}
          {!search.isLoading && search.mode === 'lexical' ? <span className="meal-status">Mostrando coincidencias por nombre.</span> : null}
          {!search.isLoading && !isSelecting && !search.error && search.results.length === 0 ? <span className="meal-status">Sin resultados.</span> : null}
          {search.results.map((food) => (
            <button className="food-search-result" type="button" role="option" key={food.food_id} onClick={() => void selectFood(food)}>
              <span>{food.name}</span>
              <small>{numberFormat.format(numeric(food.calories_kcal))} kcal · P {numberFormat.format(numeric(food.protein_g))} g · C {numberFormat.format(numeric(food.carbohydrate_g))} g</small>
            </button>
          ))}
        </div>
      ) : null}
      {selected ? (
        <div className="meal-editor-details">
          <strong>{selected.name}</strong>
          <div className="meal-editor-fields">
            <label>Gramos<input type="number" min="1" step="1" value={grams} onChange={(event) => setGrams(event.target.value)} /></label>
            <label>Cantidad<input type="number" min="0.1" step="0.1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
            <label className="meal-editor-notes">Nota<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" /></label>
          </div>
          {error ? <span className="meal-error">{error}</span> : null}
          <div className="meal-editor-actions">
            <button className="secondary-button" type="button" onClick={() => setSelected(null)}>Cambiar alimento</button>
            <button className="primary-pill" type="button" onClick={() => void save()} disabled={isSaving || numeric(grams) <= 0 || numeric(quantity) <= 0}>{isSaving ? 'Guardando…' : 'Agregar'}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface EntryEditProps {
  entry: MealLogEntry;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function EntryEdit({ entry, onClose, onSaved }: EntryEditProps) {
  const [grams, setGrams] = useState(String(entry.serving_grams));
  const [quantity, setQuantity] = useState(String(entry.quantity));
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setIsSaving(true);
    setError(null);
    try {
      await updateMealLogEntry(entry.meal_log_entry_id, { serving_grams: numeric(grams), quantity: numeric(quantity), notes: notes.trim() || null });
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo actualizar el registro');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="meal-entry-edit">
      <strong>{entry.description_snapshot}</strong>
      <div className="meal-editor-fields">
        <label>Gramos<input type="number" min="1" step="1" value={grams} onChange={(event) => setGrams(event.target.value)} /></label>
        <label>Cantidad<input type="number" min="0.1" step="0.1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
        <label className="meal-editor-notes">Nota<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" /></label>
      </div>
      {error ? <span className="meal-error">{error}</span> : null}
      <div className="meal-editor-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-pill" type="button" onClick={() => void save()} disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar'}</button></div>
    </div>
  );
}

export function DietsDashboard() {
  const today = localDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const calendar = useMealLogCalendar(weekDays[0]!, weekDays[6]!);
  const day = useMealLogDay(selectedDate);
  const summaries = new Map(calendar.data?.days.map((item) => [item.consumed_on, item]) ?? []);

  async function refresh() {
    await Promise.all([calendar.refresh(), day.refresh()]);
  }

  async function remove(entry: MealLogEntry) {
    if (!window.confirm(`Eliminar ${entry.description_snapshot} del registro?`)) return;
    await deleteMealLogEntry(entry.meal_log_entry_id);
    await refresh();
  }

  const entries = day.data?.entries ?? [];
  const totals = day.data?.totals;

  return (
    <div className="meal-log-layout">
      <section className="meal-calendar-panel" aria-label="Calendario semanal">
        <div className="meal-calendar-heading">
          <div><span className="workspace-eyebrow">Registro de comidas</span><h1>Registro diario</h1></div>
          <div className="meal-calendar-controls">
            <button className="meal-icon-button" type="button" aria-label="Semana anterior" title="Semana anterior" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={18} /></button>
            <button className="secondary-button" type="button" onClick={() => { setSelectedDate(today); setWeekStart(startOfWeek(today)); }}>Hoy</button>
            <button className="meal-icon-button" type="button" aria-label="Semana siguiente" title="Semana siguiente" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="meal-week-grid" role="list">
          {weekDays.map((date) => {
            const summary = summaries.get(date);
            const active = date === selectedDate;
            return <button className={`meal-day-button${active ? ' is-active' : ''}`} type="button" role="listitem" key={date} onClick={() => { setSelectedDate(date); setIsAddingFood(false); setEditingEntry(null); }}>
              <span>{dayFormat.format(new Date(`${date}T12:00:00`)).replace('.', '')}</span>
              <strong>{date.slice(-2)}</strong>
              <small>{summary ? `${numberFormat.format(summary.calories_kcal)} kcal` : 'Sin registros'}</small>
            </button>;
          })}
        </div>
      </section>

      <section className="meal-day-overview">
        <div className="meal-day-title"><CalendarDays size={19} aria-hidden="true" /><div><span>{fullDateFormat.format(new Date(`${selectedDate}T12:00:00`))}</span><h2>Resumen del día</h2></div></div>
        <div className="meal-summary-grid">
          <div><span>Calorías</span><strong>{numberFormat.format(totals?.calories_kcal ?? 0)} kcal</strong></div>
          <div><span>Proteína</span><strong>{numberFormat.format(totals?.protein_g ?? 0)} g</strong></div>
          <div><span>Carbohidratos</span><strong>{numberFormat.format(totals?.carbohydrate_g ?? 0)} g</strong></div>
          <div><span>Grasas</span><strong>{numberFormat.format(totals?.fat_g ?? 0)} g</strong></div>
        </div>
        {day.error ? <div className="meal-error-state"><span>{day.error}</span><button className="secondary-button" type="button" onClick={() => void day.refresh()}>Reintentar</button></div> : null}
      </section>

      <section className="meal-sections" aria-label="Alimentos del día">
        <section className="meal-section">
          <div className="meal-section-heading"><h2>Alimentos del día</h2><button className="secondary-button" type="button" onClick={() => { setIsAddingFood(true); setEditingEntry(null); }}><Plus size={15} aria-hidden="true" />Agregar alimento</button></div>
          {isAddingFood ? <FoodEntryEditor date={selectedDate} onClose={() => setIsAddingFood(false)} onSaved={refresh} /> : null}
          {day.isLoading ? <span className="meal-status">Cargando registros…</span> : null}
          {!day.isLoading && entries.length === 0 && !isAddingFood ? <span className="meal-empty">Sin alimentos registrados.</span> : null}
          <div className="meal-entry-list">
            {entries.map((entry) => editingEntry === entry.meal_log_entry_id ? <EntryEdit entry={entry} key={entry.meal_log_entry_id} onClose={() => setEditingEntry(null)} onSaved={refresh} /> : (
              <article className="meal-entry-row" key={entry.meal_log_entry_id}>
                <div><strong>{entry.description_snapshot}</strong><span>{numberFormat.format(entry.serving_grams)} g × {numberFormat.format(entry.quantity)} · {numberFormat.format(entry.calories_kcal)} kcal</span>{entry.notes ? <small>{entry.notes}</small> : null}</div>
                <div className="meal-entry-actions"><button className="meal-icon-button" type="button" title="Editar" aria-label={`Editar ${entry.description_snapshot}`} onClick={() => { setEditingEntry(entry.meal_log_entry_id); setIsAddingFood(false); }}><Pencil size={15} /></button><button className="meal-icon-button destructive" type="button" title="Eliminar" aria-label={`Eliminar ${entry.description_snapshot}`} onClick={() => void remove(entry)}><Trash2 size={15} /></button></div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="meal-nutrient-panel">
        <div className="meal-section-heading"><div><span className="workspace-eyebrow">Nutrientes consumidos</span><h2>Detalle del día</h2></div></div>
        <div className="meal-nutrient-list">
          {(totals?.nutrients ?? []).map((nutrient) => <div key={nutrient.nutrient_id}><span>{nutrient.name}</span><strong>{numberFormat.format(nutrient.total_amount)} {nutrient.unit_name}</strong></div>)}
          {!day.isLoading && (totals?.nutrients.length ?? 0) === 0 ? <span className="meal-empty">Agrega alimentos para ver sus nutrientes.</span> : null}
        </div>
      </section>
    </div>
  );
}
