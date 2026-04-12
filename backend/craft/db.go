package craft

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	_ "modernc.org/sqlite"
)

// DB wraps a SQLite connection and provides CRUD for items and combinations.
// It uses modernc.org/sqlite which is a pure-Go driver — no CGO required.
type DB struct {
	conn *sql.DB
}

// NewDB opens (or creates) a SQLite database at path and initialises the schema.
func NewDB(path string) (*DB, error) {
	conn, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite %q: %w", path, err)
	}
	conn.SetMaxOpenConns(1) // SQLite is single-writer
	if err := migrateSchema(conn); err != nil {
		conn.Close()
		return nil, fmt.Errorf("migrate schema: %w", err)
	}
	return &DB{conn: conn}, nil
}

func migrateSchema(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS items (
			name         TEXT PRIMARY KEY,
			description  TEXT NOT NULL DEFAULT '',
			emoji        TEXT NOT NULL DEFAULT '',
			created_from TEXT NOT NULL DEFAULT '[]'
		);
		CREATE TABLE IF NOT EXISTS combinations (
			key         TEXT PRIMARY KEY,
			result_name TEXT NOT NULL
		);
	`)
	return err
}

// ── Item ─────────────────────────────────────────────────────────────────────

func (d *DB) GetItem(ctx context.Context, name string) (*Item, error) {
	row := d.conn.QueryRowContext(ctx,
		`SELECT name, description, emoji, created_from FROM items WHERE name = ?`, name)

	var item Item
	var createdFromJSON string
	err := row.Scan(&item.Name, &item.Description, &item.Emoji, &createdFromJSON)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get item %q: %w", name, err)
	}
	if err := json.Unmarshal([]byte(createdFromJSON), &item.CreatedFrom); err != nil {
		item.CreatedFrom = [][]string{}
	}
	return &item, nil
}

func (d *DB) SetItem(ctx context.Context, item *Item) error {
	createdFromJSON, err := json.Marshal(item.CreatedFrom)
	if err != nil {
		return fmt.Errorf("marshal created_from: %w", err)
	}
	_, err = d.conn.ExecContext(ctx,
		`INSERT OR REPLACE INTO items (name, description, emoji, created_from)
		 VALUES (?, ?, ?, ?)`,
		item.Name, item.Description, item.Emoji, string(createdFromJSON))
	return err
}

// ── Combination ──────────────────────────────────────────────────────────────

func (d *DB) GetCombination(ctx context.Context, item1, item2 string) (*string, error) {
	key := combinationKey(item1, item2)
	row := d.conn.QueryRowContext(ctx,
		`SELECT result_name FROM combinations WHERE key = ?`, key)
	var result string
	err := row.Scan(&result)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get combination %q: %w", key, err)
	}
	return &result, nil
}

func (d *DB) SetCombination(ctx context.Context, item1, item2, resultName string) error {
	key := combinationKey(item1, item2)
	_, err := d.conn.ExecContext(ctx,
		`INSERT OR REPLACE INTO combinations (key, result_name) VALUES (?, ?)`,
		key, resultName)
	return err
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

// Clear deletes all discovered items and combinations (resets the game).
func (d *DB) Clear(ctx context.Context) error {
	_, err := d.conn.ExecContext(ctx, `DELETE FROM items; DELETE FROM combinations;`)
	return err
}

func (d *DB) Close() error {
	return d.conn.Close()
}

// ── helpers ──────────────────────────────────────────────────────────────────

// combinationKey returns a deterministic key for a pair of item names.
func combinationKey(a, b string) string {
	if a > b {
		a, b = b, a
	}
	return a + ":" + b
}
