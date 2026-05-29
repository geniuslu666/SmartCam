package errors

type APIError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Detail  string `json:"error,omitempty"`
}

func NewAPIError(code int, message, err string) *APIError {
	return &APIError{
		Code:    code,
		Message: message,
		Detail:  err,
	}
}

func (e *APIError) Error() string {
	return e.Message
}

var (
	ErrBadRequest          = NewAPIError(400, "请求参数错误", "")
	ErrUnauthorized        = NewAPIError(401, "未授权", "")
	ErrForbidden           = NewAPIError(403, "无权限访问", "")
	ErrNotFound            = NewAPIError(404, "资源不存在", "")
	ErrConflict            = NewAPIError(409, "资源冲突", "")
	ErrInternalServerError = NewAPIError(500, "服务器内部错误", "")
)
