/*jslint node: true */
"use strict";

exports.port = null;
//exports.myUrl = 'wss://mydomain.com/bb';
exports.bServeAsHub = false;
exports.bLight = false;


exports.storage = 'sqlite';

exports.hub = 'byteball.org/bb-test';
exports.deviceName = 'Marketplace';
exports.permanent_pairing_secret = '0000';
exports.KEYS_FILENAME = 'keys.json';


console.log('finished marketplace conf');
