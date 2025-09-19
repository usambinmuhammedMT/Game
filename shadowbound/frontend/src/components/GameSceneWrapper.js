import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MainScene from '../game/scenes/MainScene';
import socket from '../api/socket';

export default function GameSceneWrapper({ playerName, roomId, onExit, start }) {
  const gameRef = useRef(null);
  const containerId = 'phaser-game';

  useEffect(() => {
    if (roomId) socket.emit('joinRoom', { roomId, name: playerName }, (r)=>{});

    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: containerId,
      backgroundColor: '#0b0b0b',
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: [ new MainScene({ playerName, roomId }) ]
    };

    gameRef.current = new Phaser.Game(config);
    start?.();

    return () => {
      try { gameRef.current?.destroy(true); } catch (e) {}
      if (roomId) socket.emit('leaveRoom');
      onExit?.();
    };
    // eslint-disable-next-line
  }, []);

  return <div id={containerId} style={{ width: 800, height: 600, margin: '10px auto' }} />;
}
