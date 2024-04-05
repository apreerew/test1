// dbg.js
// This debug command is used to show or hide debug messages globally

var config = require('./config.js');

var dbg = function (strMessage,iDebugLevel) {

    //debug zero  (0) - show always
    //debug one   (1) - error messages
    //debug two   (2) - return values
    //debug three (3) - milestone messages
    //debug four  (4) - verbose debug

    //if no level is passed, then we are building the section and it should show
    if (iDebugLevel === null || iDebugLevel === undefined) {
        iDebugLevel = -1;
    }

    if (iDebugLevel <= config.debug) {

        console.log("dbg: " + strMessage);
    }
}

// Used to write to the console
module.exports = dbg;