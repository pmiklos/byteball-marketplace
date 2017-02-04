/*jslint node: true */
"use strict";
const model = require('./model.js');

const itemLine = (item) => "[" + item.title + "](command:item " + item._id + ")";

function search(reply, message) {
    let account = message.account;
    let searchPhrase = message.args.join(" ");

    model.Item.find({
            $text: {
                $search: searchPhrase
            }
        })
        .exec(function(err, items) {
            if (err) {
                console.error("[" + account._id + "] Failed to perform search: " + err);
                reply("Unfortunately I could not perform the search. Try again please.");
                return;
            }

            if (items.length > 0) {
                reply(items.map(itemLine).join("\n"));
            }
            else {
                reply("Nothing found, please try another search.")
            }
        });
}

function browseItem(reply, message) {
    let account = message.account;
    let itemId = message.args[0];

    model.Item.findById(itemId, function(err, item) {
        if (err) {
            console.error("[" + account._id + "] Failed to find item by id " + itemId + ": " + err);
            return reply("Unfortunately, That item is not found.");
        }

        let itemPage = item.title + "\n[seller](command:seller " + item.account + ")" + (item.description || "");

        reply(itemPage.trim());
    });

}

function browseSeller(reply, message) {
    let account = message.account;
    let sellerId = message.args[0];

    model.Item.find({
        account: sellerId
    }, function(err, items) {
        if (err) {
            console.error("[" + account._id + "] Failed to find items of seller " + sellerId + ": " + err);
            return reply("Unfortunately, That seller is not found.");
        }

        reply(items.map(itemLine).join("\n"));
    });
}

module.exports.search = search;
module.exports.browseItem = browseItem;
module.exports.browseSeller = browseSeller;
