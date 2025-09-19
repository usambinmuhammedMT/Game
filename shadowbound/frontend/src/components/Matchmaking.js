import React, { useState } from 'react';
import socket from '../api/socket';

export default function Matchmaking({ playerName, onJoin }) {
  const [roomId, setRoomId] = useState('room1');

  const createAndJoin = () => {
    socket.emit('createRoom', { roomId }, (res) => {
      socket.emit('joinRoom', { roomId, name: playerName }, (r) => {
        if (r?.ok) onJoin(roomId);
        else alert('Join failed: ' + (r?.msg || 'unknown'));
      });
    });
  };

  const joinExisting = () => {
    socket.emit('joinRoom', { roomId, name: playerName }, (r) => {
      if (r?.ok) onJoin(roomId);
      else alert('Join failed: ' + (r?.msg || 'unknown'));
    });
  };

  return (
    <div className="center">
      <h2>Matchmaking</h2>
      <input value={roomId} onChange={e=>setRoomId(e.target.value)} placeholder="Room ID (eg. room1)" />
      <div style={{marginTop:10}}>
        <button onClick={createAndJoin} disabled={!roomId}>Create & Join</button>
        <button onClick={joinExisting} disabled={!roomId}>Join Room</button>
      </div>
    </div>
  );
}
