/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  var threadId;
  var threadId2;

  suite('API ROUTING FOR /api/threads/:board', function() {
    
    suite('POST', function() {
      
      test('create a thread', done => {
        chai.request(server).post('/api/threads/test')
        .send({text: 'sample text', delete_password: 'test'})
        .end((_, res) => {
          threadId = res.body._id
          assert.strictEqual(res.body.text, 'sample text')
          assert.isString(threadId)
          assert.isAtLeast(threadId.length, 5)
          done()
        });
      })

      test('create another thread', done => {
        chai.request(server).post('/api/threads/test')
          .send({text: 'sample text 2', delete_password: 'test2'})
          .end((_, res) => {
            threadId2 = res.body._id
            assert.strictEqual(res.body.text, 'sample text 2')
            assert.isString(threadId2)
            assert.notStrictEqual(threadId, threadId2)
            assert.isAtLeast(threadId2.length, 5)
            done()
          });
      })
      
    });
    
    suite('GET', function() {
      this.timeout(10000)

      test('check the previously created threads exists', done => {
        chai.request(server).get('/api/threads/test').end((_, res) => {
          assert.isArray(res.body)
          thread1 = res.body.find(x => x._id === threadId)
          thread2 = res.body.find(x => x._id === threadId2)
          assert.strictEqual(thread1._id, threadId)
          assert.strictEqual(thread2._id, threadId2)
          done();
        })
      })

    });
    
    suite('DELETE', function() {
      
      test('remove one previously created thread', done => {
        chai.request(server).delete('/api/threads/test')
          .send({thread_id: threadId2, delete_password: 'test2'})
          .end((_, res) => {
            assert.strictEqual(res.status, 200)
            assert.strictEqual(res.text, 'success')
            done()
          });
      })

    });
    
    suite('PUT', function() {
      
      test('flag thread', done => {
        chai.request(server).put('/api/threads/test')
          .send({thread_id: threadId})
          .end((_, res) => {
            assert.strictEqual(res.status, 200)
            assert.strictEqual(res.text, 'success')
            done()
          });
      })

    });

  });
  
  suite('API ROUTING FOR /api/replies/:board', function() {

    var replyId;
    var replyId2;
    
    suite('POST', function() {

      test('add reply', done => {
        chai.request(server).post('/api/replies/test')
          .send({thread_id: threadId, text: 'text 1', delete_password: 'p1'})
          .end((_, res) => {
            assert.strictEqual(res.status, 200)
            replyId = res.body._id;
            assert.isString(replyId)
            assert.isAtLeast(replyId.length, 5)
            assert.strictEqual(res.body.text, 'text 1')
            done()
          });
      })

      test('add second reply', done => {
        chai.request(server).post('/api/replies/test')
          .send({thread_id: threadId, text: 'text 2', delete_password: 'p2'})
          .end((_, res) => {
            assert.strictEqual(res.status, 200)
            replyId2 = res.body._id;
            assert.notStrictEqual(replyId, replyId2)
            done()
          });
      })

    });
    
    suite('GET', function() {
      
      test('get replies', done => {
        chai.request(server).get('/api/replies/test')
          .query({thread_id: threadId})
          .end((_, res) => {
            assert.equal(res.body.messages.length, 2)
            assert.strictEqual(res.body.messages[0]._id, replyId2)
            assert.strictEqual(res.body.messages[1]._id, replyId)
            assert.strictEqual(res.body.messages[0].text, 'text 2')
            assert.strictEqual(res.body.messages[1].text, 'text 1')
            done();
          })
      })

    });
    
    suite('PUT', function() {
      
      test('report reply', done => {
        chai.request(server).put('/api/replies/test')
          .send({reply_id: replyId})
          .end((_, res) => {
            assert.strictEqual(res.text, 'success')
            done();
          })
      })

    });
    
    suite('DELETE', function() {
      
      test('delete reply', done => {
        chai.request(server).delete('/api/replies/test')
          .send({reply_id: replyId, delete_password: 'p1'})
          .end((_, res) => {
            assert.strictEqual(res.text, 'success')
            done();
          })
      })

      test('get replies after deletion', done => {
        chai.request(server).get('/api/replies/test')
          .query({thread_id: threadId})
          .end((_, res) => {
            assert.equal(res.body.messages.length, 2)
            assert.strictEqual(res.body.messages[0]._id, replyId2)
            assert.strictEqual(res.body.messages[1]._id, replyId)
            assert.strictEqual(res.body.messages[0].text, 'text 2')
            assert.strictEqual(res.body.messages[1].text, '[deleted]')
            done();
          })
      })
      

    });
    
  });

});
