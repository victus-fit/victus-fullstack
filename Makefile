.PHONY: init up down restart logs ps health reset

init:
	./scripts/victus init

up:
	./scripts/victus up

down:
	./scripts/victus down

restart:
	./scripts/victus restart

logs:
	./scripts/victus logs

ps:
	./scripts/victus ps

health:
	./scripts/victus health

reset:
	./scripts/victus reset
