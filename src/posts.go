package src

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"real-time-forum/sqldb"
)

type CreatePostInfo struct {
	PostHeader  string `json:"postHeader"`
	PostContent string `json:"postContent"`
	Categories  string `json:"categories"`
	CreatorId   int    `json:"creatorId"`
}

type GetPostInfo struct {
	PostId                int      `json:"postId"`
	PostHeader            string   `json:"postHeader"`
	PostContent           string   `json:"postContent"`
	CreatorId             int      `json:"creatorId"`
	CreatorNickname       string   `json:"creatorNickname"`
	Likes                 int      `json:"likes"`
	Dislikes              int      `json:"dislikes"`
	Comments              int      `json:"comments"`
	CreationDate          string   `json:"creationDate"`
	Categories            []string `json:"categories"`
	LikedByCurrentUser    bool     `json:"likedByCurrentUser"`
	DislikedByCurrentUser bool     `json:"dislikedByCurrentUser"`
}

func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	var createPostInfo CreatePostInfo
	err := json.NewDecoder(r.Body).Decode(&createPostInfo)
	if err != nil {
		log.Println(err)
		return
	}

	statement, err := sqldb.DB.Prepare("INSERT INTO posts (header, content, userId, creationDate) VALUES (?, ?, ?, ?)")
	if err != nil {
		log.Println(err)
		return
	}
	_, err = statement.Exec(createPostInfo.PostHeader, createPostInfo.PostContent, createPostInfo.CreatorId, getCurrentDate())
	if err != nil {
		log.Println(err)
		return
	}
	createCategories(createPostInfo.Categories)
}

func GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	userId := r.URL.Query().Get("userId")

	query := `
		SELECT p.postId, p.header AS postHeader, p.content AS postContent, 
			p.userId AS creatorId, u.nickname AS creatorNickname,
			p.likes, p.dislikes, p.comments, p.creationDate
		FROM posts AS p
		INNER JOIN users AS u ON p.userId = u.userId
	`

	jsonData, err := json.Marshal(getPostsByQuery(query, userId))
	if err != nil {
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func createCategories(categories string) {
	if categories != "" {
		catSlc := removeDuplicateStr(strings.Split(strings.ReplaceAll(strings.ToUpper(categories), " ", ""), "#"))
		var postId int
		sqldb.DB.QueryRow("SELECT postId FROM posts ORDER BY postId DESC LIMIT 1").Scan(&postId)
		for _, v := range catSlc {
			statement, err := sqldb.DB.Prepare("INSERT INTO categories (categoryName, postId) VALUES (?, ?)")
			if err != nil {
				log.Println(err)
				return
			}
			statement.Exec(v, postId)
		}
	}
}

func getCategories(postId int) []string {
	rows, _ := sqldb.DB.Query("SELECT categoryName FROM categories WHERE postId=?", postId)
	defer rows.Close()
	var resSlc []string
	var category string
	for rows.Next() {
		rows.Scan(&category)
		resSlc = append(resSlc, category)
	}
	return resSlc
}

func getPostsByQuery(query, currentUserId string) []GetPostInfo {
	rows, err := sqldb.DB.Query(query)
	if err != nil {
		log.Println(err)
	}
	defer rows.Close()

	var posts []GetPostInfo
	for rows.Next() {
		var post GetPostInfo
		err := rows.Scan(
			&post.PostId, &post.PostHeader, &post.PostContent, &post.CreatorId,
			&post.CreatorNickname, &post.Likes, &post.Dislikes, &post.Comments,
			&post.CreationDate,
		)
		post.Categories = getCategories(post.PostId)
		if err != nil {
			log.Println(err)
		}
		userReaction := userReactionType(post.PostId, currentUserId, "post")
		if userReaction != "" {
			if userReaction == "like" {
				post.LikedByCurrentUser = true
			} else {
				post.DislikedByCurrentUser = true
			}
		}

		posts = append(posts, post)
	}
	return posts
}
