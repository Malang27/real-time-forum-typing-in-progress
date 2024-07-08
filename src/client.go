package src

import (
	"encoding/json"
	"log"

	"github.com/gorilla/websocket"
)

// ClientList représente une liste de clients WebSocket.
type ClientList map[*Client]bool

// Client représente un client WebSocket.
type Client struct {
	connection *websocket.Conn // Connexion WebSocket pour ce client
	manager    *Manager        // Référence vers le gestionnaire de clients
	egress     chan Event      // Canal pour les messages sortants vers le client
	userId     int             // ID utilisateur associé au client
}

// NewClient crée une nouvelle instance de Client.
func NewClient(conn *websocket.Conn, manager *Manager, userId int) *Client {
	return &Client{
		connection: conn,
		manager:    manager,
		egress:     make(chan Event), // Canal tamponné pour les messages sortants
		userId:     userId,
	}
}

// readMessages écoute les messages entrants du client.
func (c *Client) readMessages() {
	defer func() {
		// Nettoyage : Retirer le client de la liste du gestionnaire une fois terminé
		c.manager.removeClient(c)
	}()

	for {
		// Lire le message de la connexion WebSocket
		_, payload, err := c.connection.ReadMessage()
		if err != nil {
			// Gérer les erreurs de connexion WebSocket
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Println("erreur lors de la lecture du message :", err)
			}
			break
		}

		// Désérialiser le payload JSON en une structure Event
		var request Event
		if err := json.Unmarshal(payload, &request); err != nil {
			log.Println("erreur lors de la désérialisation de l'événement :", err)
			break
		}

		// Router l'événement vers le gestionnaire approprié dans le gestionnaire
		if err := c.manager.routeEvent(request, c); err != nil {
			log.Println("erreur lors du traitement du message :", err)
		}
	}
}

// writeMessages envoie les messages sortants au client.
func (c *Client) writeMessages() {
	defer func() {
		// Nettoyage : Retirer le client de la liste du gestionnaire une fois terminé
		c.manager.removeClient(c)
	}()

	for message := range c.egress {
		// Sérialiser la structure Event en JSON
		data, err := json.Marshal(message)
		if err != nil {
			log.Println("erreur lors de la sérialisation du message :", err)
			return
		}

		// Envoyer les données JSON en tant que message WebSocket texte
		if err := c.connection.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Println("échec de l'envoi du message :", err)
		}

		log.Println("message envoyé")
	}
}
