var _glMatrix = require('./gl-matrix.js');

var mat2d = _glMatrix.mat2d;
var vec2 = _glMatrix.vec2;


var Word = function () {
    this.bodies = [];

    this.modifiedBodies = [];

    this.sawpBodies = [];
};

Word.prototype.append = function (body) {
    this.bodies.push(body);
};

Word.prototype.remove = function (body) {
};

Word.prototype.updateBody = function (body, frame, elapsed) { // in ms
    body.positioned_at = frame;

    vec2.scaleAndAdd(body.velocity, body.velocity, body.acceleration, elapsed);
    vec2.scaleAndAdd(body.position, body.position, body.velocity, elapsed);

    var m = body.localMatrix;

    mat2d.identity(m);
    mat2d.rotate(m, m, body.orientation * 0.0174532925);
    mat2d.translate(m, m, body.position);
};

Word.prototype.updateGlobalAABBox = function (body, frame, elapsed) {
    body.globalAABBox_at = frame;
    vec2.add(body.globalAABBoxMax, body.position, body.localAABBoxMax);
    vec2.add(body.globalAABBoxMin, body.position, body.localAABBoxMin);
};

Word.prototype.testAABBoxCollision = function (a, b) {
    return  !((a.globalAABBoxMax[0] < b.globalAABBoxMin[0]) ||
        (a.globalAABBoxMax[1] < b.globalAABBoxMin[1]) ||
        (a.globalAABBoxMin[0] > b.globalAABBoxMax[0]) ||
        (a.globalAABBoxMin[1] > b.globalAABBoxMax[1]));
};


Word.prototype.updateAABBoxCollision = function (frame, a, b) {
    if (a === b) {
        return
    }

    if (!this.testAABBoxCollision(a, b)) {
        return;
    }

    if (a.globalAABBoxCollisions.indexOf(b) === -1) {
        this.onBeginContact(frame, a, b);
        a.globalAABBoxCollisions.push(b);
    }

    if (b.globalAABBoxCollisions.indexOf(a) === -1) {
        b.globalAABBox_at = frame;
        b.globalAABBoxCollisions.push(a);
    }
};

Word.prototype.onBeginContact = function (frame, a, b) {
    /*
     console.debug('++++++');



     vec2.set(a.velocity, 0, 0);
     vec2.set(a.acceleration, 0, 0);

     vec2.set(b.velocity, 0, 0);
     vec2.set(b.acceleration, 0, 0);
     */
};

Word.prototype.onEndContact = function (frame, a, b) {
    /*
     console.debug('------');
     */
};

Word.prototype.update = function (frame, elapsed) { // in ms
    var bodies = this.bodies;

    bodies.forEach(function (body) {
        if ((body.positioned_at === null) || (vec2.squaredLength(body.velocity) !== 0) || (vec2.squaredLength(body.acceleration) !== 0)) {
            this.updateBody(body, frame, elapsed);

        }
        if ((body.globalAABBox_at === null) || (body.positioned_at > body.globalAABBox_at)) {
            this.updateGlobalAABBox(body, frame, elapsed);

            this.modifiedBodies.push(body);
        }
    }, this);


    var i, a, b, l = bodies.length;
    while (this.modifiedBodies.length) {
        a = this.modifiedBodies.shift();

        a.globalAABBox_at = frame;

        while (a.globalAABBoxCollisions.length) {
            b = a.globalAABBoxCollisions.pop();
            if (this.testAABBoxCollision(a, b)) {
                this.sawpBodies.push(b);
            } else {
                b.globalAABBoxCollisions.splice(b.globalAABBoxCollisions.indexOf(a), 1);
                b.globalAABBox_at = frame;

                this.onEndContact(frame, a, b);
            }
        }

        while (this.sawpBodies.length) {
            b = this.sawpBodies.pop();
            a.globalAABBoxCollisions.push(b);
        }

        for (i = 0; i < l; i++) {
            this.updateAABBoxCollision(frame, a, bodies[i]);
        }
    }

};

module.exports = {
    createWorld: function () {
        return new Word();
    }
};

