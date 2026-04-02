package app

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

type ResponseCode string

const (
	CodeSuccess          ResponseCode = "000"
	CodeFailedBadRequest ResponseCode = "400"
	CodeFailedNotFound   ResponseCode = "404"
	CodeFailedInternal   ResponseCode = "500"

	CodeItemNotFound ResponseCode = "I001"
)

func ReturnSuccess(c *gin.Context, data any) {
	c.JSON(http.StatusOK, Response{
		Code:    string(CodeSuccess),
		Message: "success",
		Data:    data,
	})
}

func ReturnBadRequest(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, Response{
		Code:    string(CodeFailedBadRequest),
		Message: "Bad request: " + message,
	})
}

func ReturnItemNotFound(c *gin.Context) {
	c.JSON(http.StatusOK, Response{
		Code:    string(CodeItemNotFound),
		Message: "Item not found",
	})
}

func ReturnInternalError(c *gin.Context, message string) {
	c.JSON(http.StatusInternalServerError, Response{
		Code:    string(CodeFailedInternal),
		Message: message,
	})
}
