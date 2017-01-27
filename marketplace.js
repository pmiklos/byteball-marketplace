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
	        if (accounts.length === 0) {
		        device.sendMessageToDevice(from_address, 'text', "Hi! Welcome to the Marketplace.");
	            var account = new model.Account({device: from_address});
	            account.save(function(err, account) {
                    if (err) return console.error(err);
                });
	        } else {
    		    device.sendMessageToDevice(from_address, 'text', "Hi! Welcome back!");
	        }
	    });
	});
});
