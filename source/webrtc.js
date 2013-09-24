const configuration = {
    iceServers: [
        { url: 'stun:stun.l.google.com:19302' },
        { url: 'stun:stun1.l.google.com:19302' },
        { url: 'stun:stun2.l.google.com:19302' },
        { url: 'stun:stun3.l.google.com:19302' },
        { url: 'stun:stun4.l.google.com:19302' },
        { url: 'stun:stun01.sipphone.com' },
        { url: 'stun:stun.ekiga.net' },
        { url: 'stun:stun.fwdnet.net' },
        { url: 'stun:stun.ideasip.com' },
        { url: 'stun:stun.iptel.org' },
        { url: 'stun:stun.rixtelecom.se' },
        { url: 'stun:stun.schlund.de' },
        { url: 'stun:stunserver.org' },
        { url: 'stun:stun.softjoys.com' },
        { url: 'stun:stun.voiparound.com' },
        { url: 'stun:stun.voipbuster.com' },
        { url: 'stun:stun.voipstunt.com' },
        { url: 'stun:stun.voxgratia.org' },
        { url: 'stun:stun.xten.com' }
    ]
};
const constraints = {optional: [{RtpDataChannels: true}]};

function logError(error) {
    console.error(error.name + ": " + error.message);
}

var Connection = function (remotePeerId) {

    this.remotePeerId = remotePeerId;
    this.connection = this.createConnection();

    this.onanswer = function () {};
    this.onicecandidate = function () {};
    this.onoffer = function () {};
    this.ondatachannel = function () {};

    this.onerror = function () {};
};

Connection.prototype.createConnection = function () {
    var me = this,
        connection = new webkitRTCPeerConnection(configuration, constraints);

    connection.ondatachannel = function (event) {
        me.ondatachannel({
            remotePeerId: me.remotePeerId,
            channel: event.channel
        });
    };

    connection.onicecandidate = function (event) {
        if (event.candidate) {
            me.onicecandidate({
                remotePeerId: me.remotePeerId,
                candidate: event.candidate
            });
        }
    };

    connection.onnegotiationneeded = function () {
        connection.createOffer(function (description) {
            connection.setLocalDescription(description, function () {
                me.onoffer({
                    remotePeerId: me.remotePeerId,
                    localDescription: connection.localDescription
                });
            }, logError);
        }, logError);
    };

    return connection;
};

Connection.prototype.createDataChannel = function (label, options) {
    return this.connection.createDataChannel(label, options);
};

Connection.prototype.close = function () {
    this.connection.close();
};

Connection.prototype.nofityIceCandidate = function (candidate) {
    this.connection.addIceCandidate(new RTCIceCandidate(candidate));
};

Connection.prototype.nofityOffer = function (description) {
    var me = this,
        connection = this.connection;

    connection.setRemoteDescription(new RTCSessionDescription(description), function () {
        if (connection.remoteDescription.type !== 'offer') {
            return;
        }
        connection.createAnswer(function (localDescription) {
            connection.setLocalDescription(localDescription, function () {
                me.onanswer({
                    remotePeerId: me.remotePeerId,
                    localDescription: connection.localDescription
                });
            }, logError);
        }, logError);
    }, logError);

};

Connection.prototype.nofityAnswer = function (description) {
    this.connection.setRemoteDescription(new RTCSessionDescription(description), function () {

    }, logError);
};














var Connections = function () {
    this.connections = {};

    this.onanswer = function () {};
    this.onicecandidate = function () {};
    this.onoffer = function () {};
    this.ondatachannel = function () {};

};

Connections.prototype.create = function (remotePeerId) {
    var connection = new Connection(remotePeerId);

    connection.onanswer = this.onanswer.bind(this);
    connection.onicecandidate = this.onicecandidate.bind(this);
    connection.onoffer = this.onoffer.bind(this);
    connection.ondatachannel = this.ondatachannel.bind(this);

    return connection;
};

Connections.prototype.get = function (remotePeerId) {
    if (!this.connections.hasOwnProperty(remotePeerId)) {
        return this.connections[remotePeerId] = this.create(remotePeerId);
    }
    return this.connections[remotePeerId];
};

Connections.prototype.createDataChannel = function (remotePeerId, label, options) {
    return this.get(remotePeerId).createDataChannel(label, options);
};

Connections.prototype.nofityIceCandidate = function (remotePeerId, candidate) {
    this.get(remotePeerId).nofityIceCandidate(candidate);
};

Connections.prototype.nofityOffer = function (remotePeerId, description) {
    this.get(remotePeerId).nofityOffer(description);
};

Connections.prototype.nofityAnswer = function (remotePeerId, description) {
    this.get(remotePeerId).nofityAnswer(description);
};

Connections.prototype.close = function (remotePeerId) {
    if (!this.connections.hasOwnProperty(remotePeerId)) {
        return; //TODO
    }
    this.connections[remotePeerId].close();
    delete this.connections[remotePeerId];
};




module.exports = {
    createConnections: function () {
        return new Connections();
    }
};