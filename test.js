/*jslint node: true */
"use strict";

var model = require('./model.js');

model.connect(function() {
   console.log("connected to mongodb");
   
    // var account = new model.Account({device: "ABCDEF"});
    // account.save(function(err, account) {
    //     if (err) return console.error(err);
    // });
   
    model.Account.findOne({"device": "ABCDEF"}, function(err, account) {
        if (err) return console.error(err);
        console.log(account);
        
        var item = new model.Item({ title: "test item 3", description: "test description"});
        
        account.items.push(item);
        console.log("Saving " + account);
        account.save(function(err) {
            if (err) return console.error(err);
            console.log("Successful");
        });
   });
   
});
