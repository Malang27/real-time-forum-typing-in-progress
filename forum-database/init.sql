CREATE TABLE IF NOT EXISTS users (
	userId INTEGER PRIMARY KEY AUTOINCREMENT,
	nickname TEXT NOT NULL,
    age INTEGER,
    gender TEXT NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
	email TEXT NOT NULL,
	password TEXT NOT NULL,
	online BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS posts (
	postId INTEGER PRIMARY KEY AUTOINCREMENT, 
    header TEXT NOT NULL,
	content TEXT NOT NULL,
	userId INTEGER NOT NULL,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    creationDate TEXT NOT NULL, 
	FOREIGN KEY (userId) REFERENCES users (userId)
);

CREATE TABLE IF NOT EXISTS comments (
	commentId INTEGER PRIMARY KEY AUTOINCREMENT,
	postId INTEGER NOT NULL,
	content TEXT NOT NULL,
    userId INTEGER NOT NULL,
    likes INTEGER DEFAULT 0,
	dislikes INTEGER DEFAULT 0,
    creationDate TEXT NOT NULL,
    FOREIGN KEY (postId) REFERENCES posts (postId),
    FOREIGN KEY (userId) REFERENCES users (userId)
);

CREATE TABLE IF NOT EXISTS categories (
	categoryId INTEGER PRIMARY KEY AUTOINCREMENT,
	categoryName TEXT NOT NULL,
    postId INTEGER NOT NULL, 
	FOREIGN KEY (postId) REFERENCES posts (postId)
);

CREATE TABLE IF NOT EXISTS reactions (
    reactionId INTEGER PRIMARY KEY AUTOINCREMENT, 
    reactionType TEXT NOT NULL, 
    postId INTEGER,
    commentId INTEGER,
    userId INTEGER NOT NULL,
    FOREIGN KEY (postId) REFERENCES posts (postId),
    FOREIGN KEY (commentId) REFERENCES comments (commentId),
    FOREIGN KEY (userId) REFERENCES users (userId)
);

CREATE TABLE IF NOT EXISTS sessions (
	sessionId INTEGER PRIMARY KEY AUTOINCREMENT, 
	sessionKey TEXT NOT NULL, 
	userId INTEGER NOT NULL, 
	FOREIGN KEY (userId) REFERENCES users (userId)
);

CREATE TABLE IF NOT EXISTS messages (
    messageId INTEGER PRIMARY KEY AUTOINCREMENT,
	senderId INTEGER NOT NULL,
	receiverId INTEGER NOT NULL,
	sentDate TEXT NOT NULL,
	message TEXT NOT NULL,
    FOREIGN KEY (senderId) REFERENCES users (userId),
    FOREIGN KEY (receiverId) REFERENCES users (userId)
);

INSERT INTO users (nickname, email, firstName, lastName, age, gender, password) VALUES 
('helloworld', 'hello@gmail.com', 'Hello', 'World', '25', 'Male', 'password123'),
('testing', 'testing@gmail.com', 'Test', 'Ing', '32', 'Female', 'safepassword'),
('johndoe', 'johndoe@gmail.com', 'John', 'Doe', '18', 'Male', 'guest123');