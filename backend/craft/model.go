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

// UnlockablePool contains additional primordial elements that the player can
// unlock at level milestones. These are not craftable; they appear in the
// resource panel only after the player picks them in the NewElement modal.
var UnlockablePool = []Item{
	{
		Name:         "Ice",
		Description:  "Frozen breath of the void. Walls everything in shimmering still.",
		Emoji:        "🧊",
		CreatedFrom:  [][]string{},
		DefenderType: DefenderObstacle,
		Stats:        DefenderStats{SpeedMult: 0.5, DamageMult: 0.8, DurationMult: 2.0, RangeMult: 1.2, AreaMult: 1.3},
	},
	{
		Name:         "Thunder",
		Description:  "Electric judgment. Loud, fast, and absolutely unsubtle.",
		Emoji:        "⚡",
		CreatedFrom:  [][]string{},
		DefenderType: DefenderSpell,
		Stats:        DefenderStats{SpeedMult: 1.0, DamageMult: 2.2, DurationMult: 0.7, RangeMult: 1.5, AreaMult: 2.0},
	},
	{
		Name:         "Sand",
		Description:  "Endless dunes that bury the careless and grind the bold.",
		Emoji:        "🏜️",
		CreatedFrom:  [][]string{},
		DefenderType: DefenderAliveMelee,
		Stats:        DefenderStats{SpeedMult: 0.9, DamageMult: 1.4, DurationMult: 1.3, RangeMult: 0.9, AreaMult: 1.1},
	},
	{
		Name:         "Light",
		Description:  "Pure radiance. Pierces armor and questionable life choices alike.",
		Emoji:        "✨",
		CreatedFrom:  [][]string{},
		DefenderType: DefenderAliveRange,
		Stats:        DefenderStats{SpeedMult: 1.2, DamageMult: 1.6, DurationMult: 1.0, RangeMult: 2.2, AreaMult: 1.0},
	},
	{
		Name:         "Metal",
		Description:  "Tempered alloy forged in chaos. Cold, heavy, unyielding.",
		Emoji:        "⛓️",
		CreatedFrom:  [][]string{},
		DefenderType: DefenderObstacle,
		Stats:        DefenderStats{SpeedMult: 0.5, DamageMult: 1.0, DurationMult: 2.8, RangeMult: 1.0, AreaMult: 1.0},
	},
	{
		Name:         "Wood",
		Description:  "Living timber, gnarled and stubborn. Roots that refuse to give.",
		Emoji:        "🪵",
		CreatedFrom:  [][]string{},
		DefenderType: DefenderObstacle,
		Stats:        DefenderStats{SpeedMult: 0.5, DamageMult: 0.6, DurationMult: 2.2, RangeMult: 1.0, AreaMult: 1.1},
	},
}

// FindUnlockable returns a pointer to the unlockable item with the given name,
// or nil if no such element exists in the pool.
func FindUnlockable(name string) *Item {
	for i := range UnlockablePool {
		if UnlockablePool[i].Name == name {
			return &UnlockablePool[i]
		}
	}
	return nil
}
