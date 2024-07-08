package src

import (
	"encoding/json"
	"log"
	"net/http"

	"real-time-forum/sqldb"

	"golang.org/x/crypto/bcrypt"
)

// RegisterInfo représente les informations d'enregistrement de l'utilisateur.
type RegisterInfo struct {
	Nickname  string `json:"nickname"`
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	Password  string `json:"password"`
}

// RegisterHandler gère les requêtes d'enregistrement des utilisateurs.
func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var registerInfo RegisterInfo

	// Décoder les informations d'enregistrement du corps de la requête.
	err := json.NewDecoder(r.Body).Decode(&registerInfo)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Invalid registration data"))
		return
	}

	// Vérifier si le pseudonyme ou l'email existe déjà dans la base de données.
	var nicknameExists bool
	var emailExists bool

	err = sqldb.DB.QueryRow("SELECT EXISTS (SELECT 1 FROM users WHERE lower(nickname) = lower(?))", registerInfo.Nickname).Scan(&nicknameExists)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = sqldb.DB.QueryRow("SELECT EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(?))", registerInfo.Email).Scan(&emailExists)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Si le pseudonyme ou l'email existe déjà, retourner une erreur.
	if nicknameExists || emailExists {
		var errReason string
		if nicknameExists {
			errReason += "nickname "
		}
		if emailExists {
			errReason += "email"
		}

		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Registration unsuccessful: " + errReason))
		return
	}

	// Hacher le mot de passe avant de l'enregistrer.
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(registerInfo.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Préparer et exécuter la requête d'insertion pour enregistrer l'utilisateur dans la base de données.
	statement, err := sqldb.DB.Prepare("INSERT INTO users (nickname, email, firstName, lastName, age, gender, password) VALUES (?, ?, ?, ?, ?, ?, ?)")
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	_, err = statement.Exec(registerInfo.Nickname, registerInfo.Email, registerInfo.FirstName, registerInfo.LastName,
		registerInfo.Age, registerInfo.Gender, string(hashedPassword)) // Utiliser le mot de passe haché
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Retourner une réponse de succès.
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Registration successful"))
}
