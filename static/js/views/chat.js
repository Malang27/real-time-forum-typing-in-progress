import { getDataFromServer, hasSession, showNotificationSnackbar } from "./helpers.js"
import { navigateTo } from "./router.js"
import { sendEvent, waitForSocketConnection } from "./ws.js"

var amount, scrolling, scrollEnd, scrollHeightBeforeLoad, receiverId, otherChatterNickname, userNickname

export default async function () {
    const isAuthorized = await hasSession()
    if (!isAuthorized) {
        navigateTo("/login")
        return
    } else {
        const url = new URL(window.location.href)
        amount = 10
        scrollEnd = false
        receiverId = url.searchParams.get("id")

        const userData = JSON.parse(localStorage.getItem("userData"))
        otherChatterNickname = await getDataFromServer(`get-nickname?id=${receiverId}`)
        userNickname = userData.nickname

        if (receiverId == userData.userId) {
            navigateTo("/")
            return
        }

        waitForSocketConnection(window.socket, () => {
            getMessages(parseInt(userData.userId), parseInt(receiverId), amount)
            sendEvent("get_chatbar_data", userData.userId)
        })

        addChatpageHtml(otherChatterNickname);

        addMessageSending(userData)

        document.getElementById("chatBox").addEventListener("scroll", () => {
            throttle(loadAdditionalMessages(parseInt(userData.userId), parseInt(receiverId)), 50)
        })
    }
}

const addMessageSending = (userData) => {
    const msgContent = document.getElementById("msgContent")
    const submitBtn = document.getElementById("submitBtn")
    const typingIndicator = document.getElementById("typingIndicator");

    submitBtn.disabled = true
    msgContent.addEventListener("input", () => {
        if (msgContent.value.trim()) {
            submitBtn.disabled = false
            sendEvent("typing_start", { senderId: userData.userId, receiverId: parseInt(receiverId) });
        } else {
            submitBtn.disabled = true
            typingIndicator.style.display = "none";
            sendEvent("typing_stop", { senderId: userData.userId, receiverId: parseInt(receiverId) });

        }
    })

    const msgBody = {}
    const sendMsgForm = document.getElementById("sendMsg")

    sendMsgForm.addEventListener("submit", async (event) => {
        event.preventDefault()
        if (msgContent.value.trim()) {
            submitMsgForm()
        }
    })

    const textArea = document.getElementById("msgContent")
    textArea.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            if (msgContent.value.trim()) {
                submitMsgForm()
            }
        }
    })

    const submitMsgForm = () => {
        msgBody["senderId"] = userData.userId
        msgBody["receiverId"] = parseInt(receiverId)
        msgBody["message"] = msgContent.value

        sendEvent("send_message", msgBody)
        sendMsgForm.reset()
        submitBtn.disabled = true
    }
}

/*********Typing-Module*********/
export function handleTypingStart(payload) {
    console.log("Typing start event received:", payload);
    showTypingIndicator(payload.senderId, payload.receiverId);
}

export function handleTypingStop(payload) {
    hideTypingIndicator(payload.senderId, payload.receiverId);
}

let typingTimer;

function showTypingIndicator(senderId, receiverId) {
    const fullPath = window.location.pathname + window.location.search;
    if (fullPath === `/chat?id=${senderId}`) {
        const typingIndicator = document.getElementById("typingIndicator");
        typingIndicator.style.display = "block";
        const typingMessage = document.getElementById("typingMessage")
        typingMessage.style.display = "block"
        // Réinitialiser le délai
        clearTimeout(typingTimer);
        typingTimer = setTimeout(function () {
            typingIndicator.style.display = "none";
            typingMessage.style.display = "none";
        }, 1000);
    }
}

function hideTypingIndicator(senderId) {
    const fullPath = window.location.pathname + window.location.search;
    if (fullPath === `/chat?id=${senderId}`) {
        const typingIndicator = document.getElementById("typingIndicator");
        typingIndicator.style.display = "none";
        const typingMessage = document.getElementById("typingMessage")
        typingMessage.style.display = "none"
    }
}

/*********Typing-Module*********/

const loadAdditionalMessages = (userId) => {
    if (document.getElementById("chatBox").scrollTop === 0 && !scrollEnd) {
        amount += 10
        scrollHeightBeforeLoad = document.getElementById("chatBox").scrollHeight
        getMessages(userId, parseInt(receiverId), amount)
        scrolling = true
    }
}

function throttle(func, wait) {
    var lastEvent = 0
    return function () {
        var currentTime = new Date()
        if (currentTime - lastEvent > wait) {
            func.apply(this, arguments)
            lastEvent = currentTime
        }
    }
}

const getMessages = (currentChatterId, otherChatterId, amount) => {
    const payload = {
        currentChatterId,
        otherChatterId,
        amount
    }
    sendEvent("get_messages", payload)
}

const updateMessages = (messages) => {
    const chatBox = document.getElementById("chatBox")
    chatBox.innerHTML = ""
    var msgType, prevMsg, prevMsgType

    messages.forEach(message => {
        if (message.receiverId != receiverId) {
            msgType = "Received"
        } else {
            msgType = "Sent"
        }

        chatBox.innerHTML += `
            <div class="messageContainer ${msgType === 'Received' ? 'received' : 'sent'}">
                <div id="msgBox" class="msgBox${msgType}" data-linked="${message.messageId}">
                    <a style="font-size: 15px; white-space: pre-wrap;">${message.message.trim()}</a>
                </div>
                <div id="timeBox" class="timeBox${msgType}" data-link="${message.messageId}">
                    <a>${message.sentDate}</a>
                </div>
            </div>
        `

        prevMsg = message
        prevMsgType = msgType
    })

    addHoverListeners()

    if (!scrolling) {
        chatBox.scrollTop = chatBox.scrollHeight
    } else {
        chatBox.scrollTop = chatBox.scrollHeight - scrollHeightBeforeLoad
        if (amount > messages.length) {
            scrollEnd = true
        }
        scrolling = false
    }
}

const addHoverListeners = () => {
    const hoveredDivs = document.querySelectorAll('#msgBox');

    hoveredDivs.forEach(hoveredDiv => {
        hoveredDiv.addEventListener('mouseenter', (event) => {
            const linkedId = event.target.getAttribute('data-linked');
            const linkedDiv = document.querySelector(`#timeBox[data-link="${linkedId}"]`);

            // Change the style of the linked div
            linkedDiv.style.visibility = 'visible';
        });

        hoveredDiv.addEventListener('mouseleave', (event) => {
            const linkedId = event.target.getAttribute('data-linked');
            const linkedDiv = document.querySelector(`#timeBox[data-link="${linkedId}"]`);

            // Reset the style of the linked div
            linkedDiv.style.visibility = 'hidden';
        });
    });
}


export const handleSendMessage = (payload) => {
    console.log("sent message")
    amount++
    getMessages(payload.senderId, payload.receiverId, amount)
    sendEvent("get_chatbar_data", payload.senderId)
}

export const handleNewMessage = (payload) => {
    console.log("received message")
    const fullPath = window.location.pathname + window.location.search
    if (fullPath === `/chat?id=${payload.senderId}`) {
        amount++
        getMessages(payload.senderId, payload.receiverId, amount)
    } else {
        showNotificationSnackbar(payload)
    }
    sendEvent("get_chatbar_data", payload.receiverId)
}

export const handleGetMessages = (payload) => {
    if (payload.messages) {
        updateMessages(payload.messages)
        console.log("successfully retrieved messages")
    } else {
        console.log("retrieving messages")
    }
}

export const handleGetChatbarData = (payload) => {
    if (payload instanceof Array) {
        console.log("successfully retrieved chatbar data")
        payload.sort((a, b) => {
            const dateA = new Date(a.lastMsgData.sentDate)
            const dateB = new Date(b.lastMsgData.sentDate)

            if (a.lastMsgData.sentDate === '') return 1
            if (b.lastMsgData.sentDate === '') return -1
            return dateB - dateA;
        })
        addChatbarHtml(payload)
    } else {
        console.log("retrieving chatbar data")
    }
}


const addChatbarHtml = async (users) => {
    const chatDiv = document.getElementById("userArea");
    chatDiv.innerHTML = "";

    users.forEach(user => {
        const userDiv = document.createElement("div");
        userDiv.className = "userbix";

        const statusDiv = document.createElement("div");
        statusDiv.className = "status";
        statusDiv.style.backgroundColor = user.online ? 'green' : 'grey';

        const userNickNameDiv = document.createElement("div");
        userNickNameDiv.className = "userNickName";
        const userLink = document.createElement("a");
        //   userLink.href = `/user?id=${user.userId}`;
        userLink.textContent = user.nickname;
        userNickNameDiv.appendChild(userLink);

        const messageLink = document.createElement("a");
        messageLink.href = `/chat?id=${user.userId}`;
        messageLink.className = "msg";
        messageLink.setAttribute("data-link", ""); // Set data-link attribute explicitly
        messageLink.innerHTML = `<i class="fa-solid fa-message"></i>`;

        userDiv.appendChild(statusDiv);
        userDiv.appendChild(userNickNameDiv);
        userDiv.appendChild(messageLink);

        // Attach click event listener to the message link
        messageLink.addEventListener("click", (event) => {
            event.preventDefault();
            try {
                navigateTo(messageLink.getAttribute("href"));
            } catch (error) {
                console.error("Error navigating to chat:", error);
                // Handle navigation error gracefully (e.g., display an error message)
            }
        });
        chatDiv.appendChild(userDiv);
    });
};

const addChatpageHtml = (nickname) => {
    document.querySelector("#chat-container").innerHTML = `
            <div style="text-align: center;" class="chatContainer">
                <div class="chatHeader">
                    <h5 style="font-size: 20px;" id="header">Chatting with ${nickname}<span><h6 id="typingMessage" style="display: none;">${nickname} is typing ...</h6></span></h5>
                    <div class="main-container" id="typingIndicator" style="display: none;">
                        <div class="inner-container" >
                            <div class="dots-container">
                            <span class="point"></span>
                            <span class="point"></span>
                            <span class="point"></span>
                            </div>
                        </div>
                    </div>
                    <div class="exit" id="exit">x</div>
                </div>
                <div class="chatBox" id="chatBox"></div>
                <form id="sendMsg">
                    <div class="messageContainer">
                        <textarea id="msgContent" class="createPostHeaderAndTags" style="height: 60px; width: 95%; resize: none;" placeholder="Message" type="text" required></textarea>
                        <button id="submitBtn"class="button-33" style="margin-left: 10px;" type="submit">Send</button>
                    </div>
                </form>
            </div>
        `
    var exit = document.getElementById('exit');
    var chatContainer = document.querySelector('.chatContainer');
    exit.addEventListener('click', () => {
        chatContainer.style.display = 'none';
        navigateTo('/')
    })
}
