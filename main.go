package main

import (
	"context"
	"log"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug})))

	// "go run . serve" — start only the HTTP API server, no Wails window.
	// Use this alongside "npm run dev" when wails dev is unavailable (e.g. WSL2).
	if len(os.Args) > 1 && os.Args[1] == "serve" {
		app := NewApp()
		app.startup(context.Background())
		slog.Info("dev server ready — run 'npm run dev' in frontend/")
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		<-quit
		app.shutdown(context.Background())
		return
	}

	app := NewApp()
	err := wails.Run(&options.App{
		Title:     "Infinite Onslaught",
		Width:     1280,
		Height:    800,
		MinWidth:  1024,
		MinHeight: 640,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup:  app.startup,
		OnShutdown: app.shutdown,
		Bind: []interface{}{
			app,
		},
	})
	if err != nil {
		log.Fatal("Error:", err.Error())
	}
}
