if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
var requirejs = require("requirejs");
requirejs.config({
    nodeRequire: require
});
var test = requirejs("test");
// requirejs(['test'],
//     function   (test) {
//
//     }); 
