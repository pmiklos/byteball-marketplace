/*jslint node: true */
"use strict";

exports.port = null;
//exports.myUrl = 'wss://mydomain.com/bb';
exports.bServeAsHub = false;
exports.bLight = false;


exports.storage = 'sqlite';

exports.hub = 'byteball.org/bb-test';
exports.deviceName = 'Marketplace';
exports.permanent_paring_secret = '0000';
exports.KEYS_FILENAME = 'keys.json';

// home wallet (replace these values with the properties of your wallet that is to collect the revenue from sales)
exports.xPubKey = 'xpub6BmRgamNAZ5GB4Sr8jqKkyZgEbdRvUXgG8CwxpTNHse1mrHiFtVMDzUHoaJouZTNTzo56BkADzPEBf2p9BVumNhresBhQe27bSEwvur3sMV';
exports.account = 6;
exports.homeDeviceAddress = '04ANE3TFXEJKHQUYSYJBJNKWDGYV6DTML';


console.log('finished merchant conf');
