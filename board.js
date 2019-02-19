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
    passwordHash: {type: String, required: true},
    reported: {type: Boolean, required: false, default: false}
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
        reported: false
    }
}

function countThreadMessages(threadId) {
    return Message.count({threadId}).exec()
}

function createThread(board, text, password) {
    const thread = populateThread(board, text, password)
    return Thread.create(thread).then(created => {
        return {
            _id: created._id,
            text: created.text
        };
    })
}

function reportThread(_id) {
    console.log(_id)
    return Thread.findByIdAndUpdate(_id, {reported: true}).exec()
        .then(x => {
            if(!x) throw NOT_FOUND;
            return x;
        })
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

function getThreadWithMessages(threadId) {
    const messagesProm = getMessages(threadId);
    const threadProm = Thread.findById(threadId, "-passwordHash -reported -__v")
        .exec().then(data => {
            if (!data) throw NOT_FOUND;
            return data;
        })
    return Promise.all([messagesProm, threadProm])
        .then(([messages, thread]) => {
            return {
                ...(thread._doc),
                messages
            }
        })
}

function getMessagesWithCount(threadId, limit) {
    const messages = getMessages(threadId, limit);
    const count = countThreadMessages(threadId);
    return Promise.all([count, messages]);
}

function addMessage(threadId, text, password) {
    return Thread.findById(threadId).exec()
        .then(thread => {
            if(!thread) throw NOT_FOUND;
            return Message.create(populateMessage(threadId, text, password))
                .then(r => ({
                    _id: r._id,
                    text: r.text
                }))
        })
}

function reportMessage(messageId) {
    return Message.findByIdAndUpdate(messageId, {reported: true}).exec()
        .then(x => {
            if(!x) throw NOT_FOUND;
            return x;
        })
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
            const msgWithCountProm = threads.map(t => getMessagesWithCount(t._id, replyLimit))
            return Promise.all(msgWithCountProm).then(msgWithCount => {
                var i=0;
                return threads.map(thread => {
                    return {
                        ...(thread._doc),
                        messageCount: msgWithCount[i][0],
                        messages: msgWithCount[i++][1]
                    }
                })
            })
        })
}

module.exports = {
    getThreads, createThread, reportThread, deleteThread, 
    getMessages, addMessage, reportMessage, deleteMessage,
    getThreadWithMessages,
    BAD_PASSWORD, NOT_FOUND }