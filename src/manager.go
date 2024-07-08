package src

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Configuration de l'upgrader WebSocket
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// TypingEvent représente un événement de saisie de message entre un expéditeur et un destinataire.
type TypingEvent struct {
	SenderId   int `json:"senderId"`
	ReceiverId int `json:"receiverId"`
}

// Manager gère les connexions WebSocket des clients et les événements associés.
type Manager struct {
	clients  ClientList             // Liste des clients connectés
	sync.RWMutex                     // Mutex pour gérer la concurrence
	handlers map[string]EventHandler // Gestionnaires d'événements pour différents types d'événements
}

// NewManager crée une nouvelle instance de Manager avec une liste de clients vide et les gestionnaires d'événements configurés.
func NewManager() *Manager {
	m := &Manager{
		clients:  make(ClientList),
		handlers: make(map[string]EventHandler),
	}

	m.setupEventHandlers()
	return m
}

// routeEvent route l'événement vers le gestionnaire approprié en fonction de son type.
func (m *Manager) routeEvent(event Event, c *Client) error {
	if handler, ok := m.handlers[event.Type]; ok {
		if err := handler(event, c); err != nil {
			return err
		}
		return nil
	} else {
		return errors.New("there is no such event type")
	}
}

// setupEventHandlers configure les gestionnaires d'événements pour différents types d'événements supportés.
func (m *Manager) setupEventHandlers() {
	m.handlers[EventSendMessage] = SendMessageHandler
	m.handlers[EventGetMessages] = GetMessagesHandler
	m.handlers[EventGetChatbarData] = GetChatbarDataHandler
	m.handlers[EventUpdateChatbarData] = UpdateChatbarData
	m.handlers[EventTypingStart] = TypingStartHandler
	m.handlers[EventTypingStop] = TypingStopHandler
}

// TypingStartHandler gère l'événement de début de saisie.
func TypingStartHandler(event Event, c *Client) error {
	var typingEvent TypingEvent
	if err := json.Unmarshal(event.Payload, &typingEvent); err != nil {
		return fmt.Errorf("bad payload in request: %v", err)
	}

	// Envoyer l'événement de saisie à tous les clients connectés sauf à l'expéditeur
	for client := range c.manager.clients {
		if client.userId == typingEvent.ReceiverId {
			client.egress <- event
		}
	}
	return nil
}

// TypingStopHandler gère l'événement d'arrêt de saisie.
func TypingStopHandler(event Event, c *Client) error {
	var typingEvent TypingEvent
	if err := json.Unmarshal(event.Payload, &typingEvent); err != nil {
		return fmt.Errorf("bad payload in request: %v", err)
	}

	// Envoyer l'événement d'arrêt de saisie à tous les clients connectés sauf à l'expéditeur
	for client := range c.manager.clients {
		if client.userId == typingEvent.ReceiverId {
			client.egress <- event
		}
	}
	return nil
}

// SendMessageHandler gère l'événement d'envoi de message.
func SendMessageHandler(event Event, c *Client) error {
	var chatEvent SendMessageEvent
	if err := json.Unmarshal(event.Payload, &chatEvent); err != nil {
		return fmt.Errorf("bad payload in request: %v", err)
	}

	// Construire l'événement de message à retourner
	var returnMsg ReturnMessageEvent
	returnMsg.SentDate = time.Now().Format("2006-01-02 15:04:05")
	returnMsg.Message = chatEvent.Message
	returnMsg.ReceiverId = chatEvent.ReceiverId
	returnMsg.SenderId = chatEvent.SenderId

	// Ajouter le message à une table ou base de données
	addMessageToTable(returnMsg)

	// Marshal l'événement à retourner en JSON
	data, err := json.Marshal(returnMsg)
	if err != nil {
		return fmt.Errorf("failed to marshal broadcast message: %v", err)
	}

	var outgoingEvent Event
	outgoingEvent.Payload = data
	outgoingEvent.Type = EventNewMessage

	// Envoyer le message au client destinataire
	for client := range c.manager.clients {
		if client.userId == returnMsg.ReceiverId {
			client.egress <- outgoingEvent
		}
	}
	return nil
}

// GetMessagesHandler gère l'événement de récupération de messages.
func GetMessagesHandler(event Event, c *Client) error {
	var chatDataEvent SendChatDataEvent
	if err := json.Unmarshal(event.Payload, &chatDataEvent); err != nil {
		return fmt.Errorf("bad payload in request: %v", err)
	}

	// Récupérer les données de chat entre deux utilisateurs
	data, err := json.Marshal(getChatData(chatDataEvent.CurrentChatterId, chatDataEvent.OtherChatterId, chatDataEvent.Amount))
	if err != nil {
		return fmt.Errorf("failed to marshal broadcast message: %v", err)
	}

	var outgoingEvent Event
	outgoingEvent.Payload = data
	outgoingEvent.Type = EventGetMessages
	c.egress <- outgoingEvent

	return nil
}

// GetChatbarDataHandler gère l'événement de récupération des données de la barre de chat.
func GetChatbarDataHandler(event Event, c *Client) error {
	var userId int
	if err := json.Unmarshal(event.Payload, &userId); err != nil {
		return fmt.Errorf("bad payload in request: %v", err)
	}

	// Récupérer les données de la barre de chat pour l'utilisateur donné
	data, err := json.Marshal(getChatbarData(userId))
	if err != nil {
		return fmt.Errorf("failed to marshal broadcast message: %v", err)
	}

	var outgoingEvent Event
	outgoingEvent.Payload = data
	outgoingEvent.Type = EventGetChatbarData
	c.egress <- outgoingEvent

	return nil
}

// UpdateChatbarData gère l'événement de mise à jour des données de la barre de chat.
func UpdateChatbarData(event Event, c *Client) error {
	var msg string
	if err := json.Unmarshal(event.Payload, &msg); err != nil {
		return fmt.Errorf("bad payload in request: %v", err)
	}

	fmt.Println(msg) // Afficher le message reçu dans la console (à titre d'exemple)

	// Diffuser la mise à jour à tous les clients connectés
	return broadcastUpdate(c)
}

// broadcastUpdate diffuse les données mises à jour de la barre de chat à tous les clients connectés.
func broadcastUpdate(c *Client) error {
	for client := range c.manager.clients {
		data, err := json.Marshal(getChatbarData(client.userId))
		if err != nil {
			log.Printf("failed to marshal broadcast message: %v", err)
		}

		var outgoingEvent Event
		outgoingEvent.Payload = data
		outgoingEvent.Type = EventGetChatbarData
		client.egress <- outgoingEvent
	}
	return nil
}

// ServeWS gère la connexion WebSocket nouvellement établie.
func (m *Manager) ServeWS(w http.ResponseWriter, r *http.Request) {
	log.Println("new connection")

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	// Récupérer l'ID utilisateur à partir des paramètres de requête
	userId, _ := strconv.Atoi(r.URL.Query().Get("userId"))
	client := NewClient(conn, m, userId)

	// Ajouter le client à la liste des clients gérés par le Manager
	m.addClient(client)

	// Démarrer les goroutines pour la lecture et l'écriture des messages
	go client.readMessages()
	go client.writeMessages()
}

// addClient ajoute un nouveau client à la liste des clients gérés par le Manager.
func (m *Manager) addClient(client *Client) {
	m.Lock()
	defer m.Unlock()

	// Créer un timer pour mettre à jour l'état en ligne de l'utilisateur après 3 secondes
	timer := time.NewTimer(3 * time.Second)

	go func() {
		<-timer.C
		if m.isClientOnline(client.userId) && hasSession(client.userId) {
			updateUserStatus(true, client.userId)
			broadcastUpdate(client)
		}
	}()

	m.clients[client] = true
}

// removeClient supprime un client de la liste des clients gérés par le Manager.
func (m *Manager) removeClient(client *Client) {
	m.Lock()
	defer m.Unlock()

	if _, ok := m.clients[client]; ok {
		// Créer un timer pour vérifier l'état en ligne du client après 3 secondes
		timer := time.NewTimer(3 * time.Second)

		go func() {
			<-timer.C
			if !m.isClientOnline(client.userId) {
				updateUserStatus(false, client.userId)
				broadcastUpdate(client)
			}
		}()

		// Fermer la connexion du client
		client.connection.Close()

		// Supprimer le client de la liste des clients gérés par le Manager
		delete(m.clients, client)
	}
}

// isClientOnline vérifie si un utilisateur est en ligne en parcourant la liste des clients gérés par le Manager.
func (m *Manager) isClientOnline(userId int) bool {
	m.Lock()
	defer m.Unlock()

	for client := range m.clients {
		if client.userId == userId {
			return true
		}
	}

	return false
}
