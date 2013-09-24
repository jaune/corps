var _physics = require('./physics.js');

var world = _physics.createWorld();
var _glMatrix = require('./gl-matrix.js');

var mat2d = _glMatrix.mat2d;
var vec2 = _glMatrix.vec2;

mat2d.toSvgTransform = function (a) {
    return 'matrix(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' + a[4] + ', ' + a[5] + ')';
};



var Entity = function () {
};

var Character = function () {
    Positionable.call(this);
    Rendrerable.call(this);
    Movable.call(this);
    AxisAlignedBoundingBox.call(this);
};
Character.prototype = Object.create(Entity.prototype);

var AxisAlignedBoundingBox = function () {
    this.localAABBox_at = null;
    this.localAABBoxMax = vec2.create();
    this.localAABBoxMin = vec2.create();

    this.globalAABBox_at = null;
    this.globalAABBoxMax = vec2.create();
    this.globalAABBoxMin = vec2.create();

    this.globalAABBoxCollisions = [];
};

var OrientedBoundingBox = function () {
};

var Positionable = function () {
    this.positioned_at = null;

    this.position = vec2.create();
    this.orientation = 0;

    this.localMatrix = mat2d.create();
};

var Movable = function () {
    this.acceleration = vec2.create();
    this.velocity = vec2.create();
};

var Rendrerable = function () {
    this.rendered_at = null;

    this.nodes = {};
};


var Rendrerables = function () {
    this.rendrerables = [];
    this.view = null;
};

Rendrerables.prototype.createDOMNodes = function () {
    var view = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    view.setAttribute('width', '100%');
    view.setAttribute('height', '100%');

    this.view = view;

    return view;
};

Rendrerables.prototype.updateDOMNodes = function (frame, elapsed) {
    var e = 0;

    this.rendrerables.forEach(function (rendrerable) {
        var change_at = Math.max(rendrerable.positioned_at, rendrerable.globalAABBox_at);

        if (rendrerable.rendered_at === null) {
            rendrerable.rendered_at = frame;
            this.view.appendChild(this.createEntityDOMNodes(rendrerable));
            e++;
        } else if (change_at > rendrerable.rendered_at) {
            rendrerable.rendered_at = frame;
            this.updateEntityDOMNodes(rendrerable);
            e++;
        }

    }, this);

    // console.debug('render by frame: '+e);
};


Rendrerables.prototype.createEntityDOMNodes = function (entity) {
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    g.setAttribute('transform', mat2d.toSvgTransform(entity.localMatrix));
    entity.nodes.transform = g.getAttributeNode('transform');

    var center = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    center.setAttribute('class', 'center');
    center.setAttribute('transform', 'rotate(45) translate(-5, -5)');
    center.setAttribute('width', '10');
    center.setAttribute('height', '10');

    g.appendChild(center);

    this.createAABBoxDOMNodes(entity, g);

    var velocity = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    velocity.setAttribute('class', 'velocity');
    velocity.setAttribute('d', 'M 0,0 ' + (entity.velocity[0] + ', ' + entity.velocity[1]));
    entity.nodes.velocity = velocity.getAttributeNode('d');

    g.appendChild(velocity);

    var acceleration = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    acceleration.setAttribute('d', 'M 0,0 ' + (entity.acceleration[0] + ', ' + entity.acceleration[1]));
    acceleration.setAttribute('class', 'acceleration');
    entity.nodes.acceleration = acceleration.getAttributeNode('d');

    g.appendChild(acceleration);

    return g;
};

Rendrerables.prototype.updateEntityDOMNodes = function (entity) {
    entity.nodes.transform.value = mat2d.toSvgTransform(entity.localMatrix);
    entity.nodes.velocity.value = 'M 0,0 ' + (entity.velocity[0] * 500) + ', ' + (entity.velocity[1] * 500);
    entity.nodes.acceleration.value = 'M 0,0 ' + (entity.acceleration[0] * 500000) + ', ' + (entity.acceleration[1] * 500000);

    this.updateAABBoxDOMNodes(entity);
};


Rendrerables.prototype.createAABBoxDOMNodes = function (entity, g) {
    var aabbox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    var w = entity.localAABBoxMax[0] - entity.localAABBoxMin[0];
    var h = entity.localAABBoxMax[1] - entity.localAABBoxMin[1];

    var l = entity.globalAABBoxCollisions.length;

    aabbox.setAttribute('class', 'box ' + ((l === 0) ? '' : 'aabbox-collide'));
    aabbox.setAttribute('transform', 'translate(' + (entity.localAABBoxMin[0]) + ', ' + (entity.localAABBoxMin[1]) + ')');
    aabbox.setAttribute('width', w);
    aabbox.setAttribute('height', h);

    g.appendChild(aabbox);

    entity.nodes.aabbox = aabbox;

    var aabbox_collision_counter = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    var aabbox_collision_counter_text = document.createTextNode(l);
    entity.nodes.aabbox_collision_counter_text = aabbox_collision_counter_text;

    aabbox_collision_counter.appendChild(aabbox_collision_counter_text);

    g.appendChild(aabbox_collision_counter);
};

Rendrerables.prototype.updateAABBoxDOMNodes = function (entity) {
    var aabbox = entity.nodes.aabbox;
    var x = entity.localAABBoxMax[0];
    var y = entity.localAABBoxMax[1];

    var w = entity.localAABBoxMax[0] - entity.localAABBoxMin[0];
    var h = entity.localAABBoxMax[1] - entity.localAABBoxMin[1];

    var l = entity.globalAABBoxCollisions.length;

    aabbox.setAttribute('class', 'box ' + ((l === 0) ? '' : 'aabbox-collide'));
    aabbox.setAttribute('transform', 'translate(' + (entity.localAABBoxMin[0]) + ', ' + (entity.localAABBoxMin[1]) + ')');
    aabbox.setAttribute('width', w);
    aabbox.setAttribute('height', h);

    entity.nodes.aabbox_collision_counter_text.data = l;
};


var rendrerables = new Rendrerables();


var activeKeyboard = {
    timestamp: 0,
    keys: {}
};

var realKeyboard = {
    timestamp: 0,
    keys: {}
};

var activeGamepad = null;

window.addEventListener('blur', function( event ) {
    console.debug('---blur---');
}, false);

window.addEventListener('keydown', function (event) {
    realKeyboard.keys[event.keyIdentifier] = true;
    realKeyboard.timestamp++;
}, false);

window.addEventListener('keyup', function (event) {
    delete realKeyboard.keys[event.keyIdentifier];
    realKeyboard.timestamp++;
}, false);

function updateGamepad() {
    var gamepads = navigator.webkitGetGamepads();
    var i, l;
    for (i = 0, l = gamepads.length; i < l; i++) {
        var gamepad = gamepads[i];
        if (gamepad) {
            if (!activeGamepad) {
                activeGamepad = gamepad;
            }
        }
    }
}

var gamepadLeftJoystick = vec2.create();
var gamepadRightJoystick = vec2.create();
var keyboardArrows = vec2.create();


var xRequestAnimationFrame = (function () {
    return  window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
        window.setTimeout(function () {
            callback(+(new Date()));
        }, 1000 / 60);
    };
})();


/**
 *
 * @type {number} in ms
 */
var lastFrame = 0;

/**
 * @param {number} frame in ms
 */
function updateWorld(frame) {

    updateGamepad();
    activeKeyboard.timestamp = realKeyboard.timestamp;
    activeKeyboard.keys = Object.keys(realKeyboard.keys);


    var a, x = 0, y = 0;

    if (activeGamepad) {
        a = gamepadLeftJoystick;
        x = activeGamepad.axes[0];
        y = activeGamepad.axes[1];

        if (((x > -0.25) && (x < 0.25)) && ((y > -0.25) && (y < 0.25))) {
            x = 0;
            y = 0;
        }

        vec2.set(a, x, y);
        vec2.normalize(a, a);
        vec2.scale(a, a, 1 / 10000)

        a = gamepadRightJoystick;
        x = activeGamepad.axes[2];
        y = activeGamepad.axes[3];

        if (((x > -0.25) && (x < 0.25)) && ((y > -0.25) && (y < 0.25))) {
            x = 0;
            y = 0;
        }

        vec2.set(a, x, y);
        vec2.normalize(a, a);
        vec2.scale(a, a, 1 / 10000)
    }

    if (activeKeyboard) {
        a = keyboardArrows;
        x = 0;
        y = 0;

        if (activeKeyboard.keys.indexOf('Left') !== -1) {
            x += -1;
        }
        if (activeKeyboard.keys.indexOf('Right') !== -1) {
            x += 1;
        }
        if (activeKeyboard.keys.indexOf('Down') !== -1) {
            y += 1;
        }
        if (activeKeyboard.keys.indexOf('Up') !== -1) {
            y += -1;
        }

        vec2.set(a, x, y);
        vec2.normalize(a, a);
        vec2.scale(a, a, 1 / 10000)
    }


    vec2.copy(world.bodies[0].acceleration, gamepadLeftJoystick);
    vec2.copy(world.bodies[1].acceleration, gamepadRightJoystick);
    vec2.copy(world.bodies[2].acceleration, keyboardArrows);

    var elapsed = frame - lastFrame;

    world.update(frame, elapsed);
    rendrerables.updateDOMNodes(frame, elapsed);

    lastFrame = frame;

    xRequestAnimationFrame(updateWorld);
}

xRequestAnimationFrame(function (frame) {
    lastFrame = frame;

    for (var i = 0, l = 100; i < l; i++) {
        var c = new Character();

        vec2.set(c.position, Math.random() * 800, Math.random() * 800);

        vec2.set(c.localAABBoxMax, 10 + (Math.random() * 15), 10 + (Math.random() * 15));
        vec2.set(c.localAABBoxMin, -(10 + (Math.random() * 15)), -(10 + (Math.random() * 15)));
        c.localAABBox_at = frame;

        world.append(c);
        rendrerables.rendrerables.push(c);
    }
    document.body.appendChild(rendrerables.createDOMNodes());

    xRequestAnimationFrame(updateWorld);
});

(function () {
//    window.addEventListener('hashchange', function (event) {
//        console.debug(event);
//    }, false);
    var fragmentParseRE = /^#!((\/[^\/?]+)*)(\?(.*))?$/;

    var matches = fragmentParseRE.exec(window.location.hash);
    if (!matches) {
        return;
    }

    var path = matches[1];
    var query = matches[4];

    console.debug(path, query);

    var socket = eio('ws://localhost');
    console.debug('---eio---');
    socket.onopen = function(){
        console.debug('---o---', socket.id);

        socket.send(JSON.stringify({
            action: 'join',
            parameters: [path]
        }));

        var _webrtc = require('./webrtc.js');
        var peers = _webrtc.createConnections();
        var channels = [];

        peers.onicecandidate = function (event) {
            socket.send(JSON.stringify({
                action: 'rtc-icecandidate',
                parameters: [event.remotePeerId, event.candidate]
            }));
        };

        peers.onoffer = function (event) {
            socket.send(JSON.stringify({
                action: 'rtc-offer',
                parameters: [event.remotePeerId, event.localDescription]
            }));
        };

        peers.onanswer = function (event) {
            socket.send(JSON.stringify({
                action: 'rtc-answer',
                parameters: [event.remotePeerId, event.localDescription]
            }));
        };

        peers.ondatachannel = function (event) {
            onNewDataChannel(event.channel);
        };

        function onNewDataChannel (channel) {
            channel.onopen = function (event) {
                console.debug('---onopen---');
            };
            channel.onclose = function () {
                console.debug('---onclose---');
            };
            channel.onmessage = function () {
                console.debug('---onmessage---');
            };
            channel.onerror = function () {
                console.debug('---onerror---');
            };
        }

        socket.onmessage = function(event){
            var message = JSON.parse(event.data);

            switch (message.action) {
                case 'join':
                    var channel = peers.createDataChannel(message.parameters[0], 'inputs');
                    onNewDataChannel(channel);
                break;

                case 'leave':
                    peers.close(message.parameters[0]);
                    break;

                case 'rtc-icecandidate':
                    peers.nofityIceCandidate.apply(peers, message.parameters);
                break;

                case 'rtc-offer':
                    peers.nofityOffer.apply(peers, message.parameters);
                break;

                case 'rtc-answer':
                    peers.nofityAnswer.apply(peers, message.parameters);
                break;
            }
        };

        socket.onclose = function(){
            console.debug('---c---');
        };
    };


})();