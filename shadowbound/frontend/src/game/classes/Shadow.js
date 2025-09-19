export default class Shadow {
  constructor(scene, ownerHero) {
    this.scene = scene;
    this.owner = ownerHero;
    this.sprite = scene.add.sprite(ownerHero.sprite.x, ownerHero.sprite.y, 'shadow');
    this.sprite.setDepth(3);
    this.sprite.setScale(0.9);
    this.state = 'idle'; // idle | stalk | takeover
  }

  setTakeover() { this.state = 'takeover'; this.sprite.setVisible(true); }

  update(players) {
    if (!this.owner) return;
    const fear = this.owner.fear || 0;
    if (fear < 50) this.state = 'idle';
    else if (fear < 100) this.state = 'stalk';
    else this.state = 'takeover';

    if (this.state === 'idle') { this.sprite.setVisible(false); return; }
    if (this.state === 'stalk') {
      this.sprite.setVisible(true);
      this.scene.physics.moveToObject(this.sprite, this.owner.sprite, 40);
      return;
    }

    if (this.state === 'takeover') {
      this.sprite.setVisible(true);
      // hunt nearest other player
      let nearest = null; let minD = Infinity;
      for (const [id, p] of Object.entries(players)) {
        if (p.id === this.owner.id) continue;
        const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, p.sprite.x, p.sprite.y);
        if (dist < minD) { minD = dist; nearest = p; }
      }
      if (nearest) {
        this.scene.physics.moveToObject(this.sprite, nearest.sprite, 130);
        // if close enough -> simulate attack: increase their fear (client-side trigger; server authoritative updates will follow)
        if (minD < 28) {
          // play attack sound
          try { this.scene.sound.play('shadowAttack'); } catch(e) {}
          // client attempts pingEvent to server to increase fear in nearby players
          socket.emit('input', { pingEvent: true, dir: {x:0,y:0}, moving:false });
        }
      }
    }
  }

  destroy() { this.sprite.destroy(); }
}
