from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from typing import Iterable

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CsrfGuard, CurrentUser, DbSession, SettingsDep
from app.core.security import utcnow
from app.models import UserMetricEntry, UserPreferenceItem
from app.schemas import (
    DashboardSummaryCard,
    HealthOverviewResponse,
    MetricEntryCreate,
    MetricEntryResponse,
    MetricPoint,
    MetricSeries,
    NutritionFocusItem,
    PreferenceGroup,
    PreferenceItemCreate,
    PreferenceItemResponse,
)

router = APIRouter(prefix="/users/me", tags=["personal-data"])


def _metric_response(entry: UserMetricEntry) -> MetricEntryResponse:
    return MetricEntryResponse(
        metric_entry_id=entry.metric_entry_id,
        metric_type=entry.metric_type,
        label=entry.label,
        recorded_at=entry.recorded_at,
        value_number=entry.value_number,
        value_text=entry.value_text,
        unit=entry.unit,
        source=entry.source,
        notes=entry.notes,
        metadata_json=entry.metadata_json,
    )


def _preference_response(item: UserPreferenceItem) -> PreferenceItemResponse:
    return PreferenceItemResponse(
        preference_id=item.preference_id,
        category=item.category,
        label=item.label,
        value=item.value,
        importance=item.importance,
        status=item.status,
        source=item.source,
        metadata_json=item.metadata_json,
    )


async def _ensure_demo_data(current_user: CurrentUser, db: DbSession) -> None:
    existing_metric = await db.scalar(
        select(UserMetricEntry.metric_entry_id).where(UserMetricEntry.user_id == current_user.user_id).limit(1)
    )
    existing_preference = await db.scalar(
        select(UserPreferenceItem.preference_id).where(UserPreferenceItem.user_id == current_user.user_id).limit(1)
    )
    if existing_metric and existing_preference:
        return

    now = utcnow()
    metric_seed = [
        ("weight", "Peso", "kg", [76.9, 76.8, 76.6, 76.7, 76.4, 76.3, 76.2]),
        ("sleep", "Sueño", "h", [6.7, 7.0, 6.9, 7.2, 7.1, 7.3, 7.0]),
        ("energy", "Energía", "/10", [6.4, 6.6, 6.8, 6.5, 7.0, 7.1, 6.9]),
        ("adherence", "Adherencia", "%", [74, 76, 78, 75, 80, 82, 81]),
    ]
    if not existing_metric:
        for metric_type, label, unit, values in metric_seed:
            for index, value in enumerate(values):
                db.add(
                    UserMetricEntry(
                        user_id=current_user.user_id,
                        metric_type=metric_type,
                        label=label,
                        unit=unit,
                        value_number=float(value),
                        recorded_at=now - timedelta(days=len(values) - index - 1),
                        source="demo_seed",
                        metadata_json={"demo": True, "cadence": "daily"},
                    )
                )

    preference_seed = [
        ("nutrition", "Proteína", "Mantener 1 fuente proteica principal en almuerzo y cena", 5),
        ("nutrition", "Desayuno", "Prefiere opciones simples: yogurt, avena, huevos o pan integral", 4),
        ("nutrition", "Cena", "Preferir cena liviana entre 20:00 y 21:30", 4),
        ("schedule", "Entrenamiento", "Fuerza 3 veces por semana después del trabajo", 4),
        ("schedule", "Preparación", "Cocinar base de almuerzos 2 veces por semana", 3),
        ("communication", "Explicación", "Resumen claro primero, evidencia y supuestos después", 5),
    ]
    if not existing_preference:
        for category, label, value, importance in preference_seed:
            db.add(
                UserPreferenceItem(
                    user_id=current_user.user_id,
                    category=category,
                    label=label,
                    value=value,
                    importance=importance,
                    status="active",
                    source="demo_seed",
                    metadata_json={"demo": True},
                )
            )
    await db.commit()


def _series_from_entries(entries: Iterable[UserMetricEntry]) -> list[MetricSeries]:
    grouped: dict[str, list[UserMetricEntry]] = defaultdict(list)
    for entry in entries:
        if entry.value_number is not None:
            grouped[entry.metric_type].append(entry)

    series: list[MetricSeries] = []
    for metric_type, metric_entries in grouped.items():
        ordered = sorted(metric_entries, key=lambda item: item.recorded_at)
        first = ordered[0].value_number or 0
        last = ordered[-1].value_number or 0
        delta = last - first
        unit = ordered[-1].unit
        sign = "+" if delta > 0 else ""
        change_label = f"{sign}{delta:.1f}{unit or ''}"
        trend_label = "Subiendo" if delta > 0 else "Bajando" if delta < 0 else "Estable"
        series.append(
            MetricSeries(
                metric_type=metric_type,
                label=ordered[-1].label,
                unit=unit,
                trend_label=trend_label,
                change_label=change_label,
                points=[
                    MetricPoint(
                        x=item.recorded_at.strftime("%d %b"),
                        value=float(item.value_number or 0),
                        recorded_at=item.recorded_at,
                    )
                    for item in ordered
                ],
            )
        )
    priority = {"weight": 10, "sleep": 20, "energy": 30, "adherence": 40}
    return sorted(series, key=lambda item: priority.get(item.metric_type, 99))


def _preference_groups(items: list[UserPreferenceItem]) -> list[PreferenceGroup]:
    titles = {
        "nutrition": "Preferencias alimentarias",
        "schedule": "Rutina y adherencia",
        "communication": "Cómo debe responder Victus",
    }
    grouped: dict[str, list[PreferenceItemResponse]] = defaultdict(list)
    for item in sorted(items, key=lambda row: (row.category, -row.importance, row.label)):
        grouped[item.category].append(_preference_response(item))
    return [
        PreferenceGroup(category=category, title=titles.get(category, category.title()), items=rows)
        for category, rows in grouped.items()
    ]


def _summary_cards(series: list[MetricSeries]) -> list[DashboardSummaryCard]:
    by_type = {item.metric_type: item for item in series}

    def latest(metric_type: str, fallback: str) -> tuple[str, str]:
        metric = by_type.get(metric_type)
        if not metric or not metric.points:
            return fallback, "Sin datos suficientes todavía"
        point = metric.points[-1]
        unit = metric.unit or ""
        return f"{point.value:g}{unit}", f"{metric.trend_label} · {metric.change_label} en 7 días"

    weight_value, weight_detail = latest("weight", "—")
    sleep_value, sleep_detail = latest("sleep", "—")
    adherence_value, adherence_detail = latest("adherence", "—")
    energy_value, energy_detail = latest("energy", "—")

    return [
        DashboardSummaryCard(label="Peso", value=weight_value, detail=weight_detail, tone="neutral"),
        DashboardSummaryCard(label="Sueño", value=sleep_value, detail=sleep_detail, tone="positive"),
        DashboardSummaryCard(label="Adherencia", value=adherence_value, detail=adherence_detail, tone="positive"),
        DashboardSummaryCard(label="Energía", value=energy_value, detail=energy_detail, tone="neutral"),
    ]


def _nutrition_focus(preferences: list[UserPreferenceItem]) -> list[NutritionFocusItem]:
    avoid = [item for item in preferences if "evitar" in item.value.lower() or "alergia" in item.value.lower()]
    return [
        NutritionFocusItem(
            title="Proteína distribuida",
            detail="Priorizar una fuente proteica en desayuno y almuerzo antes de optimizar detalles finos.",
            status="active",
        ),
        NutritionFocusItem(
            title="Restricciones primero",
            detail=avoid[0].value if avoid else "No hay restricciones críticas declaradas todavía.",
            status="guardrail",
        ),
        NutritionFocusItem(
            title="Cena liviana",
            detail="Mantener opciones simples para reducir fricción de adherencia durante la semana.",
            status="planned",
        ),
    ]



def _is_demo_user(current_user: CurrentUser, settings: SettingsDep) -> bool:
    return current_user.primary_email.strip().lower() == settings.demo_user_email.strip().lower()


def _reject_demo_write(current_user: CurrentUser, settings: SettingsDep) -> None:
    if _is_demo_user(current_user, settings):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El perfil demo es de solo lectura. Regístrate para guardar tus propios datos.",
        )

@router.get("/health-overview", response_model=HealthOverviewResponse)
async def get_health_overview(current_user: CurrentUser, db: DbSession, settings: SettingsDep) -> HealthOverviewResponse:
    await _ensure_demo_data(current_user, db)
    metrics = (
        await db.scalars(
            select(UserMetricEntry)
            .where(UserMetricEntry.user_id == current_user.user_id)
            .order_by(UserMetricEntry.metric_type, UserMetricEntry.recorded_at)
        )
    ).all()
    preferences = (
        await db.scalars(
            select(UserPreferenceItem)
            .where(UserPreferenceItem.user_id == current_user.user_id, UserPreferenceItem.status == "active")
            .order_by(UserPreferenceItem.category, UserPreferenceItem.label)
        )
    ).all()
    series = _series_from_entries(metrics)
    return HealthOverviewResponse(
        summary_cards=_summary_cards(series),
        metrics=series,
        preference_groups=_preference_groups(list(preferences)),
        nutrition_focus=_nutrition_focus(list(preferences)),
        read_only=_is_demo_user(current_user, settings),
        profile_label="Perfil demo: hombre adulto estándar" if _is_demo_user(current_user, settings) else None,
        profile_note="Datos ficticios de referencia para conocer capacidades. No se pueden modificar." if _is_demo_user(current_user, settings) else None,
    )


@router.post("/metrics", response_model=MetricEntryResponse, status_code=201)
async def create_metric_entry(
    payload: MetricEntryCreate,
    _csrf: CsrfGuard,
    current_user: CurrentUser,
    db: DbSession,
    settings: SettingsDep,
) -> MetricEntryResponse:
    _reject_demo_write(current_user, settings)
    entry = UserMetricEntry(
        user_id=current_user.user_id,
        metric_type=payload.metric_type,
        label=payload.label,
        recorded_at=payload.recorded_at or utcnow(),
        value_number=payload.value_number,
        value_text=payload.value_text,
        unit=payload.unit,
        source=payload.source,
        notes=payload.notes,
        metadata_json=payload.metadata_json,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return _metric_response(entry)


@router.post("/preferences", response_model=PreferenceItemResponse, status_code=201)
async def create_preference_item(
    payload: PreferenceItemCreate,
    _csrf: CsrfGuard,
    current_user: CurrentUser,
    db: DbSession,
    settings: SettingsDep,
) -> PreferenceItemResponse:
    _reject_demo_write(current_user, settings)
    item = UserPreferenceItem(
        user_id=current_user.user_id,
        category=payload.category,
        label=payload.label,
        value=payload.value,
        importance=payload.importance,
        status=payload.status,
        source=payload.source,
        metadata_json=payload.metadata_json,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _preference_response(item)
