/*jslint node: true */
"use strict";
const model = require('./model.js');

function myItems(reply, message) {
    let account = message.account;

    model.Item.find({
        account: account._id
    }, function(err, items) {
        if (err) {
            console.error("[" + account._id + "] Failed find items: " + err);
            reply("Something went wrong, please try again!");
            return;
        }

        if (items != null && items.length > 0) {
            let myitems = items.map((item) =>
                " - " + item.title + " ([remove](command:remove " + item._id + "), [edit](command:edit " + item._id + "))"
            );

            reply(myitems.join("\n") + "\n[add](command:add)");
        }
        else {
            reply("You have no items yet, but you can easily [add](command:add) one.");
        }
    });

}

// TODO split to "add" and "addNoArgs" versions
function add(reply, message) {
    let account = message.account;
    let args = message.args;

    if (args.length == 0) {
        account.pushConversation(new model.Conversation({
            command: "add"
        }), function(err) {
            if (err) {
                return reply("Something went wrong, please try again!");
            }
            reply("Tell me what you are selling in a couple of words or [cancel](command:cancel)");
        });
    }
    else {
        let title = args.join(" ");

        if (!title || title.toLowerCase() == "cancel") {
            return reply("Ok, cancelled");
        }

        let item = new model.Item({
            account: account._id,
            title: title,
            auction: new model.Auction({})
        });

        item.save(function(err) {
            if (err) {
                console.error("[" + account._id + "] Failed to create item: " + err);
                return reply("Unfortunately, I was unable to store your item. Could you please try again?");
            }

            console.log("[" + account._id + "] Item saved: " + item);

            reply("Great! You added '" + item.title + "'. Now go ahead and add edit your item!");

            editItem(reply, {
                account: account,
                args: [item._id]
            })
        });
    }
}

function remove(reply, message) {
    let account = message.account;
    let args = message.args;

    if (args.length > 0) {
        model.Item.findByIdAndRemove(args[0], function(err, item) {
            if (err) {
                console.error("[" + account._id + "] Failed to remove item " + args[0] + ": " + err);
                reply("Unfortunately, I could not remove this item. Maybe try again later. To see your items try [my items](command:my items)");
                return;
            }

            console.log("[" + account._id + "] Removed " + item);
            reply("Removed " + item.title);
        });

    }
    else {
        // TOOD implement asking for a item to remove
        reply("Nothing has been removed. Try [my items](command:my items)");
    }

}

function formatAmount(amount, unit) {
    if (unit) {
        // TODO implement unit conversion
    }

    return amount + " bytes";
}

function editItem(reply, message) {
    let account = message.account;
    let itemId = message.args[0];

    model.Item.findById(itemId)
        .where("account").equals(account._id)
        .exec(function(err, item) {
            if (err) {
                console.error("[" + account._id + "] Failed to find item by id " + itemId + ": " + err);
                return reply("Unfortunately, That item is not found.");
            }

            if (!item) {
                return reply("Unfortunately, That item is not found.");
            }

            let itemPage = item.title + " [change](command:set title)\n";
            if (item.description) {
                itemPage += item.description + " [change](command:set description)\n";
            }
            else {
                itemPage += "No description yet [set description](command:set description)\n";
            }

            if (item.auction && item.auction.minimumAmount) {
                let minimumPrice = formatAmount(item.auction.minimumAmount, item.auction.displayUnit);
                itemPage += "Minimum price: " + minimumPrice + " [change](command:set minimum price)";
            }
            else {
                itemPage += "No minimum price yet [set minimum price](command:set minimum price)";
            }

            if (item.auction.bids.length > 0) {
                itemPage += "\nBids:\n";
                itemPage += item.auction.bids.map((bid) => " - " + formatAmount(bid.amount, "bytes") + " [accept](command:accept " + bid._id + " )").join("\n");
            }

            account.pushConversation(new model.Conversation({
                context: {
                    itemId: item._id
                }
            }), function(err) {
                if (err) return reply("Something went wrong, please try again!");
                reply(itemPage.trim());
            });
        });
}

// TODO sanitize input
function setTitle(reply, message) {
    let account = message.account;

    if (message.context && message.context.itemId) {
        let itemId = message.context.itemId;

        model.Item.findByIdAndUpdate(itemId, {
                $set: {
                    title: message.args[0]
                }
            },
            function(err, item) {
                if (err) {
                    console.error("[" + account._id + "] Failed to update item " + itemId + ": " + err);
                    return reply("Something went wrong, please try again!");
                }

                reply("Done. The title is now '" + message.args[0] + "'");

                editItem(reply, {
                    account: account,
                    args: [itemId]
                });
            });
    }
    else {
        reply("Not sure which item you mean. Could you please select it again? Try [my items](command:my items)");
    }
}

function setTitleNoArgs(reply, message) {
    let account = message.account;

    if (message.context && message.context.itemId) {
        account.pushConversation(new model.Conversation({
            command: "set title",
            context: message.context
        }), function(err) {
            if (err) return reply("Something went wrong, please try again!");
            reply("Ok, please tell the new title!");
        });
    }
    else {
        reply("Not sure which item you mean. Could you please select it again? Try [my items](command:my items)");
    }
}

// TODO sanitize input
function setDescription(reply, message) {
    let account = message.account;

    if (message.context && message.context.itemId) {
        let itemId = message.context.itemId;

        model.Item.findByIdAndUpdate(itemId, {
                $set: {
                    description: message.args[0]
                }
            },
            function(err, item) {
                if (err) {
                    console.error("[" + account._id + "] Failed to update item " + itemId + ": " + err);
                    return reply("Something went wrong, please try again!");
                }

                reply("Done. The description is now '" + message.args[0] + "'");

                editItem(reply, {
                    account: account,
                    args: [itemId]
                });
            });
    }
    else {
        reply("Not sure which item you mean. Could you please select it again? Try [my items](command:my items)");
    }
}

function setDescriptionNoArgs(reply, message) {
    let account = message.account;

    if (message.context && message.context.itemId) {
        account.pushConversation(new model.Conversation({
            command: "set description",
            context: message.context
        }), function(err) {
            if (err) return reply("Something went wrong, please try again!");
            reply("Ok, please tell the new description!");
        });
    }
    else {
        reply("Not sure which item you mean. Could you please select it again? Try [my items](command:my items)");
    }
}

function setMinimumPriceNoArgs(reply, message) {
    let account = message.account;

    if (message.context && message.context.itemId) {
        let itemId = message.context.itemId;

        model.Item.findById(itemId, function(err, item) {
            if (err) {
                reply("Something went wrong, please try again!");
                return console.error("Failed to find item " + itemId + ": " + err);
            }

            if (item) {
                account.pushConversation(new model.Conversation({
                    command: "set minimum price",
                    context: {
                        itemId: itemId
                    }
                }), function(err) {
                    if (err) {
                        reply("Something went wrong, please try again!");
                        return console.error(err);
                    }

                    reply("Ok, what is your minimum price for " + item.title + "?");
                });
            }
            else {
                reply("I don't know for which item you want to set a price for. Try [my items](command:my items) first.");
            }
        });
    }
    else {
        reply("I don't know for which item you want to set a price for. Try [my items](command:my items) first.");
    }
}

function setMinimumPrice(reply, message) {
    let account = message.account;
    let minimumBytes = message.args[0];

    if (message.context && message.context.itemId) {
        let itemId = message.context.itemId;

        model.Item.findByIdAndUpdate(itemId, {
            "auction.minimumAmount": minimumBytes,
            "auction.startDate": Date.now() // TODO should update at the first time only
        }, function(err, item) {
            if (err) {
                console.error("[" + account._id + "] Failed to update minimum price for item " + itemId + ": " + err);
                return reply("Something went wrong, please try again!");
            }

            if (item) {
                reply("Minimum price is now " + minimumBytes);
                editItem(reply, {
                    account: account,
                    args: [itemId]
                });
            }
            else {
                reply("Not sure which item you mean. Could you please select it again? Try [my items](command:my items)");
            }
        });
    }
    else {
        reply("Not sure which item you mean. Could you please select it again? Try [my items](command:my items)");
    }

}

module.exports.myItems = myItems;
module.exports.add = add;
module.exports.remove = remove;
module.exports.editItem = editItem;
module.exports.setTitle = setTitle;
module.exports.setTitleNoArgs = setTitleNoArgs;
module.exports.setDescription = setDescription;
module.exports.setDescriptionNoArgs = setDescriptionNoArgs;
module.exports.setMinimumPrice = setMinimumPrice;
module.exports.setMinimumPriceNoArgs = setMinimumPriceNoArgs;
