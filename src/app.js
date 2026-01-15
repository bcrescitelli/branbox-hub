import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';

// Import Games - Ensure these folder names match your GitHub sidebar exactly
import StirThePot from '../stir-the-pot/src/App.jsx';
import DirtyLaundry from '../dirty-laundry/src/App.jsx';
import Museum from '../museum-of-modern-mistakes/src/App.jsx';
import MyPoint from '../heres-my-point-new/src/App.jsx';

import Host from './Host';

export default function App() {
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [gameType, setGameType] = useState(null);
  const [loading, setLoading] = useState(false);

  const isHostView = window.location.pathname === '/host';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) signInAnonymously(auth);
      else setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleJoin = () => {
    if (!roomCode) return;
    setLoading(true);
    const code = roomCode.toUpperCase();
    onValue(ref(db, `rooms/${code}`), (snapshot) => {
      if (snapshot.exists()) {
        setGameType(snapshot.val().gameType);
        setRoomCode(code);
      } else {
        alert("Room not found!");
        setLoading(false);
      }
    });
  };

  if (isHostView) return <Host />;

  if (gameType) {
    const props = { code: roomCode, user: user };
    switch (gameType) {
      case 'stir-the-pot': return <StirThePot {...props} />;
      case 'dirty-laundry': return <DirtyLaundry {...props} />;
      case 'museum-of-modern-mistakes': return <Museum {...props} />;
      case 'heres-my-point-new': return <MyPoint {...props} />;
      default: return <div>Unknown game type</div>;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#121212', color: 'white' }}>
      <h1>BRANBOX CENTRAL</h1>
      <input 
        style={{ padding: '10px', fontSize: '1.5rem', textAlign: 'center' }}
        placeholder="ENTER CODE" 
        maxLength={4} 
        onChange={(e) => setRoomCode(e.target.value)} 
      />
      <button 
        style={{ marginTop: '20px', padding: '10px 40px', fontSize: '1.2rem', backgroundColor: '#00d4ff', border: 'none', cursor: 'pointer' }}
        onClick={handleJoin}
      >
        {loading ? "JOINING..." : "JOIN"}
      </button>
    </div>
  );
}
