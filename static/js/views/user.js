import { sendEvent, waitForSocketConnection } from "./ws.js"
import { getDataFromServer, hasSession } from "./helpers.js"
import { addChatboxListener, addPostHtml } from "./home.js"
import { addCommentHtml, handleCommentReactions, postReaction } from "./posts.js"
import { navigateTo, navigateToWithoutSavingHistory } from "./router.js"


export default async function() {
    const isAuthorized = await hasSession()
    if(!isAuthorized) {
        navigateTo("/login")
        return
    } else {
        const url = new URL(window.location.href)

        const viewedUserId = url.searchParams.get("id")
        const viewType = url.searchParams.get("view")

        const userData = JSON.parse(localStorage.getItem("userData"))
        const viewedUserData = await getDataFromServer(`/get-user-info?userId=${viewedUserId}`)

        console.log(viewType)
        const viewData = viewType ? await getDataFromServer(`/get-${viewType}?viewedUserId=${viewedUserId}&currentUserId=${userData.userId}`) : null

        waitForSocketConnection(window.socket, () =>{
            sendEvent("get_chatbar_data", userData.userId)
        })

        addUserPageHtml(userData, viewedUserData, viewedUserId)

        document.querySelectorAll(".option").forEach(option => {
            option.addEventListener("click", (e) => {
                navigateToWithoutSavingHistory(`/user?id=${viewedUserId}&view=${e.target.id}`)
            })
        })

        addChatboxListener()

        if(viewType) {
            addViewTypeHtml(viewType, userData, viewData)
        }
    }
}

const addViewTypeHtml = (viewType, userData, viewData) => {
    document.getElementById(viewType).classList.add("selected")
    const contentDiv = document.getElementById("selectContent")
    const viewTypeFunctions = {
        "created-posts": addCreatedPostsHtml,
        "created-comments": addCreatedCommentsHtml,
        "liked-posts": addLikedPostsHtml,
        "liked-comments": addLikedCommentsHtml,
        "disliked-posts": addDislikedPostsHtml,
        "disliked-comments": addDislikedCommentsHtml,
    }

    viewTypeFunctions[viewType](contentDiv, viewData, userData)
}

const addCreatedPostsHtml = (contentDiv, viewData, userData) => {
    contentDiv.innerHTML = ""
    if(viewData) {
        viewData.forEach(post => {
            addPostHtml(post, "selectContent")
        })
        handleCommentReactions(userData)
        handlePostReactions(userData)
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addCreatedCommentsHtml = (contentDiv, viewData, userData) => {
    contentDiv.innerHTML = ""
    if(viewData) {
        viewData.forEach(comment => {
            addParentPostHtml(comment.parentPostInfo, "selectContent", "User commented:")
            comment.commentsInfo.forEach(commentInfo => {
                addCommentHtml(commentInfo, `comments${comment.parentPostInfo.postId}`)
            })
        })
        handleCommentReactions(userData)
        handlePostReactions(userData)
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addLikedPostsHtml = (contentDiv, viewData, userData) => {
    contentDiv.innerHTML = ""
    if(viewData) {
        viewData.forEach(post => {
            addPostHtml(post, "selectContent")
        })
        handleCommentReactions(userData)
        handlePostReactions(userData)
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addLikedCommentsHtml = (contentDiv, viewData, userData) => {
    contentDiv.innerHTML = ""
    if(viewData) {
        viewData.forEach(comment => {
            addParentPostHtml(comment.parentPostInfo, "selectContent", "User liked:")
            comment.commentsInfo.forEach(commentInfo => {
                addCommentHtml(commentInfo, `comments${comment.parentPostInfo.postId}`)
            })
        })
        handleCommentReactions(userData)
        handlePostReactions(userData)
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addDislikedPostsHtml = (contentDiv, viewData, userData) => {
    contentDiv.innerHTML = ""
    if(viewData) {
        viewData.forEach(post => {
            addPostHtml(post, "selectContent")
        })
        handleCommentReactions(userData)
        handlePostReactions(userData)
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addDislikedCommentsHtml = (contentDiv, viewData, userData) => {
    contentDiv.innerHTML = ""
    if(viewData) {
        viewData.forEach(comment => {
            addParentPostHtml(comment.parentPostInfo, "selectContent", "User disliked:")
            comment.commentsInfo.forEach(commentInfo => {
                addCommentHtml(commentInfo, `comments${comment.parentPostInfo.postId}`)
            })
        })
        handleCommentReactions(userData)
        handlePostReactions(userData)
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addParentPostHtml = (parentPostInfo, contentDivId, descMsg) => {
    document.querySelector(`#${contentDivId}`).innerHTML += `
        <div style="text-align: center; overflow-wrap: break-word;">
            <br><br>
            <a style="font-size: 50px;">Under post: </a>
            <a href="/posts?id=${parentPostInfo.postId}" data-link style="font-size: 50px;">${parentPostInfo.postHeader}</a>
            <br><br><br>
            <div class="postbox">
                <div class="postinfobox">
                    <a href="/user?id=${parentPostInfo.creatorId}" data-link>${parentPostInfo.creatorNickname}</a><br><br>
                    <a>${parentPostInfo.creationDate}</a><br>
                </div>
                <div class="postcontent">
                    <a>${parentPostInfo.postContent}</a>
                </div>
                <div class="reactionbox">
                    <button class="` + (parentPostInfo.likedByCurrentUser ? "reactionbtnLiked" : "reactionbtn") + `" id="postLike" value="${parentPostInfo.postId}">👍</button>
                    <a style="color: green; text-shadow: 1px 1px 0 #000; font-size: 30px;">${parentPostInfo.likes}</a>
                    <button class="` + (parentPostInfo.dislikedByCurrentUser ? "reactionbtnDisliked" : "reactionbtn") + `" id="postDislike" value="${parentPostInfo.postId}">👎</button>
                    <a style="color: red; text-shadow: 1px 1px 0 #000; font-size: 30px;">${parentPostInfo.dislikes}</a>
                </div>
            </div><br><br><br>
            <h1 style="font-size: 50px;">${descMsg}</h1>
            <div id="comments${parentPostInfo.postId}"></div>
        </div>
    `
}

const handlePostReactions = (userData) => {
    const postLikeBtns = document.querySelectorAll("#postLike")
    postLikeBtns.forEach(postLikeBtn => {
        postLikeBtn.addEventListener("click", () => {
            postReaction(parseInt(postLikeBtn.value), userData, "like", "post")
        })
    })

    const postDislikeBtns = document.querySelectorAll("#postDislike")
    postDislikeBtns.forEach(postDislikeBtn => {
        postDislikeBtn.addEventListener("click", () => {
            postReaction(parseInt(postDislikeBtn.value), userData, "dislike", "post")
        })
    })
}

const addUserPageHtml = (userData, viewedUserData, viewedUserId) => {
    document.querySelector("#app").innerHTML = `
        <div class="header">
            <div style="direction: rtl">
                <a>Welcome to the Forum, </a>
                <a href="/user?id=${userData.userId}" data-link>${userData.nickname}</a>
            </div>
            <div class="headerBtnsContainer">
                <button id="chatBtn" style="height: fit-content;" class="button-33"></button>
                <a style="font-size: 65px;  text-decoration: none;" href="/" data-link>🏠</a>
                <a class="button-33" href="/logout" data-link>Log out</a> 
            </div>
        </div>
        <div style="text-align: center;">
            <div class="messageContainer" style="justify-content: center;">
                <h1 style="font-size: 50px; padding-right: 10px;">${viewedUserData.nickname}</h1>
                <div class="statusIndicator" style="background: ${viewedUserData.online ? 'green' : 'grey'}"></div>
            </div>
            <p>Age: ${viewedUserData.age}</p>
            <p>Gender: ${viewedUserData.gender}</p>
            <p>First name: ${viewedUserData.firstName}</p>
            <p>Last name: ${viewedUserData.lastName}</p>
            <p>Email: ${viewedUserData.email}</p>
        </div>
        <div id="msgUser" style="text-align: center;"></div>
        <ul class="toolbar">
            <li class="option" id="created-posts">Created Posts</li>
            <li class="option" id="created-comments">Created Comments</li>
            <li class="option" id="liked-posts">Liked Posts</li>
            <li class="option" id="liked-comments">Liked Comments</li>
            <li class="option" id="disliked-posts">Disliked Posts</li>
            <li class="option" id="disliked-comments">Disliked Comments</li>
        </ul>
        <div id="selectContent"></div>
        <div id="snackbar"></div>
    `
    
    if(viewedUserId != userData.userId) {
        document.getElementById("msgUser").innerHTML = `
            <button id="msgBtn" class="button-33">Message this user</button
        `
        document.getElementById("msgBtn").addEventListener("click", () => {
            navigateTo(`/chat?id=${viewedUserId}`)
        })
    }
}
