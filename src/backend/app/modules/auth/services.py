from __future__ import annotations

import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt
from fastapi import HTTPException, status

from app.modules.auth.repositories import AuthRepository
from app.modules.auth.schemas import Token, UserSummary


class AuthService:
    def __init__(self, karag_manager: Any) -> None:
        self.karag_manager = karag_manager
        self.repository: AuthRepository = karag_manager.auth_repository
        self.secret_key = getattr(karag_manager.settings, "secret_key", None) or os.getenv("JWT_SECRET", "dev-secret")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60 * 24  # 1 day

    def hash_password(self, password: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode(), salt).decode()

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(UTC) + expires_delta
        else:
            expire = datetime.now(UTC) + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def login(self, email: str, password: str) -> Token:
        user = self.repository.get_user_by_email(email)
        if not user or not self.verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")

        expires_at = datetime.now(UTC) + timedelta(minutes=self.access_token_expire_minutes)
        access_token = self.create_access_token(
            data={"sub": user.id, "email": user.email, "org": user.organization_id},
            expires_delta=timedelta(minutes=self.access_token_expire_minutes)
        )
        
        # Optionally store session in DB
        self.repository.create_session(user.id, access_token, expires_at)
        
        return Token(access_token=access_token, expires_at=expires_at)

    def register(self, email: str, password: str, full_name: str | None = None, organization_id: str | None = None) -> UserSummary:
        if self.repository.get_user_by_email(email):
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_pw = self.hash_password(password)
        return self.repository.create_user(email, hashed_pw, full_name, organization_id)

    def get_current_user(self, token: str) -> UserSummary:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id: str = payload.get("sub")
            if user_id is None:
                raise HTTPException(status_code=401, detail="Invalid token")
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = self.repository.get_user_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return UserSummary.model_validate(user)
    def attach_role_to_user(
        self, 
        user_id: str, 
        organization_id: str, 
        role_name: str, 
        project_id: str | None = None
    ):
        role = self.karag_manager.roles.get_role_by_name(role_name)
        if not role:
            raise HTTPException(status_code=404, detail=f"Role {role_name} not found")
        
        return self.karag_manager.memberships.add_membership(
            user_id=user_id,
            organization_id=organization_id,
            project_id=project_id,
            role_id=role.id
        )
