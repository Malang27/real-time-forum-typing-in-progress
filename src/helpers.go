package src

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"real-time-forum/sqldb"
)

func GetNicknameHandler(w http.ResponseWriter, r *http.Request) {
	userId, _ := strconv.Atoi(r.URL.Query().Get("id"))

	jsonData, err := json.Marshal(getNicknameById(userId))
	if err != nil {
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func getUserId(nicknameOrEmail string) int {
	var userId int

	sqldb.DB.QueryRow("SELECT userId FROM users WHERE nickname = ? OR email = ?", nicknameOrEmail, nicknameOrEmail).Scan(&userId)
	return userId
}

// removes dupe strings from slice
func removeDuplicateStr(strSlc []string) []string {
	allKeys := make(map[string]bool)
	list := []string{}
	for _, item := range strSlc {
		if item != "" {
			if _, value := allKeys[item]; !value {
				allKeys[item] = true
				list = append(list, item)
			}
		}
	}
	return list
}

func getCurrentDate() string {
	return time.Now().Format("02-01-2006, 15:04")
}

func addMessageToTable(messageData ReturnMessageEvent) {
	statement, err := sqldb.DB.Prepare("INSERT INTO messages (senderId, receiverId, sentDate, message) VALUES (?, ?, ?, ?)")
	if err != nil {
		log.Println(err)
		return
	}

	_, err = statement.Exec(messageData.SenderId, messageData.ReceiverId, messageData.SentDate, messageData.Message)
	if err != nil {
		log.Println(err)
		return
	}
}

func getChatData(currentChatterId, otherChatterId, amount int) ReturnChatDataEvent {
	var returnChatData ReturnChatDataEvent

	returnChatData.CurrentChatterNickname = getNicknameById(currentChatterId)
	returnChatData.OtherChatterNickname = getNicknameById(otherChatterId)

	rows, err := sqldb.DB.Query(`
		SELECT messageId, senderId, receiverId, message, sentDate FROM messages 
		WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
		ORDER BY sentDate DESC LIMIT ?`, currentChatterId, otherChatterId, otherChatterId, currentChatterId, amount)
	if err != nil {
		log.Println(err)
	}
	defer rows.Close()

	for rows.Next() {
		var messageData ReturnMessageEvent

		rows.Scan(&messageData.MessageId, &messageData.SenderId, &messageData.ReceiverId, &messageData.Message, &messageData.SentDate)
		returnChatData.Messages = append(returnChatData.Messages, messageData)
	}
	reverseSlice(returnChatData.Messages)

	return returnChatData
}

func getChatbarData(currentUserId int) []UserDataEvent {
	var userDataSlc []UserDataEvent

	rows, err := sqldb.DB.Query(`SELECT userId, nickname, online FROM users WHERE userId != ? ORDER BY nickname COLLATE NOCASE ASC`, currentUserId)
	if err != nil {
		log.Println(err)
	}
	defer rows.Close()

	for rows.Next() {
		var userData UserDataEvent

		rows.Scan(&userData.UserId, &userData.Nickname, &userData.Online)
		userData.LastMsgData = getLastMsgData(currentUserId, userData.UserId)
		userDataSlc = append(userDataSlc, userData)
	}

	return userDataSlc
}

func reverseSlice(s []ReturnMessageEvent) {
	for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
		s[i], s[j] = s[j], s[i]
	}
}

func getNicknameById(userId int) string {
	var nickname string

	sqldb.DB.QueryRow("SELECT nickname FROM users WHERE userId = ?", userId).Scan(&nickname)
	return nickname
}

func getLastMsgData(currentUserId, senderId int) ReturnMessageEvent {
	var lastMsgData ReturnMessageEvent

	err := sqldb.DB.QueryRow(`
		SELECT message, senderId, receiverId, sentDate FROM messages
		WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
		ORDER BY sentDate DESC`, senderId, currentUserId, currentUserId, senderId).Scan(&lastMsgData.Message, &lastMsgData.SenderId, &lastMsgData.ReceiverId, &lastMsgData.SentDate)
	if err != nil {
		if err != sql.ErrNoRows {
			log.Println(err)
		}
	}

	return lastMsgData
}

func updateUserStatus(newStatus bool, userId int) {
	statement, err := sqldb.DB.Prepare("UPDATE users SET online = ? WHERE userID = ?")
	if err != nil {
		log.Println(err)
		return
	}

	_, err = statement.Exec(newStatus, userId)
	if err != nil {
		log.Println(err)
		return
	}
}

func resetUserStatuses() {
	statement, err := sqldb.DB.Prepare("UPDATE users SET online = false WHERE online = true")
	if err != nil {
		log.Println(err)
		return
	}

	_, err = statement.Exec()
	if err != nil {
		log.Println(err)
		return
	}
}

func hasSession(userId int) bool {
	var exists bool
	err := sqldb.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM sessions WHERE userId = ?)", userId).Scan(&exists)
	if err != nil {
		log.Println(err)
		return false
	}
	return exists
}
