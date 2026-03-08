backend-install:
	cd src/backend && uv sync

backend-dev:
	cd src/backend && uv run uvicorn app.main:app --reload

backend-test:
	cd src/backend && uv run pytest

frontend-install:
	cd src/frontend && corepack pnpm install

frontend-dev:
	cd src/frontend && corepack pnpm dev

frontend-build:
	cd src/frontend && corepack pnpm build

compose-config:
	docker compose --profile cpu config > NUL

compose-config-gpu:
	docker compose --profile gpu config > NUL

helm-lint:
	helm lint deploy/helm/rag-platform

compose-up:
	docker compose --profile cpu up --build

compose-up-gpu:
	docker compose --profile cpu --profile gpu up --build

compose-down:
	docker compose down --remove-orphans

test:
	cd src/backend && uv run pytest
