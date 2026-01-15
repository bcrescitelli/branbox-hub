import React, { useState } from 'react';
import { db } from './firebaseConfig';
import { ref, set } from 'firebase/database';

export default function Host() {
  const [roomCode, setRoomCode] = useState(null);

  const createRoom = (gameType) => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    set(ref(db, `rooms/${code}`), {
      gameType: gameType,
      status: "LOBBY",
      createdAt: Date.now()
    }).then(() => {
      setRoomCode(code);
    });
  };

  if (roomCode) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'white' }}>
        <h1 style={{ fontSize: '5rem' }}>CODE: {roomCode}</h1>
        <p style={{ fontSize: '2rem' }}>Join at your-url.vercel.app</p>
        <button onClick={() => setRoomCode(null)}>Exit Room</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '50px', color: 'white' }}>
      <h1>PICK A GAME</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '300px', margin: '0 auto' }}>
        <button onClick={() => createRoom('stir-the-pot')}>Stir the Pot</button>
        <button onClick={() => createRoom('dirty-laundry')}>Dirty Laundry</button>
        <button onClick={() => createRoom('museum-of-modern-mistakes')}>Museum of Mistakes</button>
        <button onClick={() => createRoom('heres-my-point-new')}>Here's My Point</button>
      </div>
    </div>
  );
}
