package serializer

import (
	v "github.com/go-ozzo/ozzo-validation/v4"
)

type CraftRequest struct {
	Item1Name string `json:"item1_name"`
	Item2Name string `json:"item2_name"`
}

func (r CraftRequest) Validate() error {
	err := v.ValidateStruct(&r,
		v.Field(&r.Item1Name, v.Required),
		v.Field(&r.Item2Name, v.Required),
	)

	if err != nil {
		return err
	}

	return nil
}

type CraftResponseItem struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Emoji       string `json:"emoji"`
}
