export default class Collectible {
  constructor({x, y, value, id}) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.value = value;
    this.id = id;
  }
}