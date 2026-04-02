package craft

import (
	"context"
	"encoding/json"
	"fmt"
	"infiniteonslaught/app/model"

	"github.com/redis/go-redis/v9"
)

const (
	KeyItem        = "ITEM:%s"
	KeyCombination = "COMBINATION:%s:%s"
)

type ItemCache struct {
	rdb *redis.Client
}

func NewItemCache(rdb *redis.Client) ItemCache {
	return ItemCache{rdb: rdb}
}

// ── Item ────────────────────────────────────────────────────────────────

func (c *ItemCache) GetItem(ctx context.Context, name string) (*model.Item, error) {
	key := fmt.Sprintf(KeyItem, name)

	var item model.Item
	data, err := c.rdb.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get item from cache: %w", err)
	}

	if err := json.Unmarshal([]byte(data), &item); err != nil {
		return nil, fmt.Errorf("failed to unmarshal item: %w", err)
	}
	return &item, nil
}

func (c *ItemCache) SetItem(ctx context.Context, item *model.Item) error {
	key := fmt.Sprintf(KeyItem, item.Name)

	data, err := json.Marshal(item)
	if err != nil {
		return fmt.Errorf("failed to marshal item: %w", err)
	}
	return c.rdb.Set(ctx, key, data, 0).Err()
}

// ── Combination ────────────────────────────────────────────────────────────────

func (c *ItemCache) GetCombination(ctx context.Context, item1Name, item2Name string) (*string, error) {
	key := generateCombinationKey(item1Name, item2Name)

	data, err := c.rdb.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get combination from cache: %w", err)
	}
	return &data, nil
}

func (c *ItemCache) SetCombination(ctx context.Context, item1Name, item2Name string, combination *string) error {
	key := generateCombinationKey(item1Name, item2Name)
	return c.rdb.Set(ctx, key, combination, 0).Err()
}

func generateCombinationKey(item1Name, item2Name string) string {
	//sort
	if item1Name > item2Name {
		item1Name, item2Name = item2Name, item1Name
	}
	return fmt.Sprintf(KeyCombination, item1Name, item2Name)
}
