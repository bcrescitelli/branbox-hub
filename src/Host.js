import React, { useState } from 'react';
import { db } from './firebaseConfig';
import { ref, set } from 'firebase/database';

function Host() {
  const [roomCode, setRoomCode] = useState(null);

  const createRoom = (gameType) => {
    // Generate a random 4-letter code
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // Create the room in your NEW Firebase
    set(ref(db, `rooms/${code}`), {
      gameType: gameType,
      status: "LOBBY",
      hostId: "big-screen",
      createdAt: Date.now()
    }).then(() => {
      setRoomCode(code);
    });
  };

  if (roomCode) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h1>ROOM CODE: {roomCode}</h1>
        <p>Tell your friends to join on their phones!</p>
        <button onClick={() => setRoomCode(null)}>Close Room</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>WHICH GAME ARE WE PLAYING?</h1>
      <div style={{ display: 'grid', gap: '20px', justifyContent: 'center' }}>
        <button onClick={() => createRoom('stir-the-pot')}>STIR THE POT</button>
        <button onClick={() => createRoom('dirty-laundry')}>DIRTY LAUNDRY</button>
        <button onClick={() => createRoom('museum-of-modern-mistakes')}>MUSEUM OF MISTAKES</button>
        <button onClick={() => createRoom('heres-my-point-new')}>HERE'S MY POINT</button>
      </div>
    </div>
  );
}

export default Host;
