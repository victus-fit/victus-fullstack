import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import type { FoodSearchResponse } from '../userData/types';

const days = [
  ['Monday', 'Greek yogurt oats', 'Chicken rice bowl', 'Salmon potatoes', 'Fruit and whey'],
  ['Tuesday', 'Egg toast', 'Turkey pasta', 'Beef stir fry', 'Cottage cheese fruit'],
  ['Wednesday', 'Protein oatmeal', 'Tuna potato salad', 'Chicken wraps', 'Yogurt berries'],
  ['Thursday', 'Greek yogurt oats', 'Chicken rice bowl', 'Salmon potatoes', 'Fruit and whey'],
  ['Friday', 'Egg toast', 'Turkey pasta', 'Beef stir fry', 'Cottage cheese fruit'],
  ['Saturday', 'Protein oatmeal', 'Tuna potato salad', 'Chicken wraps', 'Yogurt berries'],
  ['Sunday', 'Greek yogurt oats', 'Chicken rice bowl', 'Salmon potatoes', 'Fruit and whey'],
] as const;

export function DemoCurrentDiet() {
  const { language } = useLanguage();
  const todayIndex = (new Date().getDay() + 6) % 7;
  const [selected, setSelected] = useState(todayIndex);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResponse['results']>([]);
  const [searching, setSearching] = useState(false);
  const labels = language === 'es' ? { title: 'Dieta actual', note: 'Perfil demo de David · solo lectura', search: 'Buscar alimentos', meals: 'Comidas del día', target: 'Objetivo diario', empty: 'Escribe al menos 2 caracteres.' } : { title: 'Current diet', note: 'David demo profile · read only', search: 'Search foods', meals: 'Meals for the day', target: 'Daily target', empty: 'Type at least 2 characters.' };
  useEffect(() => { const term = query.trim(); if (term.length < 2) { setResults([]); return; } const abort = new AbortController(); const timer = window.setTimeout(() => { setSearching(true); void apiFetch<FoodSearchResponse>(`/api/demo/foods/search?q=${encodeURIComponent(term)}`, { signal: abort.signal }).then((response) => setResults(response.results)).catch(() => setResults([])).finally(() => setSearching(false)); }, 300); return () => { abort.abort(); window.clearTimeout(timer); }; }, [query]);
  const day = days[selected]!;
  const weekStart = new Date();
  weekStart.setHours(12, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - todayIndex);
  const dateFor = (index: number) => { const value = new Date(weekStart); value.setDate(weekStart.getDate() + index); return value; };
  const weekday = new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { weekday: 'short' });
  return <main className="workspace-main data-main demo-current-diet"><header className="workspace-header"><div className="header-title"><strong>{labels.title}</strong><span>{labels.note}</span></div></header><div className="workspace-motion"><div className="meal-log-layout"><section className="meal-calendar-panel"><div className="meal-calendar-heading"><div><span className="workspace-eyebrow">DAVID · DAVID-V1</span><h1>{labels.title}</h1></div><div className="meal-summary-grid"><div><span>Calories</span><strong>2,400 kcal</strong></div><div><span>Protein</span><strong>170 g</strong></div></div></div><div className="meal-week-grid">{days.map(([name], index) => { const date = dateFor(index); return <button className={`meal-day-button${index === selected ? ' is-active' : ''}`} type="button" key={name} onClick={() => setSelected(index)}><span>{weekday.format(date).replace('.', '')}</span><strong>{date.getDate()}</strong><small>{index === todayIndex ? (language === 'es' ? 'Hoy' : 'Today') : '2,400 kcal'}</small></button>; })}</div></section><section className="meal-section"><div className="meal-section-heading"><h2>{labels.meals}</h2></div><div className="meal-entry-list">{day.slice(1).map((meal, index) => <article className="meal-entry-row" key={meal}><div><strong>{meal}</strong><span>{['Breakfast', 'Lunch', 'Dinner', 'Snack'][index]} · David's fixed plan</span></div><strong>{[520, 760, 700, 420][index]} kcal</strong></article>)}</div></section><section className="meal-section"><div className="meal-section-heading"><h2>{labels.search}</h2></div><div className="meal-editor-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} /></div>{query.trim().length < 2 ? <p className="meal-empty">{labels.empty}</p> : null}{searching ? <p className="meal-status">Searching…</p> : null}<div className="food-search-results">{results.map((food) => <div className="food-search-result" key={food.food_id}><span>{food.name}</span><small>{food.calories_kcal ?? '—'} kcal · P {food.protein_g ?? '—'} g</small></div>)}</div></section><section className="meal-nutrient-panel"><span className="workspace-eyebrow">{labels.target}</span><div className="meal-summary-grid"><div><span>Calories</span><strong>2,400 kcal</strong></div><div><span>Protein</span><strong>170 g</strong></div><div><span>Carbohydrates</span><strong>270 g</strong></div><div><span>Fat</span><strong>75 g</strong></div></div></section></div></div></main>;
}
