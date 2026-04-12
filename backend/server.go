package backend

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

const apiPort = ":8081"

// StartAPIServer launches a localhost HTTP server that mirrors the Wails bound
// methods. The frontend falls back to this when the Wails bridge is unavailable
// (e.g. opening the Vite dev server URL directly in a browser).
func StartAPIServer(app AppAPI) {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/ollama-status", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, app.CheckOllama())
	})

	mux.HandleFunc("GET /api/resources", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, app.GetResources())
	})

	mux.HandleFunc("POST /api/craft", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Item1 string `json:"item1"`
			Item2 string `json:"item2"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			slog.Error("POST /api/craft: decode body", "error", err)
			writeError(w, err.Error(), http.StatusBadRequest)
			return
		}
		result, err := app.Craft(body.Item1, body.Item2)
		if err != nil {
			slog.Error("POST /api/craft: Craft failed", "item1", body.Item1, "item2", body.Item2, "error", err)
			writeError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, result)
	})

	mux.HandleFunc("DELETE /api/craft", func(w http.ResponseWriter, _ *http.Request) {
		if err := app.ClearCraft(); err != nil {
			slog.Error("DELETE /api/craft: ClearCraft failed", "error", err)
			writeError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	srv := &http.Server{
		Addr:    apiPort,
		Handler: corsMiddleware(logMiddleware(mux)),
	}

	go func() {
		slog.Info("API server listening", "addr", apiPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("API server error", "error", err)
		}
	}()
}

func logMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		slog.Debug("http request", "method", r.Method, "path", r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("writeJSON encode", "error", err)
	}
}

func writeError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
