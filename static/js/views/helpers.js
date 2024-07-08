import { navigateTo, router } from "./router.js"

export const hasSession = async () => {
    if(localStorage.getItem("userData")) {
        const userData = JSON.parse(localStorage.getItem("userData"))
        const sessionExists = await hasCookie(userData.cookieId)
        if(sessionExists) {
            return true
        } else {
            localStorage.removeItem("userData")
        }
    }
    return false
}

export const hasCookie = async (cookieId) => {
    try {
        const url = `/get-cookie?cookieId=${cookieId}`;
        const response = await fetch(url);
        if(response.ok) {
            return true
        } else {
            return false
        }
    } catch (error) {
        console.error("Error:", error);
        return false;
    }
}

export const handleDefaultResponse = async (response) => {
    if(response.ok) {
        router()
    } else {
        const statusMsg = await response.text()
        console.log(statusMsg)
    }
}

export const showNotificationSnackbar = async (msgData) => {
    var snackBar = document.getElementById("snackbar")
    var senderNickname = await getDataFromServer(`get-nickname?id=${msgData.senderId}`)

    snackBar.className = "show"
    snackBar.innerHTML = `New message from ${senderNickname}! Click here to view!`

    snackBar.addEventListener("click", () => {
        navigateTo(`/chat?id=${msgData.senderId}`)
    })

    setTimeout(function(){ snackBar.className = snackBar.className.replace("show", "") }, 5000)
}

export const getDataFromServer = async (url) => {
    try {
        const response = await fetch(url)
        if (response.ok) {
            const data = await response.json()
            return data
        } else {
            console.log(response.statusText)
        }
    } catch (error) {
        console.error(error)
    }
}