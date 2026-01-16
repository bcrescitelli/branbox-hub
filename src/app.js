import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';

// IMPORT GAMES - Paths updated to match renamed folders
import StirThePot from '../stir-the-pot/src/App.jsx';
import DirtyLaundry from '../dirty-laundry/src/App.jsx';
import Museum from '../museum-of-modern-mistakes/src/App.jsx';
import MyPoint from '../heres-my-point-new/src/App.jsx';

import Host from './Host';

export default function App() {
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [gameType, setGameType] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  const isHostView = window.location.pathname === '/host';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) signInAnonymously(auth);
      else setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleJoinRoom = () => {
    if (!roomCode) return alert("Please enter a code");
    setIsJoining(true);
    const code = roomCode.toUpperCase();
    onValue(ref(db, `rooms/${code}`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setGameType(data.gameType);
        setRoomCode(code);
      } else {
        alert("Room not found!");
        setIsJoining(false);
      }
    });
  };

  if (isHostView) return <Host />;

  if (gameType) {
    const props = { code: roomCode, user: user, role: 'PLAYER' };
    switch (gameType) {
      case 'stir-the-pot': return <StirThePot {...props} />;
      case 'dirty-laundry': return <DirtyLaundry {...props} />;
      case 'museum': return <Museum {...props} />;
      case 'my-point': return <MyPoint {...props} />;
      default: return <div style={{color: 'white'}}>Unknown game type: {gameType}</div>;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#121212', color: 'white', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '3rem', color: '#00d4ff' }}>BRANBOX CENTRAL</h1>
      <div style={{ backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <input
          type="text"
          placeholder="ENTER CODE"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength={4}
          style={{ padding: '15px', fontSize: '1.5rem', textAlign: 'center', borderRadius: '10px', border: 'none' }}
        />
        <button onClick={handleJoinRoom} disabled={isJoining} style={{ padding: '15px', fontSize: '1.2rem', backgroundColor: '#00d4ff', color: 'black', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
          {isJoining ? "JOINING..." : "JOIN GAME"}
        </button>
      </div>
    </div>
  );
}