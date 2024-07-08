package sqldb

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func OpenDatabase() {
	database, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
		return
	}

	DB = database
}
