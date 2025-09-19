import Phaser from 'phaser';
import socket from '../../api/socket';
import Hero from '../classes/Hero';
import Shadow from '../classes/Shadow';

export default class MainScene extends Phaser.Scene {
  constructor({ playerName, roomId }) {
    super({ key: 'MainScene' });
    this.playerName = playerName;
    this.roomId = roomId;
    this.localId = null;
    this.players = {}; // socketId -> Hero instance
    this.shadows = {}; // socketId -> Shadow instance
  }

  preload() {
    this.load.image('hero', '/assets/hero.png');
    this.load.image('shadow', '/assets/shadow.png');
    this.load.audio('bgm', '/assets/audio/bgm.mp3');
    this.load.audio('heartbeat', '/assets/audio/heartbeat.wav');
    this.load.audio('shadowAttack', '/assets/audio/shadow_attack.wav');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0a');

    // audio
    this.bgm = this.sound.add('bgm', { loop: true, volume: 0.35 });
    try { this.bgm.play(); } catch(e) {}
    this.heartbeat = this.sound.add('heartbeat', { loop: true, volume: 0.45 });
    this.shadowAttack = this.sound.add('shadowAttack', { volume: 0.8 });

    this.inputKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      unleash: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    socket.on('joined', (data) => {
      this.localId = socket.id;
      const players = data.players || {};
      for (const [id, p] of Object.entries(players)) this.spawnOrUpdatePlayer(id, p);
    });

    socket.on('playerJoined', ({ id, player }) => this.spawnOrUpdatePlayer(id, player));
    socket.on('playerLeft', ({ id }) => this.removePlayer(id));

    socket.on('stateUpdate', (payload) => {
      for (const [id, pdata] of Object.entries(payload.players)) {
        this.spawnOrUpdatePlayer(id, pdata);
      }
    });

    socket.on('shadowUnleashed', ({ id }) => {
      if (this.shadows[id]) this.shadows[id].setTakeover();
      // play a global cue
      this.sound.play('shadowAttack');
    });

    // send input tick
    this.time.addEvent({ delay: 50, loop: true, callback: () => this.sendInput() });
  }

  spawnOrUpdatePlayer(id, pdata) {
    if (!this.players[id]) {
      const hero = new Hero(this, { id, name: pdata.name || 'Anon', pos: pdata.pos || { x:100, y:100 }, fear: pdata.fear || 0, shadowActive: pdata.shadowActive });
      this.players[id] = hero;
      const shadow = new Shadow(this, hero);
      this.shadows[id] = shadow;
    } else {
      this.players[id].applyServerState(pdata);
    }
  }

  removePlayer(id) {
    if (this.players[id]) {
      this.players[id].destroy();
      delete this.players[id];
    }
    if (this.shadows[id]) {
      this.shadows[id].destroy();
      delete this.shadows[id];
    }
  }

  sendInput() {
    const dir = { x: 0, y: 0 };
    if (this.inputKeys.left.isDown) dir.x -= 1;
    if (this.inputKeys.right.isDown) dir.x += 1;
    if (this.inputKeys.up.isDown) dir.y -= 1;
    if (this.inputKeys.down.isDown) dir.y += 1;
    const moving = dir.x !== 0 || dir.y !== 0;
    const tryUnleash = this.inputKeys.unleash.isDown;

    socket.emit('input', { dir, moving, tryUnleash });

    // optimistic local movement
    if (this.players[socket.id]) this.players[socket.id].applyLocalInput(dir, moving);
  }

  update(time, delta) {
    // update heroes & shadows
    for (const id of Object.keys(this.players)) {
      const h = this.players[id];
      const s = this.shadows[id];
      s.update(this.players);
      h.update();

      // heartbeat audio logic for local player
      if (id === socket.id) {
        if (h.fear > 50) {
          if (!this.heartbeat.isPlaying) this.heartbeat.play();
          this.heartbeat.setRate(1 + h.fear / 100);
        } else {
          if (this.heartbeat.isPlaying) this.heartbeat.stop();
        }

        // camera shake when shadow near
        const sd = Phaser.Math.Distance.Between(h.sprite.x, h.sprite.y, s.sprite.x, s.sprite.y);
        if (sd < 150) this.cameras.main.shake(80, 0.005);
      }
    }
  }
}
