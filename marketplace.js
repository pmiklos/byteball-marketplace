/*jslint node: true */
"use strict";
const device = require('byteballcore/device.js');
const eventBus = require('byteballcore/event_bus.js');
const model = require('./lib/model.js');
const Chat = require('./lib/chat.js');
const seller = require('./lib/seller.js');
const buyer = require('./lib/buyer.js');
const headlessWallet = require('headless-byteball');
require('byteballcore/wallet.js');

var wallet;

function handleNoWallet(from_address) {
	device.sendMessageToDevice(from_address, 'text', "The shop is not set up yet, try again later");
}

model.connect(function() {
	console.log("connected to mongodb");
});

process.on('SIGINT', function() {
	model.connection.close(function() {
		console.log('Mongoose default connection disconnected through app termination');
		process.exit(0);
	});
});

eventBus.once('headless_wallet_ready', function() {
	headlessWallet.setupChatEventHandlers();
	headlessWallet.readSingleWallet(function(_wallet) {
		wallet = _wallet;
	});
});

eventBus.on('paired', function(from_address) {
	if (!wallet)
		return handleNoWallet(from_address);

	model.Account.find({
		device: from_address
	}, function(error, accounts) {
		if (accounts.length == 0) {
			device.sendMessageToDevice(from_address, 'text', "Hi! Welcome to the Marketplace. Type [help](command:help) for available commands.");
			var account = new model.Account({
				device: from_address
			});
			account.save(function(err, account) {
				if (err) return console.error(err);
			});
		}
		else {
			device.sendMessageToDevice(from_address, 'text', "Hi! Welcome back! Type [help](command:help) for available commands.");
		}
	});
});

const usage = `Use the commands below to get started:
[add](command:add) - add an item to sell. You can also add a short title eg: [add Some Really Cool Thing](command:add Some Really Cool Thing)
[my bids](command:my bids) - list the items you placed a bid for
[my items](command:my items) - lists the your items on sale
[search](command:search) - search for items on sale
`;

const chat = new Chat([]);

chat.when(/^my items$/, seller.myItems);
chat.when(/^add$/, seller.add);
chat.when(/^add (.*)$/, seller.add);
chat.when(/^remove ([0-9a-f]+)$/, seller.remove);
chat.when(/^edit ([0-9a-f]+)$/, seller.editItem);
chat.when(/^set title$/, seller.setTitleNoArgs);
chat.when(/^set title (.*)$/, seller.setTitle);
chat.when(/^set description$/, seller.setDescriptionNoArgs);
chat.when(/^set description (.*)$/, seller.setDescription);
chat.when(/^set minimum price$/, seller.setMinimumPriceNoArgs);
chat.when(/^set minimum price (.*)$/, seller.setMinimumPrice);
chat.when(/^accept ([0-9a-f]+)$/, seller.accept);
chat.when(/^request payment$/, seller.requestPaymentNoArgs);
chat.when(/^request payment ([0-9A-Z]{32})$/, seller.requestPayment);
chat.when(/^set tracking for ([0-9a-f]+)$/, (reply, message) => {
	reply("TODO");
});
chat.when(/^search$/, buyer.searchNoArgs);
chat.when(/^search (.*)$/, buyer.search);
chat.when(/^item ([0-9a-f]+)$/, buyer.browseItem);
chat.when(/^seller$/, buyer.browseSellerNoArgs);
chat.when(/^seller ([0-9a-f]+)$/, buyer.browseSeller);
chat.when(/^bid$/, buyer.bidNoArgs);
chat.when(/^bid ([0-9]+)$/, buyer.bid);
chat.when(/^remove bid$/, buyer.removeBid);
chat.when(/^my bids$/, buyer.myBids);
chat.when(/^show contract$/, buyer.showContract);
chat.when(/^set shipping address$/, buyer.setShippingAddressNoArgs);
chat.when(/^set shipping address (.*)$/, buyer.setShippingAddress);
chat.when(/^set refund address ([0-9A-Z]{32})/, buyer.setRefundAddress);

chat.when(/^help$/, function(reply, message) {
	reply(usage);
});

chat.nomatch(function(reply, message) {
	reply("Not sure how to help with that. Try [help](command:help) for available commands.");
});

eventBus.on("text", function(from_address, text) {
	if (!wallet) return handleNoWallet(from_address);

	model.Account.findOne({
		"device": from_address
	}, function(err, account) {
		if (err) {
			console.error("Failed to access account: " + err);
			device.sendMessageToDevice(from_address, "text", "Your account cannot be accessed currently, please try again later.");
			return;
		}

		if (account == null) {
			console.error("Account not found for device: " + from_address);
			device.sendMessageToDevice(from_address, "text", "Account does not exist for this device. Pair your device to create one");
			return;
		}

		console.log("[" + account._id + "] Text received: '" + text + "'");

		if (Array.isArray(account.conversation) && account.conversation.length > 0) {
			let nextStep = account.conversation.pop();
			nextStep.remove(); // TODO I think it is unnecessary
			account.markModified("conversation");

			account.save(function(err) {
				if (err) {
					console.error("[" + account._id + "] Failed to resume conversation: " + err);
					device.sendMessageToDevice(from_address, "text", "Something went wrong, please try again.");
					return;
				}

				let message;
				if (nextStep.command) {
					message = {
						text: nextStep.command + " " + text.trim(),
						account: account,
						wallet: wallet,
						context: nextStep.context
					};
				}
				else {
					message = {
						text: text.trim(),
						account: account,
						wallet: wallet,
						context: nextStep.context
					};
				}

				chat.receive(message, function(response) {
					device.sendMessageToDevice(from_address, "text", response);
				});
			});
		}
		else {
			let message = {
				text: text.trim(),
				account: account,
				wallet: wallet
			};

			chat.receive(message, function(response) {
				device.sendMessageToDevice(from_address, "text", response);
			});
		}

	});

});
