import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');

let player;
let players = {};
let collectibles = {};
let gameSettings = {};

function resizeCanvas() {
  const ratio = Math.min(
    window.innerWidth / gameSettings.width,
    window.innerHeight / gameSettings.height
  );
  canvas.style.width = `${gameSettings.width * ratio}px`;
  canvas.style.height = `${gameSettings.height * ratio}px`;
}

socket.on('init', (data) => {
  player = new Player(data.player);
  players = data.players;
  collectibles = data.collectibles;
  gameSettings = data.gameSettings;
  
  canvas.width = gameSettings.width;
  canvas.height = gameSettings.height;
  
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  
  requestAnimationFrame(gameLoop);
});

const keys = {};
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  
  let direction = null;
  if (e.key === 'ArrowUp' || e.key === 'w') direction = 'up';
  if (e.key === 'ArrowDown' || e.key === 's') direction = 'down';
  if (e.key === 'ArrowLeft' || e.key === 'a') direction = 'left';
  if (e.key === 'ArrowRight' || e.key === 'd') direction = 'right';
  
  if (direction) {
    socket.emit('playerMovement', { direction, speed: player.speed });
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

socket.on('newPlayer', (newPlayer) => {
  players[newPlayer.id] = newPlayer;
});

socket.on('playerMoved', (data) => {
  if (players[data.playerId]) {
    players[data.playerId].x = data.x;
    players[data.playerId].y = data.y;
    players[data.playerId].score = data.score;
  }
});

socket.on('playerDisconnected', (playerId) => {
  delete players[playerId];
});

socket.on('newCollectible', (newCollectible) => {
  collectibles[newCollectible.id] = newCollectible;
});

socket.on('collectibleCollected', (data) => {
  delete collectibles[data.collectibleId];
  if (data.playerId === player.id) {
    player.score += gameSettings.collectibleValue;
  }
});

function gameLoop() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  for (const collectibleId in collectibles) {
    const collectible = collectibles[collectibleId];
    context.beginPath();
    context.arc(collectible.x, collectible.y, collectible.radius, 0, Math.PI * 2);
    context.fillStyle = '#FFD700';
    context.fill();
    context.closePath();
  }
  
  for (const playerId in players) {
    const p = players[playerId];
    context.beginPath();
    context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    context.fillStyle = playerId === player.id ? '#00FF00' : '#FF0000';
    context.fill();
    context.closePath();
    
    context.fillStyle = '#000000';
    context.font = '12px Arial';
    context.fillText(p.score, p.x - 5, p.y - p.radius - 5);
  }
  
  const playersArray = Object.values(players);
  const rank = player.calculateRank(playersArray);
  context.fillStyle = '#000000';
  context.font = '20px Arial';
  context.fillText(`Rank: ${rank}/${playersArray.length}`, 10, 30);
  
  requestAnimationFrame(gameLoop);
}