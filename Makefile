backend-install:
	cd src/backend && uv sync

backend-dev:
	cd src/backend && uv run uvicorn app.main:app --reload

backend-test:
	cd src/backend && uv run pytest

frontend-install:
	cd src/frontend && pnpm install

frontend-dev:
	cd src/frontend && pnpm dev

frontend-build:
	cd src/frontend && pnpm build

test:
	cd src/backend && uv run pytest
