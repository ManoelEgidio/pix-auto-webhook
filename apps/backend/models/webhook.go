package models

type WebhookConfig struct {
	WebhookURL string `json:"webhookUrl"`
}

type WebhookResponse struct {
	Code    int                    `json:"code"`
	Message string                 `json:"message"`
	Data    map[string]interface{} `json:"data,omitempty"`
}

type WebhookType string

const (
	WebhookTypeCharge     WebhookType = "charge"
	WebhookTypeRecurrence WebhookType = "recurrence"
)
type WebhookCommand struct {
	Type    WebhookType
	Action  string
	URL     string
	Params  map[string]string
	Body    map[string]interface{}
}