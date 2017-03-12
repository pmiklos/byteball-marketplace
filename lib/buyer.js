/*jslint node: true */
"use strict";
const model = require('./model.js');

const itemLine = (item) => " - [" + item.title + "](command:item " + item._id + ")";


function searchNoArgs(reply, message) {
    let account = message.account;

    account.pushConversation(new model.Conversation({
        command: "search"
    }), function(err) {
        if (err) {
            console.error(err);
            return reply("Something went wrong, please try again!");
        }

        reply("Ok, what are you looking for?");
    });
}

function search(reply, message) {
    let account = message.account;
    let searchPhrase = message.args.join(" ");

    model.Item.find({
            $text: {
                $search: searchPhrase
            },
            "auction.startDate": {
                $lt: Date.now()
            },
            "auction.endDate": {
                $exists: false
            }
        })
        .exec(function(err, items) {
            if (err) {
                console.error("[" + account._id + "] Failed to perform search: " + err);
                reply("Unfortunately I could not perform the search. Try again please.");
                return;
            }

            if (items.length > 0) {
                reply("Here is what I found:\n" + items.map(itemLine).join("\n"));
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
            "\nGo to [seller](command:seller)";

        if (item.auction.isEnded) {
            if (account._id.equals(item.auction.winner)) {
                itemPage += "\n You won the auction. [Show contract](command:show contract)";
            }
            else {
                itemPage += "\n The auction has ended.";
            }
        }
        else {
            let mybid = item.auction.bids.find((bid) => bid.bidder.equals(account._id));

            if (mybid) {
                itemPage += " or [remove bid](command:remove bid) (" + mybid.amount + " bytes)";
            }
            else {
                itemPage += " or place your [bid](command:bid)";
            }
        }

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
    if (!message.context || !message.context.sellerId) {
        return reply("First try to [search](command:search) for an item or use [my bids](command:my bids) then you can navigate to the seller from there.");
    }

    let account = message.account;
    let sellerId = message.context.sellerId; // TODO check if sellerId exists

    model.Item.find({
        account: sellerId
    }, function(err, items) {
        if (err) {
            console.error("[" + account._id + "] Failed to find items of seller " + sellerId + ": " + err);
            return reply("Unfortunately, That seller is not found.");
        }

        let itemList = items.map(itemLine).join("\n");
        reply("Open auctions of this seller:\n" + itemList);
    });
}

function bidNoArgs(reply, message) {
    if (!message.context) {
        return reply("First try to [search](command:search) for an item on which you placed a bid.");
    }

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
    if (!message.context) {
        return reply("First try to [search](command:search) for an item on which you placed a bid.");
    }

    let account = message.account;
    let itemId = message.context.itemId;
    let amount = message.args[0];

    model.Item.findById(itemId, function(err, item) {
        if (err) {
            reply("Something went wrong, please try again!");
            return console.error("Failed to find item " + itemId + ": " + err);
        }

        if (item) {
            if (item.auction.isEnded) {
                reply("The auction has ended for [" + item.title + "](item " + itemId + ")");
            }
            else {
                let bid = new model.Bid({
                    amount: amount,
                    bidder: account._id
                });
                item.auction.bids.push(bid);
                item.markModified("auction.bids");
                item.save(function(err) {
                    if (err) {
                        reply("Something went wrong, please try again!");
                        return console.error("Failed to save new bid to item " + itemId + ": " + err);
                    }

                    reply("Your bid " + amount + " bytes has been placed for " + item.title);

                    browseItem(reply, {
                        account: account,
                        args: [itemId]
                    });
                });
            }
        }
        else {
            reply("The item does not exists. Please try to [search](command:search) again!");
        }
    });
}

function myBids(reply, message) {
    let account = message.account;

    model.Item.find({
        "auction.bids.bidder": account._id
    }, function(err, items) {
        if (err) {
            reply("Something went wrong, please try again!");
            return console.error("Failed to find bids for " + account._id + ": " + err);
        }

        if (items && items.length > 0) {
            let wonOrLost = (item) => {
                if (item.auction.winner) {
                    return account._id.equals(item.auction.winner) ? "won" : "lost"
                }
                else {
                    return "";
                }
            };
            let itemList = items.map((item) => " - [" + item.title + "](command:item " + item._id + ") (" + wonOrLost(item) + ")").join("\n");
            reply("Items you placed a bid for:\n" + itemList);
        }
        else {
            reply("You have no bids at the moment.");
        }
    });
}

function removeBid(reply, message) {
    if (!message.context) {
        return reply("First try to [search](command:search) for an item on which you placed a bid.");
    }

    let account = message.account;
    let itemId = message.context.itemId;

    model.Item.findById(itemId, function(err, item) {
        if (err) {
            reply("Something went wrong, please try again!");
            return console.error("Failed to find item " + itemId + ": " + err);
        }

        if (item) {
            if (item.auction.isEnded) {
                reply("The auction has ended for [" + item.title + "](item " + itemId + ")");
            }
            else {
                let mybid = item.auction.bids.find((bid) => bid.bidder.equals(account._id));

                if (mybid) {
                    item.auction.bids.pop(mybid);
                    item.markModified("auction.bids");
                    item.save(function(err) {
                        if (err) {
                            reply("Something went wrong, please go to [" + item.title + "](command:item " + itemId + ") and try again.");
                            return console.error("Failed to remove bidder " + account._id + " from item " + itemId + ": " + err);
                        }

                        reply("Your bid was removed from " + item.title);

                        browseItem(reply, {
                            account: account,
                            args: [itemId]
                        });
                    });
                }
                else {
                    reply("It appears that you haven't yet made a bid on [" + item.title + "](command:item " + itemId + ")");
                }
            }
        }
        else {
            reply("Something went wrong. Please try to search for the item again to remove your bid.");
            console.error("Failed to remove bid. Item not found: " + itemId);
        }
    });
}

function findContractByItemId(accountId, itemId, callback) {
    model.Item.findById(itemId)
        .where("auction.winner").equals(accountId)
        .exec(function(err, item) {
            if (err) {
                console.error("Failed to find contract for item " + itemId + ": " + err);
                return callback(err);
            }

            if (item) {
                let mybid = item.auction.bids.find((bid) => bid.bidder.equals(item.auction.winner));

                if (mybid && mybid.contract) {
                    return callback(null, mybid.contract, item);
                }
            }

            return callback();
        });
}

function showContract(reply, message) {
    if (!message.context) {
        return reply("First try [my bids](command:my bids) and choose an item.");
    }

    let account = message.account;
    let itemId = message.context.itemId;

    findContractByItemId(account._id, itemId, function(err, contract) {
        if (err) return reply("Something went wrong, please try again!");

        account.pushConversation(new model.Conversation({
            context: {
                itemId: itemId
            }
        }), function(err) {
            if (err) return reply("Something went wrong, please try again!");

            if (contract) {
                switch (contract.status) {
                    case 'DRAFT':
                        reply(contract.draft);
                        break;
                    case 'COMPLETED':
                        reply(contract.completed);
                        break;
                    default:
                        reply("Hmm. Your contract is in an unkown state. Contact support.");
                        // code
                }
            }
            else {
                reply("No contracts found. Try [my bids](command:my bids)");
            }
        });
    });

}

function setShippingAddressNoArgs(reply, message) {
    if (!message.context || !message.context.itemId) {
        return reply("First try [my bids](command:my bids) and choose an item.");
    }

    let account = message.account;
    let itemId = message.context.itemId;

    account.pushConversation(new model.Conversation({
        command: "set shipping address",
        context: {
            itemId: itemId
        }
    }), function(err) {
        if (err) return reply("Something went wrong and I forgot what we were talking about. Try [my bids](command:my bids) again.");

        reply("Please enter the shipping address below, including the name of the addresse.");
    });
}

function setShippingAddress(reply, message) {
    if (!message.context) {
        return reply("First try [my bids](command:my bids) and choose an item.");
    }

    let account = message.account;
    let itemId = message.context.itemId;
    let shippingAddress = message.args[0];

    findContractByItemId(account._id, itemId, function(err, contract, item) {
        if (err) reply("Something went wrong, please try again!");

        contract.shippingAddress = shippingAddress;
        contract.status = "COMPLETED";

        item.markModified("auction.bids");
        item.save(function(err) {
            if (err) {
                reply("Failed to save shipphing address. Please try again!");
                return console.error("Failed to save shipping address for item " + itemId + ": " + err);
            }

            account.pushConversation(new model.Conversation({
                context: {
                    itemId: itemId
                }
            }), function(err) {
                if (err) {
                    return reply("Shipping address is saved, but the conversation is lost. Try [my bids](command:my bids) again.");
                }

                reply("Ok, [contract](command:show contract) is now complete, shipping address is set to '" + shippingAddress + "'. Now please wait for the seller to send you a payment request. " +
                    "You can still change the address by [set shipping address](command:set shipping address)");
            });
        });
    });

}

module.exports.search = search;
module.exports.searchNoArgs = searchNoArgs;
module.exports.browseItem = browseItem;
module.exports.browseSeller = browseSeller;
module.exports.browseSellerNoArgs = browseSellerNoArgs;
module.exports.bid = bid;
module.exports.bidNoArgs = bidNoArgs;
module.exports.removeBid = removeBid;
module.exports.myBids = myBids;
module.exports.showContract = showContract;
module.exports.setShippingAddress = setShippingAddress;
module.exports.setShippingAddressNoArgs = setShippingAddressNoArgs;
