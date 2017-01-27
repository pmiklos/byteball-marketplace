/*jslint node: true */
"use strict";

var model = require('./model.js');

model.connect(function() {
   console.log("connected to mongodb");
   
   var account = new model.Account({device: "ABCDEF"});
   account.save(function(err, account) {
       if (err) return console.error(err);
   });
});
