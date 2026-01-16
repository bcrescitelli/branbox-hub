import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';

// Import sub-games using lowercase folder names
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
      default: return <div>Unknown game: {gameType}</div>;
    }
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '100px', color: 'white' }}>
      <h1>BRANBOX HUB</h1>
      <input onChange={(e) => setRoomCode(e.target.value)} placeholder="CODE" />
      <button onClick={handleJoin}>JOIN</button>
    </div>
  );
}