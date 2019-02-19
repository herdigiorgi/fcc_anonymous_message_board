/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

const board = require('../board');

function adaptResponse(res, resultPromise, json=false) {
  resultPromise.then(result => {
    if(json) {
      res.json(result)
    } else {
      res.send('success')
    }
  }).catch(error => {
      switch(error) {
        case board.NOT_FOUND:
          res.status(404).send('not found')
          break;
        case board.BAD_PASSWORD:
          res.status(400).send('incorrect password')
          break;
        default:
          console.log(error)
          res.status(500).send('internal error')
      }
  })
}

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .get((req, res) => {
      adaptResponse(res, board.getThreads(req.params.board), true)
    })
    .post((req, res) => {
      adaptResponse(res, board.createThread(req.params.board, req.body.text, req.body.delete_password))
    })
    .put((req, res) => {
      adaptResponse(res, board.reportThread(req.body.thread_id))
    })
    .delete((req, res) => {
      adaptResponse(res, board.deleteThread(req.body.thread_id, req.body.delete_password))
    })
    
  app.route('/api/replies/:board')
    .get((req, res) => {
      adaptResponse(res, board.getThreadWithMessages(req.query.thread_id), true)
    })
    .post((req, res) => {
      adaptResponse(res, board.addMessage(req.body.thread_id, req.body.text, req.body.delete_password))
    })
    .put((req, res) => {
      adaptResponse(res, board.reportMessage(req.body.reply_id))
    })
    .delete((req, res) => {
      adaptResponse(res, board.deleteMessage(req.body.reply_id, req.body.delete_password))
    })

};
