/*jslint node: true */
"use strict";

class Chat {

    constructor(handlers) {
        this.handlers = handlers;
        this.otherwiseHandler = (text) => console.err("Unmatched message: " + text);
    }

    when(pattern, handler) {
        this.handlers.push({
            pattern: pattern,
            handler: handler
        });
    }

    match(message, callback) {
        let handler = this.handlers.find((handler) => handler.pattern.test(message.text));

        if (handler) {
            let matches = message.text.match(handler.pattern);
            let args = matches.slice(1, matches.length);
            callback(null, handler.handler, args);
        }
        else {
            callback(null, this.otherwiseHandler);
        }
    }

    receive(message, respond) {
        this.match(message, function(err, handler, args) {
            if (err) return console.error(err);
            message.args = args;
            handler(respond, message);
        });
    }

    otherwise(handler) {
        this.otherwiseHandler = handler;
    }
}

module.exports = Chat;
