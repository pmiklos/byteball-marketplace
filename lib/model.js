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
    signingDate: Date
});

ContractSchema.virtual("text").get(function() {
    return `${ this.isCompleted ? 'CONTRACT' : 'CONTRACT DRAFT'} FOR THE SALE OF GOODS

Agreement made ${this.creationDate} between ${this.seller} (seller) and ${this.buyer} (buyer).

Seller shall sell and ship to the buyer within [5 business days from payment date] to 

 ${ this.shippingAddress || '[set shipping address](command:set shipping address)' }
 
the following propery:

 ${this.titleOfGoods}
 
 ${this.descriptionOfGoods || '<no description>'}
 
Buyer shall pay ${this.price} bytes to ${this.isClosed ? '['+this.paymentAddress+'](byteball:'+this.paymentAddress +"?amount=" + this.price +')' : 'an address the seller will provide'}.

If seller fails to deliver, the buyer will be able to withdraw the money to the following address: ${this.refundAddress || '[set refund address](command:set refund address)'}`;
});

ContractSchema.virtual("isCompleted").get(function() {
    return this.shippingAddress && this.refundAddress ? true : false;
});

ContractSchema.virtual("isClosed").get(function() {
    return this.paymentAddress ? true : false;
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
    let accountId = this._id;
    this.conversation.push(conversation);
    this.markModified("conversation");
    this.save(function(err) {
        let safeCallback = callback || function() {};
        if (err) {
            console.error("[" + accountId + "] Failed to save conversation: " + err);
            return safeCallback(err);
        }
        safeCallback();
    });
});

AccountSchema.method("repeatContext", function(context, callback) {
    this.pushConversation(new Conversation({
        context: context
    }), callback);
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
var Conversation = mongoose.model("Conversation", ConversationSchema);

exports.connect = connect;
exports.Account = accountModel;
exports.Conversation = Conversation;
exports.Item = mongoose.model("Item", ItemSchema);
exports.Auction = mongoose.model("Auction", AuctionSchema);
exports.Bid = mongoose.model("Bid", BidSchema);
exports.Contract = mongoose.model("Contract", ContractSchema);
