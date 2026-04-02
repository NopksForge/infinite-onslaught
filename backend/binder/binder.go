package binder

import (
	"github.com/gin-gonic/gin"
)

// Serializer interface enforces the Validate method
type Serializer interface {
	Validate() error
}

// Binder extracts data from headers, body, and params, then validates
func Bind(ctx *gin.Context, ser Serializer) error {
	// Bind data
	if err := ctx.ShouldBindUri(ser); err != nil {
		return ctx.Error(err).SetType(gin.ErrorTypeBind)
	}

	if err := ctx.ShouldBindQuery(ser); err != nil {
		return ctx.Error(err).SetType(gin.ErrorTypeBind)
	}

	if err := ctx.ShouldBind(ser); err != nil {
		return ctx.Error(err).SetType(gin.ErrorTypeBind)
	}

	if err := ctx.ShouldBindHeader(ser); err != nil {
		return ctx.Error(err).SetType(gin.ErrorTypeBind)
	}

	// Validate request using ozzo-validation
	if err := ser.Validate(); err != nil {
		return err
	}

	return nil
}
