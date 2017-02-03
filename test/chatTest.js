/*jslint node: true */
"use strict";

const assert = require('assert');
const chat = require("../lib/chat.js");

chat.when(/say (.*)/, function(reply, message) {
    reply(message.args[0]);
});

chat.nomatch(function(reply, message) {
    reply("no match found");
});


chat.receive({
    text: "say test"
}, function(response) {
    assert.equal(response, "test");
});

chat.receive({
    text: "blabla"
}, function(response) {
    assert.equal(response, "no match found");
});

process.exit(0);
