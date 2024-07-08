package src

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"real-time-forum/sqldb"

	"github.com/gofrs/uuid"
	"golang.org/x/crypto/bcrypt"
)

type LoginInfo struct {
	NicknameOrEmail string `json:"nicknameOrEmail"`
	Password        string `json:"password"`
}

type LoginResponse struct {
	Nickname string `json:"nickname"`
	UserId   int    `json:"userId"`
	CookieId string `json:"cookieId"`
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var loginInfo LoginInfo
	err := json.NewDecoder(r.Body).Decode(&loginInfo)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Invalid login data"))
		return
	}

	var hashedPassword string
	err = sqldb.DB.QueryRow("SELECT password FROM users WHERE nickname = ? OR email = ?", loginInfo.NicknameOrEmail, loginInfo.NicknameOrEmail).Scan(&hashedPassword)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("Login unsuccessful: User does not exist"))
		return
	}

	// Comparer le mot de passe haché stocké avec le mot de passe fourni par l'utilisateur.
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(loginInfo.Password))
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("Login unsuccessful: Incorrect password"))
		return
	}

	var nickname string
	err = sqldb.DB.QueryRow("SELECT nickname FROM users WHERE nickname = ? OR email = ?", loginInfo.NicknameOrEmail, loginInfo.NicknameOrEmail).Scan(&nickname)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	sessionId := createCookie(w, loginInfo.NicknameOrEmail)

	response := LoginResponse{
		Nickname: nickname,
		UserId:   getUserId(loginInfo.NicknameOrEmail),
		CookieId: sessionId,
	}

	updateUserStatus(true, response.UserId)

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(response)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func createCookie(w http.ResponseWriter, nicknameOrEmail string) string {
	userId := getUserId(nicknameOrEmail)

	sessionValue := uuid.Must(uuid.NewV4()).String()
	http.SetCookie(w, &http.Cookie{
		Name:   "sessionForUserId" + strconv.Itoa(userId),
		Value:  sessionValue,
		MaxAge: int(24 * time.Hour),
	})

	sqldb.DB.Exec("DELETE FROM sessions WHERE userId=?", userId) // supprime les sessions précédentes de l'utilisateur pour éviter les doubles sessions
	statement, err := sqldb.DB.Prepare("INSERT INTO sessions (sessionKey, userId) VALUES (?, ?)")
	if err != nil {
		log.Println(err)
	}
	statement.Exec(sessionValue, userId)
	return sessionValue
}

func CookieHandler(w http.ResponseWriter, r *http.Request) {
	cookieId := r.URL.Query().Get("cookieId")

	// vérifier si une session existe pour le cookieId donné
	var exists bool
	err := sqldb.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM sessions WHERE sessionKey = ?)", cookieId).Scan(&exists)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if exists {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Session exists for user"))
	} else {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("Session does not exist for user"))
	}
}

func LogOutHandler(w http.ResponseWriter, r *http.Request) {
	userId := r.URL.Query().Get("userId")

	http.SetCookie(w, &http.Cookie{
		Name:   "sessionForUserId" + userId,
		Value:  "0",
		MaxAge: -1,
	})
	_, err := sqldb.DB.Exec("DELETE FROM sessions WHERE userId=?", userId) // supprime la session lorsque l'utilisateur se déconnecte
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	userIdInt, _ := strconv.Atoi(userId)
	updateUserStatus(false, userIdInt)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Ended session for user with ID: " + userId))
}
