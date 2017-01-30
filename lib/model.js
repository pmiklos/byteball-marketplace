/*jslint node: true */
"use strict";

var mongoose = require("mongoose");

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;


var ItemSchema = new Schema({
    account     : ObjectId,
    title       : String,
    description : String
});
ItemSchema.index({ title: "text", description: "text"});

var ConversationSchema = new Schema({
    action      : String,
    context     : Schema.Types.Mixed
});

var AccountSchema = new Schema({
    device      : String,
    items       : [ ObjectId ],
    conversation: [ ConversationSchema ]
});


function connect(onDone) {
    
    mongoose.connect("mongodb://" + process.env.IP + "/test");

    var db = mongoose.connection;

    db.on("error", console.error.bind(console, "connection error:"));
    db.once("open", function() {
        if (onDone) {
            onDone();
        }
    });

}

exports.connect = connect;
exports.Account = mongoose.model("Account", AccountSchema);
exports.Conversation = mongoose.model("Conversation", ConversationSchema);
exports.Item = mongoose.model("Item", ItemSchema);