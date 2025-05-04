require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socket = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const nocache = require('nocache');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

// Security measures
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"]
    }
  },
  hidePoweredBy: { setTo: 'PHP 7.4.3' },
  xssFilter: true,
  noSniff: true
}));

app.use(nocache());

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({origin: '*'}));

app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

fccTestingRoutes(app);
    
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 3000;

const server = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

const io = socket(server);

// Server-side Player class
class ServerPlayer {
  constructor({x, y, score, id}) {
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.score = score || 0;
    this.id = id;
    this.speed = 5;
  }

  movePlayer(direction, speed = this.speed) {
    switch (direction) {
      case 'up':
        this.y = Math.max(this.radius, this.y - speed);
        break;
      case 'down':
        this.y = Math.min(600 - this.radius, this.y + speed);
        break;
      case 'left':
        this.x = Math.max(this.radius, this.x - speed);
        break;
      case 'right':
        this.x = Math.min(800 - this.radius, this.x + speed);
        break;
    }
  }

  collision(item) {
    const distance = Math.sqrt(
      Math.pow(this.x - item.x, 2) + Math.pow(this.y - item.y, 2)
    );
    return distance < this.radius + item.radius;
  }
}

// Server-side Collectible class
class ServerCollectible {
  constructor({x, y, value, id}) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.value = value;
    this.id = id;
  }
}

const players = {};
const collectibles = {};
let collectibleCounter = 0;

const gameSettings = {
  width: 800,
  height: 600,
  collectibleSpawnInterval: 5000,
  collectibleValue: 10
};

setInterval(() => {
  const x = Math.floor(Math.random() * (gameSettings.width - 20)) + 10;
  const y = Math.floor(Math.random() * (gameSettings.height - 20)) + 10;
  const id = `collectible-${collectibleCounter++}`;
  
  const newCollectible = new ServerCollectible({
    x,
    y,
    value: gameSettings.collectibleValue,
    id
  });
  
  collectibles[id] = newCollectible;
  io.emit('newCollectible', newCollectible);
}, gameSettings.collectibleSpawnInterval);

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);
  
  const x = Math.floor(Math.random() * (gameSettings.width - 50)) + 25;
  const y = Math.floor(Math.random() * (gameSettings.height - 50)) + 25;
  
  const newPlayer = new ServerPlayer({
    x,
    y,
    score: 0,
    id: socket.id
  });
  
  players[socket.id] = newPlayer;
  
  socket.emit('init', {
    player: newPlayer,
    players,
    collectibles,
    gameSettings
  });
  
  socket.broadcast.emit('newPlayer', newPlayer);
  
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].movePlayer(movementData.direction, movementData.speed);
      
      for (const collectibleId in collectibles) {
        if (players[socket.id].collision(collectibles[collectibleId])) {
          players[socket.id].score += collectibles[collectibleId].value;
          delete collectibles[collectibleId];
          io.emit('collectibleCollected', { collectibleId, playerId: socket.id });
          break;
        }
      }
      
      socket.broadcast.emit('playerMoved', {
        playerId: socket.id,
        x: players[socket.id].x,
        y: players[socket.id].y,
        score: players[socket.id].score
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

module.exports = app;