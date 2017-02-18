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

        let itemPage = item.title + "\n" + (item.description || "") +
            "\nGo to [seller](command:seller)" +
            " or place your [bid](command:bid)";

        account.pushConversation(new model.Conversation({
            context: {
                sellerId: item.account,
                itemId: item._id
            }
        }), function(err) {
            if (err) return reply("Something went wrong, please try again!");
            reply(itemPage.trim());
        });

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

function browseSellerNoArgs(reply, message) {
    let account = message.account;
    let sellerId = message.context.sellerId; // TODO check if sellerId exists

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

function bidNoArgs(reply, message) {
    let account = message.account;
    let itemId = message.context.itemId;

    account.pushConversation(new model.Conversation({
        command: "bid",
        context: {
            itemId: itemId
        }
    }), function(err) {
        if (err) return reply("Something went wrong, please try again!");
        reply("How much do you bid in bytes?");
    });
}

function bid(reply, message) {
    let account = message.account;
    let itemId = message.context.itemId;
    let bid = message.args[0];

    reply("Your bid " + bid + " has been placed for item " + itemId);
}

module.exports.search = search;
module.exports.browseItem = browseItem;
module.exports.browseSeller = browseSeller;
module.exports.browseSellerNoArgs = browseSellerNoArgs;
module.exports.bid = bid;
module.exports.bidNoArgs = bidNoArgs;
