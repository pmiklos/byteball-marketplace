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
            reply("Something went wrong, please try again.");
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

function add(reply, message) {
    let account = message.account;
    let args = message.args;

    if (args.length == 0) {
        account.conversation.push(new model.Conversation({
            action: "add"
        }));
        account.markModified("conversation");
        account.save(function(err) {
            if (err) {
                console.error("[" + account._id + "] Failed to save conversation: " + err);
                reply("Something went wrong, please try again.");
                return;
            }
            reply("Tell me what you are selling in a couple of words or [cancel](command:cancel)");
        });
    }
    else {
        let item = new model.Item({
            account: account._id,
            title: args.join(" ")
        });

        item.save(function(err) {
            if (err) {
                console.error("[" + account._id + "] Failed to create item: " + err);
                reply("Unfortunately, I was unable to store your item. Could you please retry?");
                return;
            }

            console.log("[" + account._id + "] Item saved: " + item);

            account.items.push(item._id);
            account.markModified("items");
            account.save(function(err) {
                if (err) {
                    // TODO try to rollback item somehow
                    console.error("[" + account._id + "] Failed to add item to account: " + err);
                    reply("Unfortunately, I was unable to store your item. Could you please retry?");
                    return;
                }

                reply("Great! You added " + item.title + ". You can provide a more detailed description or [stop](command:stop) here. Note, this item is not yet listed. So, how would you describe this item?");
                // TODO ask for description
            });
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

            account.items.remove(item._id);
            account.markModified("items");

            account.save(function(err) {
                if (err) {
                    console.error("[" + account._id + "] Failed to remove item from account " + args[0] + ": " + err);
                    reply("Unfortunately, I could not remove this item. Maybe try again later. To see your items try [my items](command:my items)");
                    return;
                }
                console.log("[" + account._id + "] Removed " + item);
                reply("Removed " + item.title);
            });

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

            if (item.auction) {
                let minimumPrice = formatAmount(item.auction.minimumAmount, item.auction.displayUnit);
                itemPage += "Minimum price: " + minimumPrice + " [change](command:set minimum price)";
            }
            else {
                itemPage += "[set minimum price](command:set minimum price)"
            }

            reply(itemPage.trim());
        });
}


function setTitle(reply, message) {
    // needs context, the item id
    reply("TODO");
}

function setTitleNoArgs(reply, message) {
    reply("TODO");
}

module.exports.myItems = myItems;
module.exports.add = add;
module.exports.remove = remove;
module.exports.editItem = editItem;
module.exports.setTitle = setTitle;
module.exports.setTitleNoArgs = setTitleNoArgs;
