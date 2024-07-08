package src

import (
	"log"
	"net/http"
	"os"

	"real-time-forum/sqldb"

	_ "github.com/mattn/go-sqlite3"
)

// Init initialise la base de données en l'ouvrant et en exécutant soit le script SQL initial,
// soit en réinitialisant les statuts des utilisateurs selon que la base de données est vide ou non.
func Init() {
	// Ouvre la connexion à la base de données
	sqldb.OpenDatabase()

	// Vérifie si la base de données est vide
	if dbIsEmpty() {
		// Lit le script SQL d'initialisation à partir du fichier
		sqlInit, err := os.ReadFile("./forum-database/init.sql")
		if err != nil {
			// Gère l'erreur si le fichier SQL ne peut pas être lu
			log.Fatalf("Échec de la lecture du fichier init.sql : %v", err)
		}
		// Exécute le script SQL d'initialisation
		_, err = sqldb.DB.Exec(string(sqlInit))
		if err != nil {
			// Gère l'erreur si l'exécution du SQL échoue
			log.Fatalf("Échec de l'exécution du script init.sql : %v", err)
		}
	} else {
		// Réinitialise les statuts des utilisateurs si la base de données n'est pas vide
		resetUserStatuses()
	}
}

// dbIsEmpty vérifie si le fichier de la base de données est vide.
func dbIsEmpty() bool {
	dbText, err := os.ReadFile("./forum-database/database.db")
	if err != nil {
		// Gère l'erreur si le fichier de la base de données ne peut pas être lu
		log.Fatalf("Échec de la lecture du fichier database.db : %v", err)
	}
	return len(dbText) == 0
}

// Handle configure les gestionnaires HTTP pour le serveur.
func Handle() {
	// Sert les fichiers statiques à partir du répertoire ./static/
	fileServer := http.FileServer(http.Dir("./static/"))

	// Supprime le préfixe /static et sert les fichiers statiques
	http.Handle("/static/", http.StripPrefix("/static", fileServer))

	// Enregistre les gestionnaires HTTP pour différents points de terminaison
	http.HandleFunc("/", HomePageHandler)
	http.HandleFunc("/post-register", RegisterHandler)
	http.HandleFunc("/post-login", LoginHandler)
	http.HandleFunc("/get-cookie", CookieHandler)
	http.HandleFunc("/post-logout", LogOutHandler)
	http.HandleFunc("/create-post", CreatePostHandler)
	http.HandleFunc("/get-posts", GetPostsHandler)
	http.HandleFunc("/create-comment", CreateCommentHandler)
	http.HandleFunc("/get-post-details", GetPostDetailsHandler)
	http.HandleFunc("/post-reaction", ReactionHandler)
	http.HandleFunc("/get-filtered-posts", CategoryFilterHandler)
	http.HandleFunc("/get-all-categories", AllCategoriesHandler)
	http.HandleFunc("/get-user-info", GetUserInfoHandler)
	http.HandleFunc("/get-created-posts", GetCreatedPostsHandler)
	http.HandleFunc("/get-created-comments", GetCreatedCommentsHandler)
	http.HandleFunc("/get-liked-posts", GetLikedPostsHandler)
	http.HandleFunc("/get-liked-comments", GetLikedCommentsHandler)
	http.HandleFunc("/get-disliked-posts", GetDislikedPostsHandler)
	http.HandleFunc("/get-disliked-comments", GetDislikedCommentsHandler)
	http.HandleFunc("/get-nickname", GetNicknameHandler)
	// Configure le gestionnaire de WebSocket
	http.HandleFunc("/ws", NewManager().ServeWS)
}
