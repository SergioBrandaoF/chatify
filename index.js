const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

let onlineUsers = {};

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {

    let nickname = '';

    console.log('Number of connected clients:', io.engine.clientsCount);

    socket.on('nickname', (name) => {
        nickname = name;
        onlineUsers[socket.id] = name;
        io.emit('chat message', { nickname: 'Server', message: `${name} has joined the chat` });
        io.emit('online users', Object.values(onlineUsers));
        console.log(`${name} connected`);
    });

    socket.on('chat message', (msg) => {
        const nickname = onlineUsers[socket.id];
        io.emit('chat message', { nickname, message: msg });
        console.log(`${nickname}: ${msg}`);
    });

    socket.on('private message', ({recipientNickname, msg}) => {
        for (let [id, userNickname] of Object.entries(onlineUsers)) {
            if (userNickname === recipientNickname) {
                io.to(id).emit('private message', {sender: nickname, msg});
            }
        }
    });

    socket.on('typing', (user) => {
        socket.broadcast.emit('typing', user)
    });

    socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing');
    })
    
    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        io.emit('chat message', { nickname: 'Server', message: `${nickname} has left the chat` })
        io.emit('online users', Object.values(onlineUsers));
        console.log(`${nickname} disconnected`);
        console.log('Number of connected clients:', io.engine.clientsCount);
    });
})

server.listen(3000, () => {
    console.log('listening on *:3000');
})