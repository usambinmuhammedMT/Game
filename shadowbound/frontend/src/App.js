import React, { useState } from 'react';
import Lobby from './components/Lobby';
import Matchmaking from './components/Matchmaking';
import GameSceneWrapper from './components/GameSceneWrapper';

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [inGame, setInGame] = useState(false);

  if (!playerName) return <Lobby onSubmit={(n) => setPlayerName(n)} />;
  if (!roomId && !inGame) return <Matchmaking playerName={playerName} onJoin={(r) => setRoomId(r)} />;
  if (inGame || roomId) return (
    <GameSceneWrapper
      playerName={playerName}
      roomId={roomId}
      onExit={() => { setRoomId(null); setInGame(false); }}
      start={() => setInGame(true)}
    />
  );
  return null;
}
