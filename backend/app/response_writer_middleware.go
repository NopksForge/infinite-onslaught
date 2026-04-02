package app

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"infiniteonslaught/serror"

	"github.com/gin-gonic/gin"
)

type Writer struct {
	gin.ResponseWriter
	statusCode int
	meta       map[string]string
}

func newWriter(w gin.ResponseWriter, meta map[string]string) *Writer {
	return &Writer{ResponseWriter: w, meta: meta}
}

func (w *Writer) Write(b []byte) (int, error) {
	if w.statusCode != http.StatusOK {
		var resp Response
		buf := bytes.NewBuffer(b)
		if err := json.NewDecoder(buf).Decode(&resp); err != nil {
			slog.Debug(err.Error())
			slog.Warn("response not standard")
		}

		if resp.Code == string(CodeSuccess) && resp.Message == "" && resp.Data == nil {
			slog.Warn("response not standard")
		}

		msg, attrs := serror.DecodeMessage(resp.Message)

		attrs = append(attrs, slog.String("status-code", strconv.Itoa(w.statusCode)))
		for k, v := range w.meta {
			attrs = append(attrs, slog.String(k, v))
		}
		if resp.Code != string(CodeSuccess) {
			attrs = append(attrs, slog.String("code", resp.Code))
		}

		var level slog.Level
		switch w.statusCode {
		case http.StatusBadRequest:
			level = slog.LevelError // our fail
		case http.StatusInternalServerError:
			level = slog.LevelError // its fail
		}

		slog.LogAttrs(context.Background(), level, msg, attrs...)

		if resp.Message != msg {
			var out bytes.Buffer
			json.HTMLEscape(&out, []byte(resp.Message))
			b = bytes.Replace(b, out.Bytes(), []byte(msg), 1)
		}
	}
	return w.ResponseWriter.Write(b)
}
func (w *Writer) WriteHeader(statusCode int) {
	w.statusCode = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

func AutoLoggingMiddleware(c *gin.Context) {
	meta := map[string]string{}
	if ref, ok := c.Request.Context().Value(refIDKey).(string); ok {
		meta[string(refIDKey)] = ref
	}

	c.Writer = newWriter(c.Writer, meta)
	c.Next()
}
