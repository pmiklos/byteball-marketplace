/*jslint node: true */
"use strict";
var conf = require('byteballcore/conf.js');
var device = require('byteballcore/device.js');
var walletDefinedByKeys = require('byteballcore/wallet_defined_by_keys.js');
var util = require('util');
var crypto = require('crypto');
var fs = require('fs');
var db = require('byteballcore/db.js');
var eventBus = require('byteballcore/event_bus.js');
var desktopApp = require('byteballcore/desktop_app.js');
var model = require('./model.js');
require('byteballcore/wallet.js'); // we don't need any of its functions but it listens for hub/* messages

var appDataDir = desktopApp.getAppDataDir();
var KEYS_FILENAME = appDataDir + '/' + conf.KEYS_FILENAME;

var wallet;


function readKeys(onDone){
	fs.readFile(KEYS_FILENAME, 'utf8', function(err, data){
		if (err){
			console.log('failed to read keys, will gen');
			var devicePrivKey = crypto.randomBytes(32);
			var deviceTempPrivKey = crypto.randomBytes(32);
			var devicePrevTempPrivKey = crypto.randomBytes(32);
			writeKeys(devicePrivKey, deviceTempPrivKey, devicePrevTempPrivKey, function(){
				onDone(devicePrivKey, deviceTempPrivKey, devicePrevTempPrivKey);
			});
			return;
		}
		var keys = JSON.parse(data);
		onDone(Buffer(keys.permanent_priv_key, 'base64'), Buffer(keys.temp_priv_key, 'base64'), Buffer(keys.prev_temp_priv_key, 'base64'));
	});
}

function writeKeys(devicePrivKey, deviceTempPrivKey, devicePrevTempPrivKey, onDone){
	var keys = {
		permanent_priv_key: devicePrivKey.toString('base64'),
		temp_priv_key: deviceTempPrivKey.toString('base64'),
		prev_temp_priv_key: devicePrevTempPrivKey.toString('base64')
	};
	
	console.log("Writing keys to " + KEYS_FILENAME);
	
	fs.writeFile(KEYS_FILENAME, JSON.stringify(keys), 'utf8', function(err){
		if (err)
			throw Error("failed to write keys file");
		if (onDone)
			onDone();
	});
}

function createNewSession(device_address, onDone){
    console.log("Session started for " + device_address);
    if (onDone)
        onDone();
}

function createWallet(onDone){
	walletDefinedByKeys.createSinglesigWalletWithExternalPrivateKey(conf.xPubKey, conf.account, conf.homeDeviceAddress, function(_wallet){
		wallet = _wallet;
		onDone();
	});
}

function handleNoWallet(from_address){
	if (from_address === conf.homeDeviceAddress && wallet === null)
		createWallet(function(){
			device.sendMessageToDevice(from_address, 'text', "Wallet created, all new addresses will be synced to your device");
		});
	else
		device.sendMessageToDevice(from_address, 'text', "The shop is not set up yet, try again later");
}

function replaceConsoleLog(){
	var log_filename = conf.LOG_FILENAME || (appDataDir + '/log.txt');
	var writeStream = fs.createWriteStream(log_filename);
	console.log('---------------');
	console.log('From this point, output will be redirected to '+log_filename);
	console.log("To release the terminal, type Ctrl-Z, then 'bg'");
	console.log = function(){
		writeStream.write(Date().toString()+': ');
		writeStream.write(util.format.apply(null, arguments) + '\n');
	};
	console.warn = console.log;
	console.info = console.log;
}


model.connect(function() {
   console.log("connected to mongodb");
});

if (!conf.permanent_paring_secret)
	throw Error('no conf.permanent_paring_secret');

db.query(
	"INSERT "+db.getIgnore()+" INTO pairing_secrets (pairing_secret, expiry_date, is_permanent) VALUES(?, '2035-01-01', 1)", 
	[conf.permanent_paring_secret]
);

db.query("SELECT wallet FROM wallets", function(rows){
	if (rows.length > 1)
		throw Error('more than 1 wallet');
	if (rows.length === 1)
		wallet = rows[0].wallet;
	else
		wallet = null; // different from undefined
});

readKeys(function(devicePrivKey, deviceTempPrivKey, devicePrevTempPrivKey){
	var saveTempKeys = function(new_temp_key, new_prev_temp_key, onDone){
		writeKeys(devicePrivKey, new_temp_key, new_prev_temp_key, onDone);
	};
	device.setDevicePrivateKey(devicePrivKey);
	device.setTempKeys(deviceTempPrivKey, devicePrevTempPrivKey, saveTempKeys);
	device.setDeviceName(conf.deviceName);
	device.setDeviceHub(conf.hub);
	var my_device_pubkey = device.getMyDevicePubKey();
	console.log("my device pubkey: "+my_device_pubkey);
	console.log("my pairing code: "+my_device_pubkey+"@"+conf.hub+"#"+conf.permanent_paring_secret);
	
	replaceConsoleLog();
});

eventBus.on('paired', function(from_address){
	if (!wallet)
		return handleNoWallet(from_address);

	createNewSession(from_address, function(){
	    model.Account.find({device: from_address}, function(error, accounts) {
	        if (accounts.length == 0) {
		        device.sendMessageToDevice(from_address, 'text', "Hi! Welcome to the Marketplace. Type [help](command:help) for available commands.");
	            var account = new model.Account({device: from_address});
	            account.save(function(err, account) {
                    if (err) return console.error(err);
                });
	        } else {
    		    device.sendMessageToDevice(from_address, 'text', "Hi! Welcome back! Type [help](command:help) for available commands.");
	        }
	    });
	});
});

var usage = `Use the commands below:
[my items](command:my items) - lists the your items on sale
[search](command:search) - search for items on sale
`;

eventBus.on("text", function(from_address, text) {
	if (!wallet)
		return handleNoWallet(from_address);
	
	model.Account.findOne({"device": from_address}, function(err, account) {
        if (err) {
            device.sendMessageToDevice(from_address, "text", "Your account cannot be accessed currently, please try again later.");
            return console.error("Failed to access account: " + err);
        }

        console.log("[" + account._id +"] Text received: '" + text + "'"); 

        var args = text.trim().split(" ");
        var command = "";
        
    	if (Array.isArray(account.conversation) && account.conversation.length > 0) {
    		let lastConversation = account.conversation.pop();
    		lastConversation.remove();
    		account.markModified("conversation");
    		account.save(function(err) {
    			if (err) {
    				console.error("[" + account._id +"] Failed to resume conversation: " + err);
                	device.sendMessageToDevice(from_address, "text", "Something went wrong, please try again.");
    				return;
    			}
    			
    			command = lastConversation.action;
    			// TODO this may leave command empty in case save fails and because it's async
    		});
    		
			command = lastConversation.action; // FIXME well not cool as it executes even if we didn't removed the last conversation
    	} else {
	        command = args.shift().toLowerCase();
	        
	        if (command == "my" && args.length > 0) {
	            command += " " + args.shift().toLowerCase();
	        }
    	}


        switch (command) {
            case "help":
                device.sendMessageToDevice(from_address, "text", usage);
                break;
            case "my items":
                let items = account.items.map(function(item) {
                    return " - " + item.title + " ([remove](command:remove " + item._id + "), [edit](command:edit " + item._id + "))";
                });
                
                device.sendMessageToDevice(from_address, "text", items.join("\n") + "\n[add](command:add)");
                break;
            case "add":
                if (args.length == 0) {
                	account.conversation.push(new model.Conversation({action: "add"}));
                	account.markModified("conversation");
                	account.save(function(err) {
                		if (err) {
                			console.error("[" + account._id +"] Failed to save conversation: " + err);
	                    	device.sendMessageToDevice(from_address, "text", "Something went wrong, please try again.")
                			return;
                		}
                    	device.sendMessageToDevice(from_address, "text", "Tell me what you are selling in a couple of words or [cancel](command:cancel)")
                	});
                } else {
                    let item = new model.Item({ title: args.join(" ") });
                
                    account.items.push(item);
                    account.save(function(err) {
                        if (err) {
                            console.error("[" + account._id +"] Failed to create item: " + err); 
                            device.sendMessageToDevice(from_address, "text", "Unfortunately, I was unable to store your item. Could you please retry?");
                            return;
                        }
                        console.log("[" + account._id +"] Item saved: " + item);
                        device.sendMessageToDevice(from_address, "text", "Great! You added " + item.title + ". You can provide a more detailed description or [stop](command:stop) here. Note, this item is not yet listed. So, how would you describe this item?");
                        // TODO ask for description
                    });
                }
                break;
            case 'remove':
                if (args.length > 0) {
                    let item = account.items.id(args[0])
                    
                    if (item !== null) {
                    	item.remove();
              
	                    account.save(function(err) {
	                        if (err) {
	                            console.error("[" + account._id +"] Failed to remove item: " + args[0]);
	                            device.sendMessageToDevice(from_address, "text", "Unfortunately, I could not remove this item. Maybe try again later. To see your items try [my items](command:my items)");
	                            return;
	                        }
	                        console.log("[" + account._id +"] Removed " + item);
	                        device.sendMessageToDevice(from_address, "text", "Removed " + item.title);
	                    });
                    } else {
                        device.sendMessageToDevice(from_address, "text", "That item does not exists, nothing to remove. To see your items try [my items](command:my items)");
                    }
                } else {
                    // TOOD implement asking for a item to remove
                    device.sendMessageToDevice("Nothing has been removed. Try [my items](command:my items)");
                }
                break;
            default:
                device.sendMessageToDevice(from_address, "text", "Not sure how to help with that. Try [help](command:help) for available commands.")
        }
    
    });

});
