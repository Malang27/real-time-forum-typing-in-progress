import { handleGetChatbarData, handleGetMessages, handleNewMessage, handleSendMessage, handleTypingStart, handleTypingStop } from "./chat.js"

export class Event {
    constructor(type, payload) {
        this.type = type
        this.payload = payload
    }
}

export const addConnection = () => {
    const userData = JSON.parse(localStorage.getItem("userData"))
    const socket = new WebSocket(`ws://${document.location.host}/ws?userId=${userData.userId}`)

    console.log("Attempting websocket connection")

    socket.onopen = () => {
        console.log("successfully connected")
    }

    socket.onclose = (event) => {
        console.log("socket closed connection", event)
    }

    socket.onerror = (err) => {
        console.log("Socket error: ", err)
    }

    socket.onmessage = (e) => {
        const eventData = JSON.parse(e.data)

        const event = Object.assign(new Event, eventData)

        routeEvent(event)
    }

    window.socket = socket
}

export function routeEvent(event) {
    if (event.type === undefined) {
        console.log("no type field in the event")
    }

    switch (event.type) {
        case "send_message":
            handleSendMessage(event.payload)
            break
        case "new_message":
            handleNewMessage(event.payload)
            break
        case "get_messages":
            handleGetMessages(event.payload)
            break
        case "get_chatbar_data":
            handleGetChatbarData(event.payload)
            break
        case "update_chatbar_data":
            console.log("updating chatbar data")
            break
        case "typing_start":
            handleTypingStart(event.payload);
            break;
        case "typing_stop":
            handleTypingStop(event.payload);
            break;
        default:
            //alert("unsupported message type")
            break
    }
}

export function sendEvent(eventName, payload) {
    const event = new Event(eventName, payload)

    window.socket.send(JSON.stringify(event))
    routeEvent(event)
}

export function waitForSocketConnection(socket, callback) {
    setTimeout(
        function () {
            if (socket && socket.readyState === 1) {
                console.log("Connection is made")
                if (callback != null) {
                    callback()
                }
            } else {
                console.log("wait for connection...")
                waitForSocketConnection(socket, callback)
            }

        }, 5)
}