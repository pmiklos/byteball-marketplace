/*jslint node: true */
"use strict";

class Chat {
    
    constructor(handlers) {
        this.handlers = handlers;
    }

    // TODO replace command with a matcher
    when(command, handler) {
        this.handlers[command] = handler;
    }

    match(message, callback) {
        if (this.handlers[message.command]) {
            callback(null, this.handlers[message.command]);
        } else {
            callback(null, this.handlers["nomatch"]);
        }
    }
    
    receive(message, respond) {
        this.match(message, function(err, handler) {
            if (err) return console.error(err);
            handler(respond, message);
        });
    }

}

const chat = new Chat([]);

module.exports = chat;