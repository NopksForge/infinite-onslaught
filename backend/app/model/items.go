package model

type Item struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Emoji       string     `json:"emoji"`
	CreatedFrom [][]string `json:"created_from"` // A slice of combinations, each can have many items
}

var Starter = []Item{
	{
		Name:        "Fire",
		Description: "Literally too hot to handle. Burn it all or light up your vibe.",
		Emoji:       "🔥",
		CreatedFrom: [][]string{},
	},
	{
		Name:        "Water",
		Description: "Stay hydrated or drown in the drip. Flow with the glow.",
		Emoji:       "💧",
		CreatedFrom: [][]string{},
	},
	{
		Name:        "Earth",
		Description: "Keep it grounded, grow your roots, and touch grass.",
		Emoji:       "🌱",
		CreatedFrom: [][]string{},
	},
	{
		Name:        "Air",
		Description: "Catch these vibes, float above the chaos, and just breeze.",
		Emoji:       "🌬️",
		CreatedFrom: [][]string{},
	},
}
