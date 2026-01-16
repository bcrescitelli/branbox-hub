import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';

// Matching your lowercase folder names from screenshot
import StirThePot from '../stir-the-pot/src/App.jsx';
import DirtyLaundry from '../dirty-laundry/src/App.jsx';
import Museum from '../museum-of-modern-mistakes/src/App.jsx';
import MyPoint from '../heres-my-point-new/src/App.jsx';

import Host from './Host';

export default function App() {
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [gameType, setGameType] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) signInAnonymously(auth);
      else setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleJoin = () => {
    const code = roomCode.toUpperCase();
    onValue(ref(db, `rooms/${code}`), (snapshot) => {
      if (snapshot.exists()) {
        setGameType(snapshot.val().gameType);
      } else {
        alert("Room not found!");
      }
    });
  };

  if (window.location.pathname === '/host') return <Host />;

  if (gameType) {
    const props = { code: roomCode, user: user, role: 'PLAYER' };
    switch (gameType) {
      case 'stir-the-pot': return <StirThePot {...props} />;
      case 'dirty-laundry': return <DirtyLaundry {...props} />;
      case 'museum': return <Museum {...props} />;
      case 'my-point': return <MyPoint {...props} />;
      default: return <div style={{color: 'white'}}>Unknown game: {gameType}</div>;
    }
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '100px', color: 'white', backgroundColor: 'black', height: '100vh' }}>
      <h1>BRANBOX HUB</h1>
      <input 
        style={{ padding: '10px', fontSize: '1.2rem' }} 
        onChange={(e) => setRoomCode(e.target.value)} 
        placeholder="ENTER CODE" 
      />
      <button 
        style={{ padding: '10px 20px', fontSize: '1.2rem', marginLeft: '10px' }} 
        onClick={handleJoin}
      >
        JOIN
      </button>
    </div>
  );
}