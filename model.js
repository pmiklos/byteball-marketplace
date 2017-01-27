/*jslint node: true */
"use strict";

var mongoose = require("mongoose");

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
 
var AccountSchema = new Schema({
    id      : ObjectId,
    device  : String
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
