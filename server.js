const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

app
  .use(express.static(path.join(__dirname, 'dist')))
  .get('/without-worker', function (req, res) {
    res.sendFile(path.join(__dirname, 'static', 'without-worker.html'));
  })
  .get('/with-worker', function (req, res) {
    res.sendFile(path.join(__dirname, 'static', 'with-worker.html'));
  })
  .get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
  });

server.listen(8000);

io.on('connection', function (socket) {
  var data = makeData(250);
  socket.emit('data', data);

  setInterval(function () {
    data = updateData(data);
    socket.emit('data', data);
  }, 50);
});

function rand (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeData(numOfRows) {
  var data = [];

  for (var i = 0; i <= numOfRows; i++) {
    data.push({
      value: rand(0, 1000),
      timestamp: +new Date()
    });
  }
  return data;
}

function updateData(data) {
  return data.map(function (record) {
    return {
      value: record.value + 1,
      timestamp: + new Date()
    };
  });
}
