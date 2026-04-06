package craft

import (
	"context"
	"fmt"
	"log/slog"

	"infiniteonslaught/app"
	"infiniteonslaught/app/craft/serializer"
	"infiniteonslaught/app/model"

	"infiniteonslaught/binder"

	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
)

type handler struct {
	cache ItemCache
	llm   LLMClient
}

type HandlerConfig struct {
	Cache ItemCache
	LLM   LLMClient
}

func NewHandler(cfg HandlerConfig) CraftHandler {
	return &handler{
		cache: cfg.Cache,
		llm:   cfg.LLM,
	}
}

type CraftHandler interface {
	Craft(c *gin.Context)
	ClearCraft(c *gin.Context)
	ListResorces(c *gin.Context)
}

func (h *handler) Craft(c *gin.Context) {
	ctx := c.Request.Context()
	req := new(serializer.CraftRequest)
	if err := binder.Bind(c, req); err != nil {
		c.Error(err)
		return
	}

	// check if item name from request is existed
	item1Data, err := getItem(h, ctx, req.Item1Name)
	if err != nil {
		app.ReturnInternalError(c, err.Error())
		return
	}
	if item1Data == nil {
		app.ReturnItemNotFound(c)
		return
	}

	item2Data, err := getItem(h, ctx, req.Item2Name)
	if err != nil {
		app.ReturnInternalError(c, err.Error())
		return
	}
	if item2Data == nil {
		app.ReturnItemNotFound(c)
		return
	}

	// find combination from redis
	result := new(model.Item)
	itemName, err := h.cache.GetCombination(ctx, req.Item1Name, req.Item2Name)
	if err != nil {
		app.ReturnInternalError(c, err.Error())
		return
	}
	if itemName == nil {
		//call ai for combind
		result, err = h.llm.GenerateCombination(ctx, req.Item1Name, req.Item2Name)
		if err != nil {
			app.ReturnInternalError(c, err.Error())
			return
		}
		result.CreatedFrom = [][]string{{req.Item1Name, req.Item2Name}}

		//[TODO: check if it already existed -> update create from -> return old value]

		// save to redis
		if err = h.cache.SetCombination(ctx, req.Item1Name, req.Item2Name, &result.Name); err != nil {
			app.ReturnInternalError(c, err.Error())
			return
		}

		if err = h.cache.SetItem(ctx, result); err != nil {
			app.ReturnInternalError(c, err.Error())
			return
		}

		slog.Info(fmt.Sprintf("new thing: %s + %s = %s", req.Item1Name, req.Item2Name, result.Name))

	} else {
		result, err = h.cache.GetItem(ctx, *itemName)
		if err != nil {
			app.ReturnInternalError(c, err.Error())
			return
		}
		if result == nil {
			app.ReturnItemNotFound(c)
			return
		}
	}

	slog.Info("handler: result", "result", result)
	app.ReturnSuccess(c, serializer.CraftResponseItem{
		Name:        result.Name,
		Description: result.Description,
		Emoji:       result.Emoji,
	})
}

func (h *handler) ClearCraft(c *gin.Context) {
	ctx := c.Request.Context()
	if err := h.cache.ClearCraft(ctx); err != nil {
		app.ReturnInternalError(c, err.Error())
		return
	}

	app.ReturnSuccess(c, nil)
}

func (h *handler) ListResorces(c *gin.Context) {
	items := model.Starter

	app.ReturnSuccess(c, serializer.ListResourcesResponse{
		Items: lo.Map(items, func(item model.Item, _ int) serializer.ListResourcesResponseItem {
			return serializer.ListResourcesResponseItem{
				Name:        item.Name,
				Description: item.Description,
				Emoji:       item.Emoji,
			}
		}),
	})
}

func getItem(h *handler, ctx context.Context, itemName string) (*model.Item, error) {
	for _, item := range model.Starter {
		if item.Name == itemName {
			return &item, nil
		}
	}
	return h.cache.GetItem(ctx, itemName)
}
