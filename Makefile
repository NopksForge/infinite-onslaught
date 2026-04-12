# Infinite Onslaught — dev shortcuts (GNU Make)
# Backend must be `go run .` (not `go run main.go`) — this package has multiple .go files.

.DEFAULT_GOAL := help

.PHONY: help backend frontend dev \
	ollama-kill ollama-kill-linux ollama-kill-darwin ollama-kill-windows ollama-kill-windows-ps \
	ollama-fresh ollama-fresh-linux ollama-fresh-darwin ollama-fresh-windows ollama-fresh-windows-ps

# HTTP API on :8081 (foreground; Ctrl+C to stop)
backend:
	go run . -serve

# Vite dev server (foreground)
frontend:
	cd frontend && npm run dev

# API (:8081) + Vite in one terminal; Ctrl+C or quitting Vite stops the Go process too
dev:
	@bash -c 'go run . -serve & BACK_PID=$$!; trap "kill $$BACK_PID 2>/dev/null" EXIT INT TERM; cd frontend && npm run dev'

# ── Ollama: stop service / free :11434 (no ollama serve) ─────────────────────

ifeq ($(OS),Windows_NT)
OLLAMA_KILL := ollama-kill-windows
OLLAMA_FRESH := ollama-fresh-windows
else
UNAME_S := $(shell uname -s 2>/dev/null || echo unknown)
ifeq ($(UNAME_S),Darwin)
OLLAMA_KILL := ollama-kill-darwin
OLLAMA_FRESH := ollama-fresh-darwin
else
OLLAMA_KILL := ollama-kill-linux
OLLAMA_FRESH := ollama-fresh-linux
endif
endif

ollama-kill: $(OLLAMA_KILL)

ollama-kill-linux:
	sudo systemctl stop ollama 2>/dev/null || true
	-PID=$$(sudo lsof -ti tcp:11434 2>/dev/null); if [ -n "$$PID" ]; then sudo kill -9 $$PID; fi

ollama-kill-darwin:
	-brew services stop ollama 2>/dev/null || true
	-PID=$$(lsof -ti tcp:11434 2>/dev/null); if [ -n "$$PID" ]; then kill -9 $$PID; fi

# netstat last column = PID on LISTENING lines (English Windows)
ollama-kill-windows:
	cmd.exe /C "for /f \"tokens=5\" %%a in ('netstat -ano ^| findstr :11434') do @taskkill /F /PID %%a 2>nul"

ollama-kill-windows-ps:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$$p = Get-NetTCPConnection -LocalPort 11434 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($$p) { $$p | ForEach-Object { Stop-Process -Id $$_ -Force -ErrorAction SilentlyContinue } }"

# ── Ollama: kill then serve in foreground ───────────────────────────────────

ollama-fresh: ollama-kill
	ollama serve

ollama-fresh-linux: ollama-kill-linux
	ollama serve

ollama-fresh-darwin: ollama-kill-darwin
	ollama serve

ollama-fresh-windows: ollama-kill-windows
	ollama serve

ollama-fresh-windows-ps: ollama-kill-windows-ps
	ollama serve

# ── Help ─────────────────────────────────────────────────────────────────────

help:
	@echo "Infinite Onslaught — make targets"
	@echo ""
	@echo "  Development"
	@echo "    make backend              HTTP API on :8081 (go run . -serve, foreground)"
	@echo "    make frontend             cd frontend && npm run dev"
	@echo "    make dev                  go run + Vite together (one terminal; needs bash)"
	@echo ""
	@echo "  Ollama"
	@echo "    make ollama-kill          Stop Ollama (system/brew) and free port 11434"
	@echo "    make ollama-fresh         ollama-kill, then ollama serve (foreground)"
	@echo "    make ollama-fresh-linux   Same as ollama-fresh on Linux (explicit)"
	@echo "    make ollama-fresh-darwin  Same on macOS"
	@echo "    make ollama-fresh-windows netstat + taskkill, then ollama serve"
	@echo "    make ollama-fresh-windows-ps  PowerShell kill, then ollama serve"
	@echo ""
	@echo "  Other"
	@echo "    make help                 This message (default when you run: make)"
