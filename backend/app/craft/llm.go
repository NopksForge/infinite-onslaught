package craft

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"infiniteonslaught/app/model"
	"io"
	"log"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// ── Init ──────────────────────────────────────────────────────────────────

type LLMClient struct {
	cfg    LLMConfig
	client *http.Client
}

type LLMConfig struct {
	Endpoint string
	Model    string
	Timeout  time.Duration
}

func NewLLMClient(cfg LLMConfig) LLMClient {
	return LLMClient{
		cfg:    cfg,
		client: &http.Client{Timeout: cfg.Timeout},
	}
}

// Ping checks if Ollama is reachable (calls /api/tags which is a lightweight endpoint).
func (l *LLMClient) Ping(ctx context.Context) error {
	url := strings.Replace(l.cfg.Endpoint, "/api/generate", "/api/tags", 1)
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
		return fmt.Errorf("unexpected status %d", resp.StatusCode)
	}
	return nil
}

// ── Prompts ────────────────────────────────────────────────────────────────

func buildPrompt(item1, item2 string, fixMode bool) string {
	base := fmt.Sprintf(`Combine "%s" and "%s". What is created?`, item1, item2)
	if fixMode {
		base += "\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY the JSON object, nothing else. No explanation, no markdown."
	}
	return base
}

const systemPrompt = `You are the crafting game.
When given two elements or items to combine, respond ONLY with a valid JSON object.
No preamble, no explanation, no markdown fences. Just the raw JSON object.
 
Required schema:
{
  "name": "string (1 words, creative)",
  "description": "string (one evocative sentence, gen-z vibe)",
  "emoji": "string (single relevant emoji)",
}
 
Examples:
{"name":"Steam","description":"Scalding vapor that obscures and burns.","emoji":"♨️"}
{"name":"Lava","description":"Slow molten rock that obliterates whatever it touches.","emoji":"🌋"}
`

// ── Main API ─────────────────────────────────────────────────────────────

// GenerateCombination asks the LLM what combining item1 and item2 produces.
// On any failure it returns a deterministic fallback result so the game never blocks.
func (l *LLMClient) GenerateCombination(ctx context.Context, item1, item2 string) (*model.Item, error) {
	result, err := l.callWithRetry(ctx, item1, item2, false)
	if err != nil {
		slog.Error("llm: failed call llm", "error", err)
		return nil, err
	}
	return result, nil
}

// ── Internal func ─────────────────────────────────────────────────────────

func (l *LLMClient) callWithRetry(ctx context.Context, item1, item2 string, fixMode bool) (*model.Item, error) {
	prompt := buildPrompt(item1, item2, fixMode)

	body, err := l.doRequest(ctx, prompt)
	if err != nil {
		return nil, err
	}

	result, err := parseItemJSON(body)
	if err != nil {
		if !fixMode {
			// One retry with an explicit fix instruction
			log.Printf("llm: JSON parse error (%v), retrying with fix prompt", err)
			return l.callWithRetry(ctx, item1, item2, true)
		}
		return nil, fmt.Errorf("JSON parse failed after retry: %w", err)
	}

	sanitise(result)
	return result, nil
}

func (l *LLMClient) doRequest(ctx context.Context, userPrompt string) (string, error) {
	req := model.OllamaRequest{
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

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("%s/api/generate", l.cfg.Endpoint), bytes.NewReader(payload))
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

	var ollamaResp model.OllamaResponse
	if err := json.Unmarshal(raw, &ollamaResp); err != nil {
		return "", fmt.Errorf("unmarshal ollama response: %w", err)
	}
	if ollamaResp.Error != "" {
		return "", fmt.Errorf("ollama error: %s", ollamaResp.Error)
	}

	return ollamaResp.Response, nil
}

// parseItemJSON strips optional markdown fences then decodes the JSON.
func parseItemJSON(raw string) (*model.Item, error) {
	// Strip ```json ... ``` or ``` ... ``` wrappers the model sometimes adds
	cleaned := strings.TrimSpace(raw)
	if idx := strings.Index(cleaned, "{"); idx > 0 {
		cleaned = cleaned[idx:]
	}
	if idx := strings.LastIndex(cleaned, "}"); idx >= 0 {
		cleaned = cleaned[:idx+1]
	}

	var result model.Item
	if err := json.Unmarshal([]byte(cleaned), &result); err != nil {
		return nil, fmt.Errorf("unmarshal ItemResult: %w (raw: %.200s)", err, cleaned)
	}
	return &result, nil
}

// sanitise clamps values to valid ranges and fills obvious blanks.
func sanitise(r *model.Item) {
	r.Name = strings.TrimSpace(r.Name)
	if r.Name == "" {
		r.Name = "Unknown"
	}

	// validRarities := map[string]bool{
	// 	"common": true, "uncommon": true, "rare": true, "epic": true, "legendary": true,
	// }
	// if !validRarities[r.Rarity] {
	// 	r.Rarity = "common"
	// }

	if r.Emoji == "" {
		r.Emoji = "✨"
	}
}
