/*jslint node: true */
"use strict";

const assert = require('assert');
const chat = require("../lib/chat.js");

chat.when('test', function(reply, message) {
    reply("echo: " + message.command);
});

chat.when('nomatch', function(reply, message) {
    reply("no match found");
});


chat.receive({command:"test"}, function(text) {
    assert.equal(text, "echo: test");
});

chat.receive({command:"blabla"}, function(text) {
    assert.equal(text, "no match found");
});

process.exit(0);