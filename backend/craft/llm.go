package craft

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// ── Config ───────────────────────────────────────────────────────────────────

type LLMConfig struct {
	Endpoint string // Base URL, e.g. "http://localhost:11434"
	Model    string // e.g. "llama3.1:8b"
	Timeout  time.Duration
}

// ── Client ───────────────────────────────────────────────────────────────────

type LLMClient struct {
	cfg    LLMConfig
	client *http.Client
}

func NewLLMClient(cfg LLMConfig) *LLMClient {
	return &LLMClient{
		cfg:    cfg,
		client: &http.Client{Timeout: cfg.Timeout},
	}
}

// Model returns the configured model name (used for status display).
func (l *LLMClient) Model() string {
	return l.cfg.Model
}

// Ping checks whether Ollama is reachable by calling its lightweight /api/tags endpoint.
func (l *LLMClient) Ping(ctx context.Context) error {
	url := strings.TrimRight(l.cfg.Endpoint, "/") + "/api/tags"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := l.client.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ollama /api/tags returned status %d", resp.StatusCode)
	}
	return nil
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const systemPrompt = `You are the crafting game.
When given two elements or items to combine, respond ONLY with a valid JSON object.
No preamble, no explanation, no markdown fences. Just the raw JSON object.

Required schema:
{
  "name": "string (1 word, creative)",
  "description": "string (one evocative sentence, gen-z vibe)",
  "emoji": "string (single relevant emoji)"
}

Examples:
{"name":"Steam","description":"Scalding vapor that obscures and burns.","emoji":"♨️"}
{"name":"Lava","description":"Slow molten rock that obliterates whatever it touches.","emoji":"🌋"}
`

func buildPrompt(item1, item2 string, fixMode bool) string {
	base := fmt.Sprintf(`Combine "%s" and "%s". What is created?`, item1, item2)
	if fixMode {
		base += "\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY the JSON object, nothing else."
	}
	return base
}

// ── API ───────────────────────────────────────────────────────────────────────

// GenerateCombination asks the LLM what combining item1 and item2 produces.
func (l *LLMClient) GenerateCombination(ctx context.Context, item1, item2 string) (*Item, error) {
	return l.callWithRetry(ctx, item1, item2, false)
}

func (l *LLMClient) callWithRetry(ctx context.Context, item1, item2 string, fixMode bool) (*Item, error) {
	body, err := l.doRequest(ctx, buildPrompt(item1, item2, fixMode))
	if err != nil {
		return nil, err
	}
	result, err := parseItemJSON(body)
	if err != nil {
		if !fixMode {
			slog.Warn("llm: JSON parse error, retrying with fix prompt", "error", err)
			return l.callWithRetry(ctx, item1, item2, true)
		}
		return nil, fmt.Errorf("JSON parse failed after retry: %w", err)
	}
	sanitise(result)
	return result, nil
}

type ollamaRequest struct {
	Model   string        `json:"model"`
	Prompt  string        `json:"prompt"`
	System  string        `json:"system"`
	Stream  bool          `json:"stream"`
	Options ollamaOptions `json:"options"`
}

type ollamaOptions struct {
	Temperature float64 `json:"temperature"`
	NumPredict  int     `json:"num_predict"`
}

type ollamaResponse struct {
	Response string `json:"response"`
	Error    string `json:"error"`
}

func (l *LLMClient) doRequest(ctx context.Context, userPrompt string) (string, error) {
	req := ollamaRequest{
		Model:  l.cfg.Model,
		Prompt: userPrompt,
		System: systemPrompt,
		Stream: false,
	}
	req.Options.Temperature = 0.7
	req.Options.NumPredict = 300

	payload, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	url := strings.TrimRight(l.cfg.Endpoint, "/") + "/api/generate"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := l.client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("HTTP: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ollama returned status %d", resp.StatusCode)
	}

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read body: %w", err)
	}

	var ollamaResp ollamaResponse
	if err := json.Unmarshal(raw, &ollamaResp); err != nil {
		return "", fmt.Errorf("unmarshal response: %w", err)
	}
	if ollamaResp.Error != "" {
		return "", fmt.Errorf("ollama error: %s", ollamaResp.Error)
	}
	return ollamaResp.Response, nil
}

func parseItemJSON(raw string) (*Item, error) {
	cleaned := strings.TrimSpace(raw)
	if idx := strings.Index(cleaned, "{"); idx > 0 {
		cleaned = cleaned[idx:]
	}
	if idx := strings.LastIndex(cleaned, "}"); idx >= 0 {
		cleaned = cleaned[:idx+1]
	}
	var result Item
	if err := json.Unmarshal([]byte(cleaned), &result); err != nil {
		return nil, fmt.Errorf("unmarshal: %w (raw: %.200s)", err, cleaned)
	}
	return &result, nil
}

func sanitise(r *Item) {
	r.Name = strings.TrimSpace(r.Name)
	if r.Name == "" {
		r.Name = "Unknown"
	}
	if r.Emoji == "" {
		r.Emoji = "✨"
	}
}
