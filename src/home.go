package src

import (
	"html/template"
	"net/http"
)

// HomePageHandler gère les requêtes HTTP pour la page d'accueil.
func HomePageHandler(w http.ResponseWriter, r *http.Request) {
	// Parse le fichier de template HTML pour la page d'accueil
	temp, err := template.ParseFiles("./static/index.html")
	if err != nil {
		// En cas d'erreur, redirige l'utilisateur vers la page d'accueil avec une erreur 500
		http.Redirect(w, r, "/", http.StatusInternalServerError)
		return
	}
	// Exécute le template et envoie la réponse au client
	if err := temp.Execute(w, nil); err != nil {
		// En cas d'erreur lors de l'exécution du template, redirige l'utilisateur vers la page d'accueil avec une erreur 500
		http.Redirect(w, r, "/", http.StatusInternalServerError)
	}
}
