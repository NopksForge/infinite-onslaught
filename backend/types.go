package backend

import "infiniteonslaught/backend/craft"

// OllamaStatus is returned by CheckOllama.
type OllamaStatus struct {
	Ready bool   `json:"ready"`
	Model string `json:"model"`
	Error string `json:"error,omitempty"`
}

// CraftResult is returned by Craft.
type CraftResult struct {
	Name             string            `json:"name"`
	Description      string            `json:"description"`
	Emoji            string            `json:"emoji"`
	CreatedFrom      [][]string        `json:"created_from"`
	IsNewItem        bool              `json:"is_new_item"`
	IsNewCombination bool              `json:"is_new_combination"`
	DefenderType     craft.DefenderType  `json:"defender_type"`
	Stats            craft.DefenderStats `json:"stats"`
}

// AppAPI mirrors the Wails-bound methods used by the HTTP fallback server.
type AppAPI interface {
	CheckOllama() OllamaStatus
	GetResources() []craft.Item
	Craft(item1, item2 string) (*CraftResult, error)
	ClearCraft() error
}
