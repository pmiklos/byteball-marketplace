/*jslint node: true */
"use strict";

var mongoose = require("mongoose");

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var ContractSchema = new Schema({
    seller: String,
    buyer: String,
    titleOfGoods: String,
    descriptionOfGoods: String,
    price: Number,
    shippingAddress: String,
    paymentAddress: String,
    payoutAddress: String,
    refundAddress: String,
    creationDate: Date,
    signingDate: Date,
    status: String
});

ContractSchema.virtual("draft").get(function() {
    return `CONTRACT DRAFT FOR THE SALE OF GOODS

Agreement made ${this.creationDate} between ${this.seller} (seller) and ${this.buyer} (buyer).

Seller shall sell and ship to the buyer within [5 business days from payment date] to [set shipping address](command:set shipping address) the following propery:

 ${this.titleOfGoods}
 
 ${this.descriptionOfGoods}`;
});

ContractSchema.virtual("completed").get(function() {
    return `CONTRACT FOR THE SALE OF GOODS

Agreement made ${this.creationDate} between ${this.seller} (seller) and ${this.buyer} (buyer).

Seller shall sell and ship to the buyer within [5 business days from payment date] to '${this.shippingAddress}' the following propery:

 ${this.titleOfGoods}
 
 ${this.descriptionOfGoods}`;
});

ContractSchema.virtual("isCompleted").get(function() {
    return this.status == "COMPLETED";
});

var BidSchema = new Schema({
    amount: Number,
    bidder: ObjectId,
    contract: ContractSchema
});

BidSchema.method("findBidder", function(callback) {
    accountModel.findById(this.bidder, callback);
});

var AuctionSchema = new Schema({
    minimumAmount: Number,
    displayUnit: String,
    startDate: Date,
    endDate: Date,
    winner: ObjectId,
    bids: [BidSchema]
});

AuctionSchema.virtual("isEnded").get(function() {
    return this.endDate && Date.now() > this.endDate;
});

var ItemSchema = new Schema({
    account: ObjectId,
    title: String,
    description: String,
    auction: AuctionSchema
});

ItemSchema.index({
    title: "text",
    description: "text"
});

var ConversationSchema = new Schema({
    command: String,
    context: Schema.Types.Mixed
});

var AccountSchema = new Schema({
    device: String,
    conversation: [ConversationSchema]
});

AccountSchema.method("pushConversation", function(conversation, callback) {
    this.conversation.push(conversation);
    this.markModified("conversation");
    this.save(function(err) {
        let safeCallback = callback || function() {};
        if (err) {
            console.error("[" + this._id + "] Failed to save conversation: " + err);
            return safeCallback(err);
        }
        safeCallback();
    });
});

function connect(onDone) {

    mongoose.connect("mongodb://" + process.env.IP + "/test");

    var db = mongoose.connection;

    db.on("error", console.error.bind(console, "connection error:"));
    db.once("open", function() {
        if (onDone) {
            onDone();
        }
    });

}

var accountModel = mongoose.model("Account", AccountSchema);

exports.connect = connect;
exports.Account = accountModel;
exports.Conversation = mongoose.model("Conversation", ConversationSchema);
exports.Item = mongoose.model("Item", ItemSchema);
exports.Auction = mongoose.model("Auction", AuctionSchema);
exports.Bid = mongoose.model("Bid", BidSchema);
exports.Contract = mongoose.model("Contract", ContractSchema);
