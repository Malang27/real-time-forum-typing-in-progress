package src

import (
	"encoding/json"
	"log"
	"net/http"

	"real-time-forum/sqldb"
)

type ReactionInfo struct {
	ReactionType    string `json:"reactionType"`
	PostOrCommentId int    `json:"postOrCommentId"`
	PostType        string `json:"postType"`
	UserId          int    `json:"userId"`
}

func ReactionHandler(w http.ResponseWriter, r *http.Request) {
	var reactionInfo ReactionInfo

	err := json.NewDecoder(r.Body).Decode(&reactionInfo)
	if err != nil {
		log.Println(err)
		return
	}

	addReaction(reactionInfo.PostOrCommentId, reactionInfo.UserId, reactionInfo.ReactionType, reactionInfo.PostType)
	w.WriteHeader(http.StatusOK)
}

func addReaction(postOrCommentId, userId int, reactionType, postType string) {
	var reaction string

	if err := sqldb.DB.QueryRow("SELECT reactionType FROM reactions WHERE "+postType+"Id=? AND userId=?", postOrCommentId, userId).Scan(&reaction); err != nil {
		statement, _ := sqldb.DB.Prepare("INSERT INTO reactions (reactionType, " + postType + "Id, userID) VALUES (?, ?, ?)")
		statement.Exec(reactionType, postOrCommentId, userId)
	} else {
		if reaction == reactionType {
			sqldb.DB.Exec("DELETE FROM reactions WHERE "+postType+"Id=? AND userID=?", postOrCommentId, userId)
		} else {
			sqldb.DB.Exec("UPDATE reactions SET reactionType=? WHERE "+postType+"Id=? AND userID=?", reactionType, postOrCommentId, userId)
		}
	}

	updateReactionCount(postOrCommentId, postType, "like")
	updateReactionCount(postOrCommentId, postType, "dislike")
}

func updateReactionCount(postOrCommentId int, postType, reactionType string) {
	var count int
	err := sqldb.DB.QueryRow("SELECT COUNT(*) FROM reactions WHERE "+postType+"Id = ? AND reactionType = ?", postOrCommentId, reactionType).Scan(&count)
	if err != nil {
		log.Println(err)
	}

	query := "UPDATE " + postType + "s SET " + reactionType + "s = ? WHERE " + postType + "Id = ?"
	_, err = sqldb.DB.Exec(query, count, postOrCommentId)
	if err != nil {
		log.Println(err)
	}
}
