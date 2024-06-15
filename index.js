const express = require('express');
const multer = require('multer');
const mime = require('mime-types');
const path = require('path');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
    maxHttpBufferSize: 1e8
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


let onlineUsers = {};

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/upload', upload.single('file'), (req, res) => {
    if (req.file) {
        res.json({ url: `/uploads/${req.file.filename}` });
    } else {
        res.status(400).send('No file uploaded');
    }
});

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

    socket.on('file', function(fileInfo) {
        const type = mime.lookup(fileInfo.url) || 'application/octet-stream';
        io.emit('file', { ...fileInfo, nickname: nickname, type: type });
    })

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
});

server.listen(3000, () => {
    console.log('listening on *:3000');
})