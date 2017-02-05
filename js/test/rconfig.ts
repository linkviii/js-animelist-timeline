if (typeof define !== 'function') { var define = require('amdefine')(module) }



let requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require
});

let test = requirejs("test");

// requirejs(['test'],
//     function   (test) {
//
//     });