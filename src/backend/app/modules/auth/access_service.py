from __future__ import annotations
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Predefined role-to-permission mapping for Phase 1
DEFAULT_ROLE_PERMISSIONS = {
    "admin": {
        "org.admin", "org.view", "org.edit",
        "project.create", "project.view", "project.edit", "project.delete",
        "workspace.create", "workspace.view", "workspace.edit", "workspace.delete",
        "doc.upload", "doc.view", "doc.delete",
        "chat.session", "chat.ask"
    },
    "member": {
        "org.view",
        "project.view",
        "workspace.create", "workspace.view", "workspace.edit",
        "doc.upload", "doc.view",
        "chat.session", "chat.ask"
    },
    "viewer": {
        "org.view",
        "project.view",
        "workspace.view",
        "doc.view",
        "chat.ask"
    }
}

class AccessService:
    """
    Central authority for role-based access control.
    Calculates permissions based on memberships and scope.
    """
    def __init__(self, karag_manager: Any) -> None:
        self.karag_manager = karag_manager

    def get_effective_permissions(
        self, 
        user_id: str, 
        organization_id: str, 
        project_id: str | None = None
    ) -> set[str]:
        """
        Calculates the set of permissions the user has for a given scope.
        """
        memberships = self.karag_manager.memberships.list_user_memberships(user_id)
        effective_permissions = set()

        for m in memberships:
            # Org-level membership
            if m.organization_id == organization_id and m.project_id is None:
                role = self.karag_manager.roles.get_role_by_id(m.role_id)
                if role and role.name in DEFAULT_ROLE_PERMISSIONS:
                    effective_permissions.update(DEFAULT_ROLE_PERMISSIONS[role.name])
            
            # Project-level membership (overrides or adds to org-level)
            if project_id and m.organization_id == organization_id and m.project_id == project_id:
                role = self.karag_manager.roles.get_role_by_id(m.role_id)
                if role and role.name in DEFAULT_ROLE_PERMISSIONS:
                    effective_permissions.update(DEFAULT_ROLE_PERMISSIONS[role.name])

        return effective_permissions

    def has_permission(
        self, 
        user_id: str, 
        permission_code: str, 
        organization_id: str, 
        project_id: str | None = None
    ) -> bool:
        perms = self.get_effective_permissions(user_id, organization_id, project_id)
        return permission_code in perms
