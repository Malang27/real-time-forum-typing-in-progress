package src

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"real-time-forum/sqldb"
)

type UserPageInfo struct {
	Nickname  string `json:"nickname"`
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	Online    bool   `json:"online"`
}

func GetUserInfoHandler(w http.ResponseWriter, r *http.Request) {
	userId := r.URL.Query().Get("userId")

	jsonData, err := json.Marshal(getUserInfo(userId))
	if err != nil {
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func GetCreatedPostsHandler(w http.ResponseWriter, r *http.Request) {
	viewedUserId := r.URL.Query().Get("viewedUserId")
	currentUserId := r.URL.Query().Get("currentUserId")

	query := `
		SELECT p.postId, p.header AS postHeader, p.content AS postContent, 
			p.userId AS creatorId, u.nickname AS creatorNickname,
			p.likes, p.dislikes, p.comments, p.creationDate
		FROM posts AS p
		INNER JOIN users AS u ON p.userId = u.userId
		WHERE p.userId = ` + viewedUserId

	jsonData, err := json.Marshal(getPostsByQuery(query, currentUserId))
	if err != nil {
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func GetCreatedCommentsHandler(w http.ResponseWriter, r *http.Request) {
	viewedUserId := r.URL.Query().Get("viewedUserId")
	currentUserId := r.URL.Query().Get("currentUserId")

	var createdCommentsInfo []GetPostAndCommentsInfo
	parentPosts := getCreatedCommentsParentPosts(viewedUserId, currentUserId)

	for _, v := range parentPosts {
		var singlePostAndComments GetPostAndCommentsInfo
		singlePostAndComments.ParentPostInfo = v
		singlePostAndComments.CommentsInfo = getUserCreatedCommentsUnderPost(viewedUserId, currentUserId, strconv.Itoa(v.PostId))
		createdCommentsInfo = append(createdCommentsInfo, singlePostAndComments)
	}

	jsonData, err := json.Marshal(createdCommentsInfo)
	if err != nil {
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func GetLikedPostsHandler(w http.ResponseWriter, r *http.Request) {
	viewedUserId := r.URL.Query().Get("viewedUserId")
	currentUserId := r.URL.Query().Get("currentUserId")

	query := `
		SELECT p.postId, p.header AS postHeader, p.content AS postContent, 
			p.userId AS creatorId, u.nickname AS creatorNickname,
			p.likes, p.dislikes, p.comments, p.creationDate
		FROM posts AS p
		INNER JOIN users AS u ON p.userId = u.userId
		INNER JOIN reactions AS r ON p.postId = r.postId
		WHERE r.userId = ` + viewedUserId + ` AND r.reactionType = "like"`

	jsonData, err := json.Marshal(getPostsByQuery(query, currentUserId))
	if err != nil {
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func GetLikedCommentsHandler(w http.ResponseWriter, r *http.Request) {
	viewedUserId := r.URL.Query().Get("viewedUserId")
	currentUserId := r.URL.Query().Get("currentUserId")

	var likedCommentsInfo []GetPostAndCommentsInfo
	likedParentPosts := getReactedCommentsParentPosts(viewedUserId, currentUserId, "like")

	for _, v := range likedParentPosts {
		var singlePostAndComments GetPostAndCommentsInfo
		singlePostAndComments.ParentPostInfo = v
		singlePostAndComments.CommentsInfo = getUserReactedCommentsUnderPost(viewedUserId, currentUserId, strconv.Itoa(v.PostId), "like")
		likedCommentsInfo = append(likedCommentsInfo, singlePostAndComments)
	}

	jsonData, err := json.Marshal(likedCommentsInfo)
	if err != nil {
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func GetDislikedPostsHandler(w http.ResponseWriter, r *http.Request) {
	viewedUserId := r.URL.Query().Get("viewedUserId")
	currentUserId := r.URL.Query().Get("currentUserId")

	query := `
		SELECT p.postId, p.header AS postHeader, p.content AS postContent, 
			p.userId AS creatorId, u.nickname AS creatorNickname,
			p.likes, p.dislikes, p.comments, p.creationDate
		FROM posts AS p
		INNER JOIN users AS u ON p.userId = u.userId
		INNER JOIN reactions AS r ON p.postId = r.postId
		WHERE r.userId = ` + viewedUserId + ` AND r.reactionType = "dislike"`

	jsonData, err := json.Marshal(getPostsByQuery(query, currentUserId))
	if err != nil {
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func GetDislikedCommentsHandler(w http.ResponseWriter, r *http.Request) {
	viewedUserId := r.URL.Query().Get("viewedUserId")
	currentUserId := r.URL.Query().Get("currentUserId")

	var dislikedCommentsInfo []GetPostAndCommentsInfo
	dislikedParentPosts := getReactedCommentsParentPosts(viewedUserId, currentUserId, "dislike")

	for _, v := range dislikedParentPosts {
		var singlePostAndComments GetPostAndCommentsInfo
		singlePostAndComments.ParentPostInfo = v
		singlePostAndComments.CommentsInfo = getUserReactedCommentsUnderPost(viewedUserId, currentUserId, strconv.Itoa(v.PostId), "dislike")
		dislikedCommentsInfo = append(dislikedCommentsInfo, singlePostAndComments)
	}

	jsonData, err := json.Marshal(dislikedCommentsInfo)
	if err != nil {
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func getUserInfo(userId string) UserPageInfo {
	var userPageInfo UserPageInfo
	row := sqldb.DB.QueryRow("SELECT nickname, email, firstName, lastName, age, gender, online FROM users WHERE userId = ?", userId)

	err := row.Scan(&userPageInfo.Nickname, &userPageInfo.Email, &userPageInfo.FirstName, &userPageInfo.LastName, &userPageInfo.Age, &userPageInfo.Gender, &userPageInfo.Online)
	if err != nil {
		log.Println(err)
	}
	return userPageInfo
}

func getCreatedCommentsParentPosts(viewedUserId, currentUserId string) []GetPostInfo {
	query := `
		SELECT DISTINCT p.postId, p.header AS postHeader, p.content AS postContent, 
			p.userId AS creatorId, u.nickname AS creatorNickname,
			p.likes, p.dislikes, p.comments, p.creationDate
		FROM posts AS p
		INNER JOIN users AS u ON p.userId = u.userId
		INNER JOIN comments AS c ON p.postId = c.postId
		WHERE c.userId = ` + viewedUserId

	return getPostsByQuery(query, currentUserId)
}

func getReactedCommentsParentPosts(viewedUserId, currentUserId, reactionType string) []GetPostInfo {
	query := `
		SELECT DISTINCT p.postId, p.header AS postHeader, p.content AS postContent, 
			p.userId AS creatorId, u.nickname AS creatorNickname,
			p.likes, p.dislikes, p.comments, p.creationDate
		FROM posts AS p
		INNER JOIN users AS u ON p.userId = u.userId
		INNER JOIN comments AS c ON p.postId = c.postId
		INNER JOIN reactions AS r ON c.commentId = r.commentId
		WHERE r.userId = ` + viewedUserId + ` AND r.reactionType = "` + reactionType + `"`

	return getPostsByQuery(query, currentUserId)
}

func getUserCreatedCommentsUnderPost(viewedUserId, currentUserId, postId string) []CommentInfo {
	query := `
		SELECT c.commentId, c.content AS commentContent, 
			c.userId AS creatorId, u.nickname AS creatorNickname,
			c.likes, c.dislikes, c.creationDate
		FROM comments AS c
		INNER JOIN users AS u ON c.userId = u.userId
		WHERE c.postId = ` + postId + ` AND c.userId = ` + viewedUserId

	return getCommentsByQuery(query, currentUserId)
}

func getUserReactedCommentsUnderPost(viewedUserId, currentUserId, postId, reactionType string) []CommentInfo {
	query := `
		SELECT c.commentId, c.content AS commentContent, 
			c.userId AS creatorId, u.nickname AS creatorNickname,
			c.likes, c.dislikes, c.creationDate
		FROM comments AS c
		INNER JOIN users AS u ON c.userId = u.userId
		INNER JOIN reactions AS r ON c.commentId = r.commentId
		WHERE r.userId = ` + viewedUserId + ` AND r.reactionType = "` + reactionType + `" AND c.postId = ` + postId

	return getCommentsByQuery(query, currentUserId)
}
