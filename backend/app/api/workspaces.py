from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import AppWorkspace
from app.schemas import WorkspaceResponse

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceResponse])
async def list_workspaces(current_user: CurrentUser, db: DbSession) -> list[WorkspaceResponse]:
    result = await db.scalars(select(AppWorkspace).where(AppWorkspace.status == "active").order_by(AppWorkspace.sort_order))
    return [
        WorkspaceResponse(
            workspace_id=workspace.workspace_id,
            label=workspace.label,
            route=workspace.route,
            icon=workspace.icon,
            status=workspace.status,
            sort_order=workspace.sort_order,
        )
        for workspace in result.all()
    ]
