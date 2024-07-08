package src

import (
	"encoding/json"
	"log"
	"net/http"

	"real-time-forum/sqldb"
)

func CategoryFilterHandler(w http.ResponseWriter, r *http.Request) {
	categoryName := r.URL.Query().Get("category")

	query := `
		SELECT p.postId, p.header AS postHeader, p.content AS postContent, 
			p.userId AS creatorId, u.nickname AS creatorNickname,
			p.likes, p.dislikes, p.comments, p.creationDate
		FROM posts AS p
		INNER JOIN users AS u ON p.userId = u.userId
		INNER JOIN categories AS c ON p.postId = c.postId
		WHERE c.categoryName = ?
	`

	rows, err := sqldb.DB.Query(query, categoryName)
	if err != nil {
		log.Println(err)
		return
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
			return
		}

		posts = append(posts, post)
	}

	jsonData, err := json.Marshal(posts)
	if err != nil {
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func AllCategoriesHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := sqldb.DB.Query("SELECT categoryName FROM categories")
	if err != nil {
		log.Println(err)
	}
	defer rows.Close()

	var resSlc []string
	var category string
	for rows.Next() {
		rows.Scan(&category)
		resSlc = append(resSlc, category)
	}

	jsonData, err := json.Marshal(removeDuplicateStr(resSlc))
	if err != nil {
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}
