var _glMatrix = require('./gl-matrix.js');

var mat2d = _glMatrix.mat2d;
var vec2 = _glMatrix.vec2;

var _physics = require('./physics.js');

var interval = null;
var lastFrame;

var world = _physics.createWorld();

/**
 *
 * @param {Number} t in ms
 */
function updateWorld (t) {
    world.update(t);
}

function playAction () {
    lastFrame = +(new Date());

    interval = this.setInterval(function () {
        var frame = +(new Date());

        updateWorld(frame - lastFrame);

        lastFrame = frame;
    }, 8);

}

function createBodyAction (eid, x, y) {
    var body = world.createBody(eid);

    vec2.set(body.position, x, y);
}

function inputAction(a0, a1) {
    vec2.copy(world.bodies[0].acceleration, a0);
    vec2.copy(world.bodies[1].acceleration, a1);

    sendBodies();
}


function sendBodies() {
    postMessage({
        action: 'update',
        parameters: world.bodies
    });
}

function pauseAction () {
    this.clearInterval(interval);
}

addEventListener('message', function (event) {
    switch (event.data.action) {
        case 'play':
            playAction();
            break;
        case 'input':
            inputAction.apply(event, event.data.parameters);
            break;
        case 'pause':
            pauseAction();
            break;
        case 'create-body':
            createBodyAction.apply(event, event.data.parameters);
            break;
    }
}, false);