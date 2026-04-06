package serializer

type ListResourcesRequest struct {
}

func (r ListResourcesRequest) Validate() error {

	return nil
}

type ListResourcesResponse struct {
	Items []ListResourcesResponseItem `json:"items"`
}

type ListResourcesResponseItem struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Emoji       string `json:"emoji"`
}
