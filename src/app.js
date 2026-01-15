import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';

// IMPORT YOUR GAMES
import StirThePot from '../games/stir-the-pot/src/App';
import DirtyLaundry from '../games/dirty-laundry/src/App';
import Museum from '../games/museum-of-modern-mistakes/src/App';
import MyPoint from '../games/heres-my-point-new/src/App';

function App() {
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [gameType, setGameType] = useState(null);

  // 1. Give the player an Anonymous Identity
  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (!u) signInAnonymously(auth);
      else setUser(u);
    });
  }, []);

  // 2. Logic to find the game based on the code
  const handleJoin = (enteredCode) => {
    const code = enteredCode.toUpperCase();
    onValue(ref(db, `rooms/${code}`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setGameType(data.gameType);
        setRoomCode(code);
      } else {
        alert("Room not found!");
      }
    });
  };

  // 3. The Switcher (The Jackbox Feel)
  if (gameType === 'stir-the-pot') return <StirThePot code={roomCode} user={user} />;
  if (gameType === 'dirty-laundry') return <DirtyLaundry code={roomCode} user={user} />;
  if (gameType === 'museum') return <Museum code={roomCode} user={user} />;
  if (gameType === 'my-point') return <MyPoint code={roomCode} user={user} />;

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>BRANDBOX CENTRAL</h1>
      <input 
        placeholder="ENTER CODE" 
        onChange={(e) => setRoomCode(e.target.value)} 
        style={{ padding: '10px', fontSize: '20px' }}
      />
      <button onClick={() => handleJoin(roomCode)} style={{ padding: '10px 20px', fontSize: '20px' }}>
        JOIN
      </button>
    </div>
  );
}

export default App;
