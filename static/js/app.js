document.addEventListener('DOMContentLoaded', () => {
    checkSession()
    // Initialisation de la connexion WebSocket
    let socket = new WebSocket("ws://localhost:8080/ws");

    // Fonction appelée lorsque la connexion WebSocket est ouverte
    socket.onopen = function(event) {
        console.log("WebSocket connection opened.");
    };

    // Fonction appelée lorsque le serveur WebSocket envoie un message
    socket.onmessage = function(event) {
        const message = JSON.parse(event.data);
        if (message.receiver) {
            displayPrivateMessage(message.sender, message.content); // Afficher le message privé
        } else {
            displayMessage(message.username, message.content); // Afficher le message public
        }
    };

    // Fonction appelée en cas d'erreur WebSocket
    socket.onerror = function(event) {
        console.error("WebSocket error observed:", event);
    };

    // Fonction pour envoyer un message privé
    function sendPrivateMessage(receiver, content) {
        const message = {
            sender: username, // Assurez-vous que 'username' est défini globalement
            receiver: receiver,
            content: content
        };
        fetch("/sendprivatemessage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(message)
        }).then(response => {
            if (!response.ok) {
                console.error("Failed to send private message");
            }
        });
    }

    // Event listener pour le formulaire de message privé
    const privateMessageForm = document.getElementById('messageForm');
    privateMessageForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const receiver = document.getElementById('messageReceiver').value;
        const content = document.getElementById('messageInput').value;
        sendPrivateMessage(receiver, content);
    });

    // Fonction pour afficher un message privé
    function displayPrivateMessage(sender, content) {
        const messageContainer = document.getElementById('messagesContainer');
        const messageElement = document.createElement('div');
        messageElement.textContent = `De ${sender}: ${content}`;
        messageContainer.appendChild(messageElement);
    }

    // Fonction pour afficher un message public (à conserver si besoin)
    function displayMessage(username, content) {
        const messageContainer = document.getElementById('messagesContainer');
        const messageElement = document.createElement('div');
        messageElement.textContent = `${username}: ${content}`;
        messageContainer.appendChild(messageElement);
    }

    // Gestion du formulaire d'inscription
    document.getElementById('registerForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/register', {
            method: 'POST',
            body: formData
        })
            .then(response => handleJsonResponse(response))
            .then(data => {
                if (data.success) {
                    alert('Inscription réussie!');
                    showSection('login'); // Afficher la section de connexion
                } else {
                    alert(data.message || 'Erreur lors de l\'inscription');
                }
            })
            .catch(error => {
                console.error('Erreur lors de l\'inscription:', error);
            });
    });

    // Gestion du formulaire de connexion
    document.getElementById('loginForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/login', {
            method: 'POST',
            body: formData
        })
            .then(response => handleJsonResponse(response))
            .then(data => {
                if (data.success) {
                    alert('Connexion réussie!');
                    showSection('posts');
                    toggleNavButtons(true);
                    loadPosts();
                } else {
                    alert(data.message || 'Nom d\'utilisateur ou mot de passe incorrect');
                }
            })
            .catch(error => {
                console.error('Erreur lors de la connexion:', error);
            });
    });

    // Gestion du formulaire de création de publication
    document.getElementById('createPostForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/createpost', {
            method: 'POST',
            body: formData
        })
            .then(response => handleJsonResponse(response))
            .then(data => {
                if (data.success) {
                    alert('Publication créée!');
                    showSection('posts'); // Afficher la section des publications
                    loadPosts(); // Charger les publications
                } else {
                    alert(data.message || 'Erreur lors de la création de la publication');
                }
            })
            .catch(error => {
                console.error('Erreur lors de la création de la publication:', error);
            });
    });

    // Gestion du formulaire de commentaire
    document.getElementById('commentForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/comment', {
            method: 'POST',
            body: formData
        })
            .then(response => handleJsonResponse(response))
            .then(data => {
                if (data.success) {
                    alert('Commentaire ajouté!');
                    loadPost(formData.get('post_id')); // Recharger les commentaires pour la publication
                } else {
                    alert(data.message || 'Erreur lors de l\'ajout du commentaire');
                }
            })
            .catch(error => {
                console.error('Erreur lors de l\'ajout du commentaire:', error);
            });
    });

    // Gestion du formulaire d'envoi de message WebSocket
    document.getElementById('messageForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const message = {
            username: document.getElementById('usernameDisplay').textContent,
            content: document.getElementById('messageInput').value
        };
        socket.send(JSON.stringify(message)); // Envoyer le message via WebSocket
        document.getElementById('messageInput').value = ''; // Réinitialiser le champ de saisie
    });

    // Récupérer les utilisateurs en ligne toutes les 5 secondes
    setInterval(fetchOnlineUsers, 5000);
});

// Fonction pour vérifier la session de l'utilisateur
// Fonction pour vérifier la session de l'utilisateur
function checkSession() {
    fetch('/checksession')
        .then(response => handleJsonResponse(response))
        .then(data => {
            if (data.success) {
                const usernameDisplay = document.getElementById('usernameDisplay');
                const uppercaseUsername = data.username.toUpperCase();
                usernameDisplay.textContent = `Bienvenue, ${uppercaseUsername}`;
                usernameDisplay.classList.remove('hidden'); // Afficher le nom d'utilisateur
                showSection('posts');
                loadPosts();
                toggleNavButtons(true);
            } else {
                showSection('login');
                toggleNavButtons(false);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la vérification de la session:', error);
            showSection('login');
        });
}

// Appel de la fonction checkSession lorsque le DOM est prêt
document.addEventListener('DOMContentLoaded', checkSession);


// Fonction pour mettre à jour la liste des utilisateurs en ligne
function updateOnlineUsers(username, status) {
    const userList = document.getElementById('onlineUsersList');
    const userItem = document.getElementById('user-' + username);
    if (status === "online") {
        if (!userItem) {
            const newUserItem = document.createElement('li');
            newUserItem.id = 'user-' + username;
            newUserItem.textContent = username;
            userList.appendChild(newUserItem);
        }
    } else if (status === "offline") {
        if (userItem) {
            userList.removeChild(userItem);
        }
    }
}
// Fonction pour afficher une section spécifique
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active'); // Masquer toutes les sections
    });
    document.getElementById(sectionId).classList.add('active'); // Afficher la section spécifiée
}

// Fonction pour déconnecter l'utilisateur
function logout() {
    fetch('/logout', {
        method: 'POST'
    })
        .then(response => {
            if (response.ok) {
                alert('Déconnexion réussie!');
                toggleNavButtons(false); // Masquer les éléments de navigation après déconnexion
                showSection('login'); // Afficher la section de connexion
            } else {
                alert('Erreur lors de la déconnexion');
            }
        })
        .catch(error => {
            console.error('Erreur lors de la déconnexion:', error);
        });
}


// Fonction pour charger les publications
function loadPosts() {
    fetch('/posts')
        .then(response => handleJsonResponse(response))
        .then(data => {
            const postList = document.getElementById('postList');
            postList.innerHTML = '';
            data.forEach((post, index) => {
                const postElement = document.createElement('div');
                postElement.classList.add('post');
                postElement.innerHTML = `
                    <div class="post-header">
                        <img src="/static/img/profil.png" alt="Profil Icon" class="profil-icon"> <!-- Ajoutez le chemin de votre icône -->
                        <p><strong>${post.UserName}</strong></p>
                    </div>
                    <h3>${post.Title}</h3>
                    <p>${post.Content}</p>
                    <button onclick="loadPost(${post.ID})">
                        <i class="fas fa-comments"></i>
                    </button>
                `;
                postList.appendChild(postElement);

                // Ajouter un séparateur après chaque post sauf le dernier
                if (index < data.length - 1) {
                    const hr = document.createElement('hr');
                    hr.classList.add('post-divider');
                    postList.appendChild(hr);
                }
            });
        })
        .catch(error => {
            console.error('Erreur lors du chargement des publications:', error);
        });
}

function loadPost(postId) {
    if (!postId) {
        console.error('ID de publication non défini');
        return;
    }

    fetch('/post?id=' + postId)
        .then(response => handleJsonResponse(response))
        .then(data => {
            if (!data.post) {
                console.error('Format de réponse incorrect', data);
                return;
            }

            const postContent = document.getElementById('postContent');
            postContent.innerHTML = `
                <div class="post-header">
                    <div class="user-info">
                        <img src="/static/img/profil.png" alt="Profil Icon" class="profil-icon" width="30" height="30">
                        <p><strong>${data.post.UserName}</strong></p>
                    </div>
                </div>
                <h3>${data.post.Title}</h3>
                <p>${data.post.Content}</p>
            `;

            const comments = document.getElementById('comments');
            comments.innerHTML = '';
            const postDivider = document.createElement('hr');
                postDivider.classList.add('post-divider');
                
                comments.appendChild(postDivider);

            if (data.comments && data.comments.length > 0) {
                data.comments.forEach((comment, index) => {
                    const commentElement = document.createElement('div');
                    commentElement.classList.add('comment');

                    const commentHeader = document.createElement('div');
                    commentHeader.classList.add('comment-header');

                    const userInfo = document.createElement('div');
                    userInfo.classList.add('user-info');

                    const profileImg = document.createElement('img');
                    profileImg.src = "/static/img/profil.png"; // Remplacez par le chemin de votre icône
                    profileImg.alt = "Profil Icon";
                    profileImg.classList.add('profil-icon');
                    profileImg.width = "30";
                    profileImg.height = "30";

                    const username = document.createElement('strong');
                    username.textContent = comment.UserName;

                    userInfo.appendChild(profileImg);
                    userInfo.appendChild(username);

                    commentHeader.appendChild(userInfo);
                    commentElement.appendChild(commentHeader);

                    const commentContent = document.createElement('p');
                    commentContent.textContent = comment.Content;
                    commentElement.appendChild(commentContent);
                    comments.appendChild(commentElement);
                });
                
            } else {
                comments.innerHTML = '<p>Aucun commentaire trouvé.</p>';
            }

            document.querySelector('#commentForm input[name="post_id"]').value = postId;
            showSection('post');
        })
        .catch(error => {
            console.error('Erreur lors du chargement de la publication:', error);
        });
}

// Fonction pour récupérer les utilisateurs en ligne
function fetchOnlineUsers() {
    fetch('/onlineusers')
        .then(response => response.json())
        .then(data => {
            const onlineUsersList = document.getElementById('onlineUsersList');
            onlineUsersList.innerHTML = ''; // Réinitialiser la liste des utilisateurs en ligne
            data.onlineUsers.forEach(user => {
                const userElement = document.createElement('li');
                userElement.textContent = user;
                onlineUsersList.appendChild(userElement); // Ajouter l'utilisateur à la liste
            });
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des utilisateurs en ligne:', error);
        });
}

// Fonction pour gérer les réponses JSON
function handleJsonResponse(response) {
    if (!response.ok) {
        return response.json().then(data => {
            throw new Error(data.message || 'Erreur inconnue');
        });
    }
    return response.json();
}
// Fonction pour masquer/afficher les boutons de navigation
function toggleNavButtons(isLoggedIn) {
    const navElements = [
        'profilePicture', 'usernameDisplay', 'navSearch', 'navMessages',
        'navPosts', 'navCreatePost', 'navCreateFilter', 'navLogout', 'onlineUsers'
    ];

    if (isLoggedIn) {
        document.getElementById('navLogin').classList.add('hidden');
        document.getElementById('navRegister').classList.add('hidden');
        navElements.forEach(id => document.getElementById(id).classList.remove('hidden'));
    } else {
        document.getElementById('navLogin').classList.remove('hidden');
        document.getElementById('navRegister').classList.remove('hidden');
        navElements.forEach(id => document.getElementById(id).classList.add('hidden'));
    }
}
