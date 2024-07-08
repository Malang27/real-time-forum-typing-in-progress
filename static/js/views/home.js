import { sendEvent, waitForSocketConnection } from "./ws.js";
import {
  hasSession,
  handleDefaultResponse,
  getDataFromServer,
} from "./helpers.js";
import { navigateTo, navigateToWithoutSavingHistory } from "./router.js";

export default async function () {
  const isAuthorized = await hasSession();
  if (!isAuthorized) {
    navigateTo("/login");
    return;
  } else {
    const url = new URL(window.location.href);

    const userData = JSON.parse(localStorage.getItem("userData"));
    const category = url.searchParams.get("category");

    const allPosts = await getDataFromServer(
      `get-posts?userId=${userData.userId}`
    );
    const allCategories = await getDataFromServer("/get-all-categories");

    waitForSocketConnection(window.socket, () => {
      sendEvent("get_chatbar_data", userData.userId);
    });

    addHomePageHtml(userData);

    
    
    
    if (allPosts) {
      allPosts.forEach((post) => {
        addPostHtml(post, "posts");
      });
    }
    
    if (allCategories) {
      allCategories.forEach((category) => {
        addCategory(category);
      });
    }
    
    
    document.getElementById("addPost").addEventListener("click", (e) =>{
      e.preventDefault();
      addCreatePostHtml();
      document.getElementById("createPoste").style.display = "block";
      addPostCreation(userData);
    });

    const categorySelect = document.getElementById("categorySelect");
    categorySelect.addEventListener("change", (event) => {
      if (event.target.value) {
        navigateToWithoutSavingHistory(
          `/?category=${event.target.value.toLowerCase()}`
        );
      } else {
        navigateTo("/");
      }
    });

    if (category) {
      categorySelect.value = category.toUpperCase();
      const filteredPosts = await getDataFromServer(
        `/get-filtered-posts?category=${category.toUpperCase()}`
      );

      document.querySelector("#posts").innerHTML = "";
      filteredPosts.forEach((post) => {
        addPostHtml(post, "posts");
      });
    }
  }
}

export const addCategory = (category) => {
  const option = document.createElement("option");

  option.value = category;
  option.textContent = category;

  document.getElementById("categorySelect").appendChild(option);
};

const addPostCreation = (userData) => {
  const postContent = document.getElementById("postContent");
  const postHeader = document.getElementById("postHeader");
  const submitBtn = document.getElementById("submitBtn");

  submitBtn.disabled = true;
  postHeader.addEventListener("input", () => {
    changeBtnStatus();
  });

  postContent.addEventListener("input", () => {
    changeBtnStatus();
  });

  const changeBtnStatus = () => {
    if (postHeader.value.trim() && postContent.value.trim()) {
      submitBtn.disabled = false;
    } else {
      submitBtn.disabled = true;
    }
  };

  const createPostData = {};
  const createPostForm = document.getElementById("createPost");

  createPostForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (postHeader.value.trim() && postContent.value.trim()) {
      var formData = new FormData(createPostForm);
      createPostData["creatorId"] = userData.userId;

      for (var [key, value] of formData.entries()) {
        if (key === "postHeader") {
          value = value.trim();
        }
        createPostData[key] = value;
      }

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createPostData),
      };
      try {
        const response = await fetch("/create-post", options);
        handleDefaultResponse(response);
      } catch (error) {
        console.error(error);
      }
    }
  });
};

export const addChatboxListener = () => {
  const chatDiv = document.getElementById("messages");
  const appDiv = document.getElementById("app");
  const chatBtn = document.getElementById("chatBtn");

  if (chatDiv.dataset.value === "minimized") {
    chatBtn.innerHTML = "Show chat";
  } else {
    chatBtn.innerHTML = "Minimize chat";
  }

  chatBtn.addEventListener("click", () => {
    if (chatDiv.dataset.value === "minimized") {
      chatBtn.innerHTML = "Minimize chat";
      chatDiv.dataset.value = "maximized";
      appDiv.style.width = "75%";
      appDiv.style.right = "0";
      chatDiv.style.visibility = "visible";
    } else {
      chatBtn.innerHTML = "Show chat";
      chatDiv.dataset.value = "minimized";
      appDiv.style.width = "100%";
      chatDiv.style.visibility = "hidden";
    }
  });
};


export const addPostHtml = (post, contentDivId) => {
    document.querySelector(`#${contentDivId}`).innerHTML += `
    <div class="like-dislike-container">
    <div class="user">
      <svg
        class="post-profile"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 448 512">
        <path
          d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z"
        ></path>
      </svg>
      <h2>
        <span>@</span>
        ${post.creatorNickname}
      </h2>
    </div>
    <div id="categoriesOfPost${post.postId}" class="categories">
      <!-- <h4>categories : </h4>
        <h5>#<span>football </span></h5> -->
    </div>
    <div class="postDetails">
        <a class="titleText" href="/posts?id=${post.postId}" data-link style="cursor: pointer;">
          <h3 class="text-content">${post.postContent}</h3>
        </a>
    </div>
    <div class="time-comment">
      <div class="CommentTime">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>
        <h4>${post.creationDate}</h4>
      </div>
      <div class="comment">
        <h4>comments : ${post.comments}</h4>
      </div>
    </div>
  </div>  
          `;
    if (post.categories) {
      const categoryDiv = document.querySelector(
        `#categoriesOfPost${post.postId}`
      );
      categoryDiv.innerHTML += `<h4>Categories: </h4>`;
      post.categories.forEach((category) => {
        categoryDiv.innerHTML += `<h5><span>#</span>${category} </h5>`;
      });
    }
  };

export const addHomePageHtml = (userData) => {
  document.querySelector("#app").innerHTML = `
    <main>
    <nav class="main-menu">
        <a href="/" data-link><h1>Z01 Forum</h1></a>
        <ul>
            <li class="nav-item active">
                <b></b>
                <b></b>
                <a href="#">
                    <span class="nav-text">Home</span>
                </a>
            </li><br/>
            <li class="nav-item">
                <b></b>
                <b></b>
                <select id="categorySelect" name="categorySelect" class="catSelect">
                    <option value="" selected>All categories</option>
                </select>
            </li>
        </ul>
    </nav>

    <section class="content">
      <div id="snackbar"></div>
        <div class="left-content">
            <div class="activities">
                <div class="edit">
                  <h1>POSTS</h1>
                  <a id="addPost"><i class="fa-regular fa-pen-to-square"></i> add a post</a>
                </div>
                <div id="posts"></div>
            </div>
        </div>
        <div class="right-content">
            <div class="user-info">
              <img src="./static/img/Profile.png" alt="profile">
              <h2>${userData.nickname}</h2>
              <a class="Btne" href="/logout" data-link>
                <div class="sign"><svg viewBox="0 0 512 512"><path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path></svg></div>
                <div class="text">Logout</div>
              </a>
            </div>
            <div class="active-calories">
                <h1 style="align-self: center; margin-bottom: 10px; font-size : 30px">--Users--</h1>
                <div id="userArea"></div>
            </div>
            <div id="createPoste"></div>
        </div>
        <div id="chat-container"></div>

    </section>
</main>
        `;
};

export const addCreatePostHtml = () => {
  document.getElementById("createPoste").innerHTML = `
  <div class="addPostContainer">
  <div class="like-dislike-container">
    <div class="tool-box">
      <button class="btn-close" href="/" data-link>×</button>
    </div><br/>
    <form id="createPost">
          <input class="createPostHeaderAndTags" name="postHeader" id="postHeader" type="text" placeholder="Post header">
          <input class="createPostHeaderAndTags" name="categories" type="text" placeholder="Optional categories, separate each one with #">
      <textarea class="createPostContent" name="postContent" id="postContent" placeholder="Post content"></textarea>
      <button id="submitBtn" class="button-33" type="submit">Submit post</button>
    </form><br/>
  </div>
  </div>
  `
}
