const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const model = mongoose.model;
var Schema = mongoose.Schema;

require('dotenv').config()
mongoose.connect(process.env.DB, {useNewUrlParser: true});

const MessageSchema = new Schema({
    threadId: {type: String, required: true},
    passwordHash: {type: String, required: true},
    reported: {type: Boolean, required: false, default: false},
    text: {type: String, required: true},
    createdOn: {type: Date, required: true}
})

const ThreadSchema = new Schema({
    board: {type: String, required: true},
    text: {type: String, required: true},
    createdOn: {type: Date, required: true},
    bumpedOn: {type: Date, required: true},
    passwordHash: {type: String, required: true}
})


const Thread = model('board_thread', ThreadSchema);
const Message = model('board_message', MessageSchema)

const BAD_PASSWORD = 'bad-password';
const NOT_FOUND = 'not-found';

function hash(original) {
    const salt = bcrypt.genSaltSync(2);
    return bcrypt.hashSync(original, salt);
}

function checkHash(original, hash) {
    return bcrypt.compareSync(original, hash); 
}

function populateMessage(threadId, text, password) {
    return {
        threadId,
        text, 
        createdOn: new Date(),
        reported: false,
        passwordHash: hash(password)
    }
}

function populateThread(board, text, password) {
    return {
        board,
        text,
        createdOn: new Date(),
        bumpedOn: new Date(),
        passwordHash: hash(password),
    }
}

function createThread(board, text, password) {
    const thread = populateThread(board, text, password)
    return Thread.create(thread)
}

function reportThread(_id) {
    return Thread.findByIdAndUpdate(_id, {reported: true}).exec()
}

function hardDeleteThread(_id) {
    return Thread.deleteOne({_id}).exec();
}

function deleteThread(_id, password) {
    return Thread.findById(_id).exec()
    .then(data => {
        if(data==null) throw NOT_FOUND
        const passwordHash = data.passwordHash;
        if(!checkHash(password, passwordHash)) {
            throw BAD_PASSWORD
        } else {
            return Promise.all([hardDeleteThread(_id), hardDelteMessages(_id)])
        }
    })
}

function hardDelteMessages(threadId) {
    return Message.deleteMany({threadId}).exec();
}

function getMessages(threadId, limit) {
    return Message.find({threadId}, 
        "-passwordHash -reported -__v",
        {limit, sort: {createdOn: -1}})
     .exec()
}

function addMessage(threadId, text, password) {
    return Thread.findById(threadId).exec()
        .then(thread => {
            if(!thread) throw NOT_FOUND;
            return Message.create(populateMessage(threadId, text, password))
        })
}

function reportMessage(messageId) {
    return Message.findByIdAndUpdate(messageId, {reported: true}).exec();
}

function deleteMessage(messageId, password) {
    return Message.findById(messageId).then(message => {
        if(!message) throw NOT_FOUND;
        if(!checkHash(password, message.passwordHash)) throw BAD_PASSWORD;
        return Message.findByIdAndUpdate(messageId, {text: '[deleted]', passwordHash: ''}).exec()
    })
}

function getThreads(board, threadLimit = 10, replyLimit = 3) {
    return Thread.find({board}, "-passwordHash -reported -__v", {limit: threadLimit, sort: {bumpedOn: -1}}).exec()
        .then(threads => {
            const messageProms = threads.map(t => getMessages(t._id, replyLimit))
            return Promise.all(messageProms).then(messages => {
                var i=0;
                return threads.map(thread => {
                    return {
                        ...(thread._doc),
                        messages: messages[i++]
                    }
                })
            })
        })
}

module.exports = {
    getThreads, createThread, reportThread, deleteThread, 
    getMessages, addMessage, reportMessage, deleteMessage,
    BAD_PASSWORD, NOT_FOUND }