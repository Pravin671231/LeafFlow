.PHONY: dev down logs ps

dev: ## Start all services in the foreground (hot-reload)
	docker compose up

down: ## Stop all containers and remove the mongo_data volume
	docker compose down -v

logs: ## Tail logs from all running services
	docker compose logs -f

ps: ## Show running container status
	docker compose ps
