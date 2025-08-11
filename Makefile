# Story Twister - Docker Compose Commands

# Development Environment
.PHONY: dev-up dev-down dev-build dev-logs dev-ps

dev-up:
	docker-compose -f docker-compose.dev.yml up -d

dev-down:
	docker-compose -f docker-compose.dev.yml down

dev-build:
	docker-compose -f docker-compose.dev.yml up -d --build

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

dev-ps:
	docker-compose -f docker-compose.dev.yml ps

# Production Environment
.PHONY: prod-up prod-down prod-build prod-logs prod-ps

prod-up:
	docker-compose -f docker-compose.prod.yml up -d

prod-down:
	docker-compose -f docker-compose.prod.yml down

prod-build:
	docker-compose -f docker-compose.prod.yml up -d --build

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

prod-ps:
	docker-compose -f docker-compose.prod.yml ps

# Cleanup
.PHONY: clean

clean:
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose -f docker-compose.prod.yml down -v
	docker system prune -f
