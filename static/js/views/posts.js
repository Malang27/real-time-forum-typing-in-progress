import { sendEvent, waitForSocketConnection } from "./ws.js";
import { hasSession, handleDefaultResponse, getDataFromServer } from "./helpers.js";
import { addHomePageHtml } from "./home.js";
import { navigateTo } from "./router.js";

export default async function() {
    const isAuthorized = await hasSession();
    if (!isAuthorized) {
        navigateTo("/login");
        return;
    } else {
        const url = new URL(window.location.href);
        const postId = url.searchParams.get("id");

        const userData = JSON.parse(localStorage.getItem("userData"));
        const allInfo = await getDataFromServer(`/get-post-details?postId=${postId}&userId=${userData.userId}`);

        waitForSocketConnection(window.socket, () => {
            sendEvent("get_chatbar_data", userData.userId);
        });

        addHomePageHtml(userData);
        addToolbarAndPostHtml(allInfo);

        if (allInfo.commentsInfo) {
            allInfo.commentsInfo.forEach(comment => {
                addCommentHtml(comment, "comments");
            });
        }

        addCommentFormFunctionality(userData, postId);
        handlePostReactions(parseInt(postId), userData);
        handleCommentReactions(userData);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const handlePostReactions = (postId, userData) => {
    var like = document.getElementById("like");
    var dislike = document.getElementById("disLike");
    like.addEventListener("change", () => {
        delay(510).then(() => postReaction(postId, userData, "like", "post"));
    });

    dislike.addEventListener("change", () => {
        delay(510).then(() => postReaction(postId, userData, "dislike", "post"));
    });
}

export const handleCommentReactions = (userData) => {
    const commentLikeBtns = document.querySelectorAll("#commentLike");
    commentLikeBtns.forEach(commentLikeBtn => {
        commentLikeBtn.addEventListener("click", () => {
            postReaction(parseInt(commentLikeBtn.value), userData, "like", "comment");
        });
    });
    const commentDislikeBtns = document.querySelectorAll("#commentDislike");
    commentDislikeBtns.forEach(commentDislikeBtn => {
        commentDislikeBtn.addEventListener("click", () => {
            postReaction(parseInt(commentDislikeBtn.value), userData, "dislike", "comment");
        });
    });
}

export const postReaction = async (postId, userData, reactionType, postType) => {
    const addReactionData = {
        reactionType,
        postType,
        "postOrCommentId": postId,
        "userId": userData.userId
    };
    const options = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(addReactionData)
    };
    try {
        const response = await fetch("/post-reaction", options);
        handleDefaultResponse(response);
    } catch (error) {
        console.error(error);
    }
}

const addCommentFormFunctionality = (userData, postId) => {
    const commentContent = document.getElementById("commentContent");
    const submitBtn = document.getElementById("submitBtn");

    submitBtn.disabled = true;
    commentContent.addEventListener("input", () => {
        if (commentContent.value.trim()) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    });

    const createCommentData = {};
    document.getElementById("createComment").addEventListener("submit", async (event) => {
        event.preventDefault();
        if (commentContent.value.trim()) {
            createCommentData["creatorId"] = userData.userId;
            createCommentData["postId"] = parseInt(postId);
            createCommentData["commentContent"] = document.getElementById("commentContent").value;
            const options = {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(createCommentData)
            };
            try {
                const response = await fetch("/create-comment", options);
                handleDefaultResponse(response);
            } catch (error) {
                console.error(error);
            }
        }
    });
}

export const addCommentHtml = (comment, contentDivId) => {
    document.querySelector(`#${contentDivId}`).innerHTML += `
    <div class="like-dislike-container">
        <div class="user">
            <svg class="post-profile" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z"></path>
            </svg>
            <h2>
                <span>@</span>${comment.creatorNickname}
            </h2>
        </div>
        <div class="postcontent">
            <a style="white-space: pre-wrap;">${comment.commentContent}</a>
        </div>
        <div class="reaction-comments">
            <div class="CommentTime">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>
                <a>${comment.creationDate}</a><br>
            </div>
        </div>
    </div>
    `;
}

const addToolbarAndPostHtml = (allInfo) => {
    document.getElementById("posts").innerHTML = `
    <div class="like-dislike-container">
        <div class="user">
            <svg class="post-profile" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z"></path>
            </svg>
            <h2>
                <span>@</span>${allInfo.parentPostInfo.creatorNickname}
            </h2>
        </div>
        <div id="categoriesOfPost${allInfo.parentPostInfo.postId}" class="categories"></div>
        <div class="postDetails">
            <h3 class="text-content">
                ${allInfo.parentPostInfo.postContent}
            </h3>
        </div>
        <div class="time-comment-like">
            <div class="CommentTime">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>
                <h4>${allInfo.parentPostInfo.creationDate}</h4>
            </div>
            <div class="comment">
                <h4>comments : ${allInfo.parentPostInfo.comments}</h4>
            </div>
        </div>
    </div>
    <h1>Comments...</h1>
    <div id="comments"></div>
    <form id="createComment">
        <textarea id="commentContent" placeholder="Add comment" type="text"></textarea>
        <button id="submitBtn" class="button-33" type="submit">Submit comment</button>
    </form>
   
    <div id="snackbar"></div>
    `;
}

