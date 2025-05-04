export default class Player {
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

  calculateRank(playersArray) {
    const sortedPlayers = [...playersArray].sort((a, b) => b.score - a.score);
    const rank = sortedPlayers.findIndex(player => player.id === this.id) + 1;
    return `Rank: ${rank}/${playersArray.length}`;
  }
}