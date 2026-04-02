package main

import (
	"context"
	"fmt"
	"infiniteonslaught/app"
	"infiniteonslaught/app/craft"
	"infiniteonslaught/config"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const (
	gracefulShutdownDuration = 10 * time.Second
	serverReadHeaderTimeout  = 5 * time.Second
	serverReadTimeout        = 5 * time.Second
	serverWriteTimeout       = 10 * time.Second // request hangup after this durations
	handlerTimeout           = serverWriteTimeout - (time.Millisecond * 100)
)

func main() {
	cfg := config.C()

	r, stop := router(cfg)
	defer stop()

	srv := &http.Server{
		Addr:              ":" + cfg.Server.Port,
		Handler:           r,
		ReadHeaderTimeout: serverReadHeaderTimeout,
		ReadTimeout:       serverReadTimeout,
		WriteTimeout:      serverWriteTimeout,
		MaxHeaderBytes:    1 << 20,
	}

	go gracefully(srv)

	slog.Info("run at :" + cfg.Server.Port)
	if err := srv.ListenAndServe(); err != http.ErrServerClosed {
		slog.Error("HTTP server ListenAndServe: " + err.Error())
		return
	}

	slog.Info("bye")
}

func router(cfg config.Config) (*gin.Engine, func()) {
	r := gin.New()
	r.Use(gin.Recovery())

	// health check handler
	{
		r.GET("/liveness", liveness())
		r.GET("/metrics", metrics())
		r.GET("/readiness", readiness())
	}

	r.Use(
		securityHeaders,
		accessControl,
		app.RefIDMiddleware(cfg.RefIDHeaderKey),
		app.AutoLoggingMiddleware,
		handlerTimeoutMiddleware,
	)

	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.Cache.RedisURL,
	})
	llmClient := craft.NewLLMClient(craft.LLMConfig{
		Endpoint: cfg.LLM.Endpoint,
		Model:    cfg.LLM.Model,
		Timeout:  cfg.LLM.Timeout,
	})
	if err := llmClient.Ping(context.Background()); err != nil {
		slog.Error("llm: ollama not reachable (%v)", err)
		panic(err)
	} else {
		slog.Info("llm: connected to %s (model: %s)", cfg.LLM.Endpoint, cfg.LLM.Model)
	}

	ItemCache := craft.NewItemCache(rdb)

	h := craft.NewHandler(craft.HandlerConfig{
		Cache: ItemCache,
		LLM:   llmClient,
	})
	{
		r.POST("/craft", h.GetCraft)
	}

	return r, func() {
		rdb.Close()
	}
}

func liveness() func(c *gin.Context) {
	h, err := os.Hostname()
	if err != nil {
		h = fmt.Sprintf("unknown host err: %s", err.Error())
	}
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"hostname": h,
			"time":     time.Now().Format(time.RFC3339),
		})
	}
}

func readiness() gin.HandlerFunc {
	// when the server go to ListenAndServe it means everything is ready to serve
	// no need and checking such as db checking again

	return func(c *gin.Context) {
		c.Status(http.StatusOK)
	}
}

func metrics() func(c *gin.Context) {
	return func(c *gin.Context) {
		var mem runtime.MemStats
		runtime.ReadMemStats(&mem)
		c.JSON(http.StatusOK, gin.H{
			"memory": gin.H{
				"alloc":        toMB(mem.Alloc),
				"totalAlloc":   toMB(mem.TotalAlloc),
				"sysAlloc":     toMB(mem.Sys),
				"heapInuse":    toMB(mem.HeapInuse),
				"heapIdle":     toMB(mem.HeapIdle),
				"heapReleased": toMB(mem.HeapReleased),
				"stackInuse":   toMB(mem.StackInuse),
				"stackSys":     toMB(mem.StackSys),
			},
		})
	}
}

type Size uint64

const (
	Byte Size = 1 << (10 * iota)
	KB
	MB
)

func megabytes(b uint64) float64 {
	return float64(b) / float64(MB)
}

func toMB(b uint64) string {
	return fmt.Sprintf("%.2f MB", megabytes(b))
}

func handlerTimeoutMiddleware(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), handlerTimeout)
	defer cancel()
	c.Request = c.Request.WithContext(ctx)
	c.Next()
}

func securityHeaders(c *gin.Context) {
	c.Header("X-Frame-Options", "DENY")
	c.Header("Content-Security-Policy", "default-src 'self'; connect-src *; font-src *; script-src-elem * 'unsafe-inline'; img-src * data:; style-src * 'unsafe-inline';")
	c.Header("X-XSS-Protection", "1; mode=block")
	c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
	c.Header("Referrer-Policy", "strict-origin")
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Permissions-Policy", "geolocation=(),midi=(),sync-xhr=(),microphone=(),camera=(),magnetometer=(),gyroscope=(),fullscreen=(self),payment=()")
	c.Next()
}

var headers = []string{
	"Content-Type",
	"Content-Length",
	"Accept-Encoding",
	"X-CSRF-Token",
	"Authorization",
	"accept",
	"origin",
	"Cache-Control",
	"X-Requested-With",
}

func accessControl(c *gin.Context) {
	cfg := config.C()
	c.Writer.Header().Set("Access-Control-Allow-Origin", cfg.AccessControl.AllowOrigin)
	c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS")
	c.Writer.Header().Set("Access-Control-Allow-Headers", strings.Join(headers, ","))
	if c.Request.Method == "OPTIONS" {
		c.AbortWithStatus(204)
		return
	}
	c.Next()
}

func gracefully(srv *http.Server) {
	{
		ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
		defer cancel()
		<-ctx.Done()
	}

	d := time.Duration(gracefulShutdownDuration)
	slog.Info(fmt.Sprintf("shutting down in %d ...\n", d))
	// We received an interrupt signal, shut down.
	ctx, cancel := context.WithTimeout(context.Background(), d)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		// Error from closing listeners, or context timeout:
		slog.Info("HTTP server Shutdown: " + err.Error())
	}
}
