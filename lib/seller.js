/*jslint node: true */
"use strict";

module.exports = function(chat, model) {

    chat.when("my items", function(reply, message) {
        let account = message.account;
        
        model.Item.find({account: account._id}, function(err, items) {
            if (err) {
                console.error("[" + account._id +"] Failed find items: " + err);
                reply("Something went wrong, please try again.");
        		return;
            }
    
            if (items != null && items.length > 0) {
                let myitems = items.map((item)=>
                    " - " + item.title + " ([remove](command:remove " + item._id + "), [edit](command:edit " + item._id + "))"
                );
        	    
        	    reply(myitems.join("\n") + "\n[add](command:add)");
            } else {
                reply("You have no items yet, but you can easily [add](command:add) one.");
            }
        });
        
    });
    
    chat.when("add", function(reply, message){
    	let account = message.account;
    	let args = message.args;
    	
        if (args.length == 0) {
        	account.conversation.push(new model.Conversation({action: "add"}));
        	account.markModified("conversation");
        	account.save(function(err) {
        		if (err) {
        			console.error("[" + account._id +"] Failed to save conversation: " + err);
                	reply("Something went wrong, please try again.");
        			return;
        		}
            	reply("Tell me what you are selling in a couple of words or [cancel](command:cancel)");
        	});
        } else {
            let item = new model.Item({ account: account._id, title: args.join(" ") });

            item.save(function(err) {
                if (err) {
                    console.error("[" + account._id +"] Failed to create item: " + err); 
                    reply("Unfortunately, I was unable to store your item. Could you please retry?");
                    return;
                }
                
                console.log("[" + account._id +"] Item saved: " + item);

                account.items.push(item._id);
                account.markModified("items");
                account.save(function(err) {
                    if (err) {
                        // TODO try to rollback item somehow
                        console.error("[" + account._id +"] Failed to add item to account: " + err); 
                        reply("Unfortunately, I was unable to store your item. Could you please retry?");
                        return;
                    }

                    reply("Great! You added " + item.title + ". You can provide a more detailed description or [stop](command:stop) here. Note, this item is not yet listed. So, how would you describe this item?");
                    // TODO ask for description
                });
            });
        }
    });
    
    chat.when("remove", function(reply, message){
    	let account = message.account;
    	let args = message.args;
    
        if (args.length > 0) {
            model.Item.findByIdAndRemove(args[0], function(err, item) {
                if (err) {
                    console.error("[" + account._id +"] Failed to remove item " + args[0] + ": " + err);
                    reply("Unfortunately, I could not remove this item. Maybe try again later. To see your items try [my items](command:my items)");
                    return;
                }
                
                account.items.remove(item._id);
                account.markModified("items");

                account.save(function(err) {
                    if (err) {
                        console.error("[" + account._id +"] Failed to remove item from account " + args[0] + ": " + err);
                        reply("Unfortunately, I could not remove this item. Maybe try again later. To see your items try [my items](command:my items)");
                        return;
                    }
                    console.log("[" + account._id +"] Removed " + item);
                    reply("Removed " + item.title);
                });
                
            });
            
        } else {
            // TOOD implement asking for a item to remove
            reply("Nothing has been removed. Try [my items](command:my items)");
        }
    
    });

    chat.when("search", function(reply, message) {
        let account = message.account;
        let searchPhrase = message.args.join(" ");
        
        model.Item.find({$text: { $search: searchPhrase } })
            .exec(function(err, items) {
                if (err) {
                    console.error("[" + account._id +"] Failed to perform search: " + err);
                    reply("Unfortunately I could not perform the search. Try again please.");
                    return;
                }
                
                reply(items.map((item)=>item.title).join("\n"));
            }); 
    });
}
