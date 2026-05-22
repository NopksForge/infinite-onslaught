package main

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"infiniteonslaught/backend"
	"infiniteonslaught/backend/craft"
)

// App is the main application struct. All exported methods are bound to the
// frontend via Wails and callable from TypeScript as window['go']['main']['App'].
type App struct {
	ctx context.Context
	db  *craft.DB
	llm *craft.LLMClient
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	db, err := craft.NewDB("game.db")
	if err != nil {
		slog.Error("failed to open database", "error", err)
		panic(err)
	}
	a.db = db

	a.llm = craft.NewLLMClient(craft.LLMConfig{
		Endpoint: "http://localhost:11434",
		Model:    "llama3.1:8b",
		Timeout:  30 * time.Second,
	})

	backend.StartAPIServer(a)
}

func (a *App) shutdown(_ context.Context) {
	if a.db != nil {
		if err := a.db.Close(); err != nil {
			slog.Error("failed to close database", "error", err)
		}
	}
}

// CheckOllama reports whether Ollama is reachable and which model is configured.
func (a *App) CheckOllama() backend.OllamaStatus {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := a.llm.Ping(ctx); err != nil {
		return backend.OllamaStatus{Ready: false, Error: err.Error()}
	}
	return backend.OllamaStatus{Ready: true, Model: a.llm.Model()}
}

// GetResources returns the primordial starter items plus any elements the
// player has unlocked via the NewElement modal.
func (a *App) GetResources() []craft.Item {
	out := append([]craft.Item{}, craft.Starter...)
	unlocked, err := a.db.ListUnlocks(context.Background())
	if err != nil {
		slog.Error("GetResources: list unlocks", "error", err)
		return out
	}
	for _, name := range unlocked {
		if item := craft.FindUnlockable(name); item != nil {
			out = append(out, *item)
		}
	}
	return out
}

// GetUnlockables returns the elements from the unlockable pool that the player
// has not unlocked yet. Used by the NewElement modal to present choices.
func (a *App) GetUnlockables() []craft.Item {
	ctx := context.Background()
	unlocked, err := a.db.ListUnlocks(ctx)
	if err != nil {
		slog.Error("GetUnlockables: list unlocks", "error", err)
		return nil
	}
	seen := make(map[string]struct{}, len(unlocked))
	for _, n := range unlocked {
		seen[n] = struct{}{}
	}
	out := make([]craft.Item, 0, len(craft.UnlockablePool))
	for _, item := range craft.UnlockablePool {
		if _, ok := seen[item.Name]; !ok {
			out = append(out, item)
		}
	}
	return out
}

// UnlockElement records that the player has chosen to add the named element
// to their resource pool. Returns the unlocked item.
func (a *App) UnlockElement(name string) (*craft.Item, error) {
	item := craft.FindUnlockable(name)
	if item == nil {
		return nil, fmt.Errorf("unknown unlockable element: %s", name)
	}
	if err := a.db.AddUnlock(context.Background(), name); err != nil {
		return nil, fmt.Errorf("persist unlock %q: %w", name, err)
	}
	slog.Info("unlocked element", "name", name)
	return item, nil
}

// Craft combines two items. It checks the SQLite cache first; on a miss it
// calls the Ollama LLM and persists the result.
func (a *App) Craft(item1Name, item2Name string) (*backend.CraftResult, error) {
	ctx := context.Background()

	if getItem(a, ctx, item1Name) == nil {
		return nil, fmt.Errorf("item not found: %s", item1Name)
	}
	if getItem(a, ctx, item2Name) == nil {
		return nil, fmt.Errorf("item not found: %s", item2Name)
	}

	var isNewItem, isNewCombination bool

	resultName, err := a.db.GetCombination(ctx, item1Name, item2Name)
	if err != nil {
		return nil, err
	}

	var result *craft.Item
	if resultName == nil {
		// Cache miss — ask the LLM.
		result, err = a.llm.GenerateCombination(ctx, item1Name, item2Name)
		if err != nil {
			return nil, err
		}
		result.CreatedFrom = [][]string{{item1Name, item2Name}}

		// Check whether the generated name is already known.
		existing, err := a.db.GetItem(ctx, result.Name)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			isNewItem = false
			isNewCombination = true
			existing.CreatedFrom = append(existing.CreatedFrom, result.CreatedFrom...)
			result = existing
		} else if isStarterItem(result.Name) {
			isNewItem = false
			isNewCombination = true
		} else {
			isNewItem = true
			isNewCombination = true
		}

		if err = a.db.SetCombination(ctx, item1Name, item2Name, result.Name); err != nil {
			return nil, err
		}
		if err = a.db.SetItem(ctx, result); err != nil {
			return nil, err
		}
	} else {
		// Cache hit — look up the stored item.
		isNewItem = false
		isNewCombination = false
		result, err = a.db.GetItem(ctx, *resultName)
		if err != nil {
			return nil, err
		}
		if result == nil {
			for _, s := range craft.Starter {
				if s.Name == *resultName {
					result = &s
					break
				}
			}
		}
		if result == nil {
			return nil, fmt.Errorf("item not found: %s", *resultName)
		}
	}

	slog.Info("craft result", "name", result.Name, "isNew", isNewItem, "type", result.DefenderType)
	return &backend.CraftResult{
		Name:             result.Name,
		Description:      result.Description,
		Emoji:            result.Emoji,
		CreatedFrom:      result.CreatedFrom,
		IsNewItem:        isNewItem,
		IsNewCombination: isNewCombination,
		DefenderType:     result.DefenderType,
		Stats:            result.Stats,
	}, nil
}

// ClearCraft wipes all discovered items and combinations from the database.
func (a *App) ClearCraft() error {
	return a.db.Clear(context.Background())
}

// ── helpers ──────────────────────────────────────────────────────────────────

func getItem(a *App, ctx context.Context, name string) *craft.Item {
	for i := range craft.Starter {
		if craft.Starter[i].Name == name {
			return &craft.Starter[i]
		}
	}
	item, _ := a.db.GetItem(ctx, name)
	return item
}

func isStarterItem(name string) bool {
	for _, s := range craft.Starter {
		if s.Name == name {
			return true
		}
	}
	return false
}
