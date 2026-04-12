//go:build dev

package main

import "embed"

// In dev mode Wails serves the frontend from the Vite dev server,
// so no embedded assets are needed.
var assets embed.FS
