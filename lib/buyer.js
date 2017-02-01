/*jslint node: true */
"use strict";
const model = require('./model.js');


function search(reply, message) {
    let account = message.account;
    let searchPhrase = message.args.join(" ");
    
    model.Item.find({$text: { $search: searchPhrase } })
        .exec(function(err, items) {
            if (err) {
                console.error("[" + account._id +"] Failed to perform search: " + err);
                reply("Unfortunately I could not perform the search. Try again please.");
                return;
            }
            
            var itemLine = (item) => "[" + item.title + "](command:item " + item._id + ")"; 
            
            reply(items.map(itemLine).join("\n"));
        }); 
}

module.exports.search = search;