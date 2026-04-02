package app

type ctxKey string

const (
	refIDKey               ctxKey = "ref-id"
	forwardCtxKey          ctxKey = "forwarding"
	RedisUserKey           ctxKey = "user"
	KafkaTopicUserCreation ctxKey = "user-creation"
)

const (
	ErrorInternal = "internal server error"
	ErrorCache    = "failed to set/get cache"
)
