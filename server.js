var _http = require('http'),
    _path = require('path'),
    _send = require('send'),
    _fs = require('fs'),
    _less = require('less'),
    _browserify = require('browserify'),
    _url = require('url'),
    _engine = require('engine.io');

var httpServer = _http.createServer(function(req, res){
    // your custom error-handling logic:
    function error(err) {
        res.statusCode = err.status || 500;
        res.end(err.message);
    }

    var path = _url.parse(req.url).pathname;

    var paths = ['/main.js', '/worker.js'];

    if (paths.indexOf(path) !== -1) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });

        var b = _browserify();
        b.add(_path.join(__dirname, 'source', path.substring(1)));
        b.require(_path.join(__dirname, 'node_modules', 'engine.io-client', 'lib', 'index.js'), {
            expose: 'engine.io-client'
        });
        b.bundle({
            debug: true
        }).pipe(res);
    } else if (path === '/main.css') {

        var parser = new(_less.Parser)({
            paths: ['./source'],
            filename: 'main.less'
        });

        var source = _fs.readFileSync(_path.join(__dirname, 'source', 'main.less'));
        parser.parse(source.toString(), function (e, tree) {
            if (e) { throw e; }
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end(tree.toCSS());
        });

    } else {
        _send(req, path)
            .root(_path.join(__dirname, 'web'))
            .on('error', error)
            .pipe(res);
    }

});

httpServer.listen(80, function () {
    console.log('http server listen: 80');
});


var Room = function () {
    this.sockets = [];
};

Room.prototype.join = function (socket) {
    this.sockets.push(socket);
};

Room.prototype.send = function (data, exclude) {
    exclude = exclude || [];

    this.sockets.forEach(function (socket) {
        if ((exclude.indexOf(socket) === -1)) {
            socket.send(data);
        }
    }, this);
};

Room.prototype.leave = function (socket) {
    var index = this.sockets.indexOf(socket);

    if (index !== -1) {
        this.sockets.splice(index, 1);
        this.send(JSON.stringify({
            action: 'leave',
            parameters: [socket.id]
        }));
    }
};

var rooms = {};

function hasRoom(name) {
    return rooms.hasOwnProperty(name);
}

function createRoom(name) {
    return rooms[name] = new Room(name);
}

function getRoom(name) {
    return rooms[name];
}

function leaveRooms (socket) {
    Object.keys(rooms).forEach(function (room_name) {
        rooms[room_name].leave(socket);
    });
}

function joinAction (room_name) {
    var room, room_is_new;

    if (!hasRoom(room_name)) {
        room = createRoom(room_name);
        room_is_new = true;
    } else {
        room = getRoom(room_name);
        room_is_new = false;
    }
    if (!room_is_new) {
        room.send(JSON.stringify({
            action: 'join',
            parameters: [this.id]
        }));
    }
    room.join(this);
}

function messageAction (room_name) {
    var room;

    if (hasRoom(room_name)) {
        room = getRoom(room_name);
        room.send(message.parameters[1], [socket]);
    }
}

function icecandidateAction(remotePeerId, icecandidate) {
    engineServer.clients[remotePeerId].send(JSON.stringify({
        action: 'rtc-icecandidate',
        parameters: [this.id, icecandidate]
    }));
}

function offerAction(remotePeerId, localDescription) {
    engineServer.clients[remotePeerId].send(JSON.stringify({
        action: 'rtc-offer',
        parameters: [this.id, localDescription]
    }));
}

function answerAction(remotePeerId, localDescription) {
    engineServer.clients[remotePeerId].send(JSON.stringify({
        action: 'rtc-answer',
        parameters: [this.id, localDescription]
    }));
}

var engineServer = _engine.attach(httpServer);

engineServer.on('connection', function (socket) {

    socket.on('message', function (data) {
        var message = JSON.parse(data);

        switch (message.action) {
            case 'join':
                joinAction.apply(socket, message.parameters);
            break;

            case 'message':
                messageAction.apply(socket, message.parameters);
            break;

            case 'rtc-icecandidate':
                icecandidateAction.apply(socket, message.parameters);
                break;

            case 'rtc-offer':
                offerAction.apply(socket, message.parameters);
                break;
            case 'rtc-answer':
                answerAction.apply(socket, message.parameters);
                break;
        }
    });

    socket.on('close', function () {
        leaveRooms(socket);
    });

});