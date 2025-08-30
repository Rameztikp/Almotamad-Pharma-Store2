package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"pharmacy-backend/models"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Notifier struct {
	clients    map[uuid.UUID]map[chan []byte]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
	fcmEnabled bool
	fcmServerKey string
}

type FCMPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Image string `json:"image,omitempty"`
}

type FCMMessage struct {
	To           string            `json:"to"`
	Notification FCMPayload       `json:"notification"`
	Data         map[string]string `json:"data,omitempty"`
}

type Client struct {
	UserID  uuid.UUID
	Channel chan []byte
}

func NewNotifier(fcmServerKey string) *Notifier {
	return &Notifier{
		clients:     make(map[uuid.UUID]map[chan []byte]bool),
		broadcast:   make(chan []byte, 100),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		fcmEnabled:  fcmServerKey != "",
		fcmServerKey: fcmServerKey,
	}
}

func (n *Notifier) Run() {
	for {
		select {
		case client := <-n.register:
			n.mu.Lock()
			if _, ok := n.clients[client.UserID]; !ok {
				n.clients[client.UserID] = make(map[chan []byte]bool)
			}
			n.clients[client.UserID][client.Channel] = true
			n.mu.Unlock()

		case client := <-n.unregister:
			n.mu.Lock()
			if userChannels, ok := n.clients[client.UserID]; ok {
				if _, ok := userChannels[client.Channel]; ok {
					delete(userChannels, client.Channel)
					close(client.Channel)
				}
				if len(userChannels) == 0 {
					delete(n.clients, client.UserID)
				}
			}
			n.mu.Unlock()

		case message := <-n.broadcast:
			n.mu.RLock()
			for _, channels := range n.clients {
				for clientChan := range channels {
					select {
					case clientChan <- message:
					default:
						close(clientChan)
						delete(channels, clientChan)
					}
				}
			}
			n.mu.RUnlock()
		}
	}
}

func (n *Notifier) BroadcastToUser(userID uuid.UUID, event string, data interface{}) error {
	payload := map[string]interface{}{
		"event": event,
		"data":  data,
		"time":  time.Now().Unix(),
	}

	message, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("error marshaling notification: %v", err)
	}

	n.mu.RLock()
	if channels, ok := n.clients[userID]; ok {
		for clientChan := range channels {
			select {
			case clientChan <- message:
			default:
				close(clientChan)
				delete(channels, clientChan)
			}
		}
	}
	n.mu.RUnlock()

	return nil
}

func (n *Notifier) SendFCM(message *FCMMessage) error {
	if !n.fcmEnabled {
		return fmt.Errorf("FCM is not enabled")
	}

	payload, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("error marshaling FCM message: %v", err)
	}

	req, err := http.NewRequest("POST", "https://fcm.googleapis.com/fcm/send", bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("error creating FCM request: %v", err)
	}

	req.Header.Set("Authorization", "key="+n.fcmServerKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error sending FCM message: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("FCM request failed with status: %s", resp.Status)
	}

	return nil
}

// SendNotification sends a notification to a user via both SSE and FCM
func (n *Notifier) SendNotification(userID uuid.UUID, notification *models.Notification) error {
	// Send via SSE
	err := n.BroadcastToUser(userID, "new_notification", notification)
	if err != nil {
		return fmt.Errorf("error sending SSE notification: %v", err)
	}

	// Send via FCM if enabled
	if n.fcmEnabled {
		fcmMessage := &FCMMessage{
			To: "", // Will be set by SendPushNotification
			Notification: FCMPayload{
				Title: notification.Title,
				Body:  notification.Message,
			},
			Data: map[string]string{
				"type":    string(notification.Type),
				"orderId": notification.OrderID.String(),
			},
		}

		// Get the user's FCM token and send the message
		token, err := models.GetFCMToken(userID.String())
		if err == nil && token != "" {
			fcmMessage.To = token
			return n.SendFCM(fcmMessage)
		}
	}

	return nil
}
