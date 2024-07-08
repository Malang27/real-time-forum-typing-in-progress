document.addEventListener('DOMContentLoaded', () => {
    const socket = new WebSocket('ws://your-server-address/ws');

    socket.addEventListener('open', function (event) {
        console.log('WebSocket is open now.');
    });

    socket.addEventListener('message', function (event) {
        console.log('Message from server ', event.data);
        const messageList = document.getElementById('messageList');
        const message = JSON.parse(event.data);
        const messageElement = document.createElement('div');
        messageElement.textContent = `${message.sender}: ${message.content}`;
        messageList.appendChild(messageElement);
    });

    document.getElementById('sendMessageForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const recipient = this.recipient.value;
        const content = this.content.value;
        socket.send(JSON.stringify({ recipient, content }));
        this.reset();
    });
});
