package craft

// DefenderType categorizes how a crafted item behaves when deployed in the arena.
type DefenderType string

const (
	DefenderAliveMelee DefenderType = "alive_melee" // chases monsters and attacks in melee
	DefenderAliveRange DefenderType = "alive_range" // stationary ranged attacker
	DefenderSpell      DefenderType = "spell"       // one-time AOE on placement
	DefenderObstacle   DefenderType = "obstacle"    // blocks/damages monsters in contact
)

// DefenderStats holds LLM-assigned multipliers (0.5–3.0) applied on top of base stats.
type DefenderStats struct {
	SpeedMult    float64 `json:"speed_mult"`
	DamageMult   float64 `json:"damage_mult"`
	DurationMult float64 `json:"duration_mult"`
	RangeMult    float64 `json:"range_mult"`
	AreaMult     float64 `json:"area_mult"`
}

// Item is a craftable game element.
type Item struct {
	Name         string        `json:"name"`
	Description  string        `json:"description"`
	Emoji        string        `json:"emoji"`
	CreatedFrom  [][]string    `json:"created_from"`
	DefenderType DefenderType  `json:"defender_type"`
	Stats        DefenderStats `json:"stats"`
}

// Starter contains the four primordial elements available from the beginning.
var Starter = []Item{
	{
		Name:         "Fire",
		Description:  "Literally too hot to handle. Burn it all or light up your vibe.",
		Emoji:        "🔥",
		CreatedFrom:  [][]string{},
		DefenderType: DefenderAliveMelee,
		Stats:        DefenderStats{SpeedMult: 1.5, DamageMult: 2.0, DurationMult: 1.0, RangeMult: 0.8, AreaMult: 1.2},
	},
	{
		Name:         "Water",
		Description:  "Stay hydrated or drown in the drip. Flow with the glow.",
		Emoji:        "💧",
		CreatedFrom:  [][]string{},
		DefenderType: DefenderObstacle,
		Stats:        DefenderStats{SpeedMult: 0.5, DamageMult: 0.5, DurationMult: 1.5, RangeMult: 1.0, AreaMult: 1.5},
	},
	{
		Name:         "Earth",
		Description:  "Keep it grounded, grow your roots, and touch grass.",
		Emoji:        "🌱",
		CreatedFrom:  [][]string{},
		DefenderType: DefenderObstacle,
		Stats:        DefenderStats{SpeedMult: 0.5, DamageMult: 0.3, DurationMult: 2.5, RangeMult: 1.0, AreaMult: 1.2},
	},
	{
		Name:         "Air",
		Description:  "Catch these vibes, float above the chaos, and just breeze.",
		Emoji:        "🌬️",
		CreatedFrom:  [][]string{},
		DefenderType: DefenderAliveRange,
		Stats:        DefenderStats{SpeedMult: 1.0, DamageMult: 1.2, DurationMult: 1.0, RangeMult: 2.0, AreaMult: 1.0},
	},
}
