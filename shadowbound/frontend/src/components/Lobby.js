import React, { useState } from 'react';
export default function Lobby({ onSubmit }) {
  const [name, setName] = useState('');
  return (
    <div className="center">
      <h1>Shadowbound</h1>
      <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Hero name" />
      <button disabled={!name} onClick={()=>onSubmit(name)}>Continue</button>
    </div>
  );
}
