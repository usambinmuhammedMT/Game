export default class Hero {
  constructor(scene, { id, name, pos, fear=0, shadowActive=false }) {
    this.scene = scene;
    this.id = id;
    this.name = name;
    this.pos = { x: pos.x, y: pos.y };
    this.fear = fear;
    this.shadowActive = shadowActive;

    this.sprite = scene.add.sprite(this.pos.x, this.pos.y, 'hero');
    this.sprite.setDepth(2);
    this.sprite.setScale(0.7);

    this.shadowSprite = scene.add.sprite(this.pos.x, this.pos.y, 'shadow');
    this.shadowSprite.setDepth(1);
    this.shadowSprite.setVisible(!!shadowActive);
  }

  applyServerState(pdata) {
    if (pdata.pos) {
      this.scene.tweens.add({
        targets: [this.sprite, this.shadowSprite],
        x: pdata.pos.x, y: pdata.pos.y, duration: 80, ease: 'Linear'
      });
      this.pos = { ...pdata.pos };
    }
    this.fear = pdata.fear || this.fear;
    this.setShadowActive(pdata.shadowActive);
  }

  setShadowActive(on) {
    this.shadowActive = !!on;
    this.shadowSprite.setVisible(this.shadowActive);
    this.sprite.setVisible(!this.shadowActive);
  }

  applyLocalInput(dir, moving) {
    if (!moving) return;
    const mag = Math.sqrt(dir.x*dir.x + dir.y*dir.y) || 1;
    const nx = dir.x / mag; const ny = dir.y / mag;
    const speed = 140; const dt = 0.05;
    this.pos.x += nx * speed * dt; this.pos.y += ny * speed * dt;
    this.sprite.setPosition(this.pos.x, this.pos.y);
    this.shadowSprite.setPosition(this.pos.x, this.pos.y);
  }

  update() {
    if (this.fear >= 60) {
      const pulse = 1 + (this.fear - 60)/120;
      this.sprite.setScale(0.7 * (1 + Math.sin(Date.now()/120)*0.02*pulse));
    }
  }

  destroy() { this.sprite.destroy(); this.shadowSprite.destroy(); }
}
