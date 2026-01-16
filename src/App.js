import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';

// UPDATED PATHS: Now looking inside the same 'src' folder
import StirThePot from './stir-the-pot/src/App.jsx';
import DirtyLaundry from './dirty-laundry/src/App.jsx';
import Museum from './museum-of-modern-mistakes/src/App.jsx';
import MyPoint from './heres-my-point-new/src/App.jsx';

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
        const data = snapshot.val();
        setGameType(data.gameType);
        setRoomCode(code);
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
      default: return <div style={{color: 'white'}}>Game "{gameType}" not recognized.</div>;
    }
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '100px', color: 'white', backgroundColor: 'black', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 style={{ color: '#00d4ff', fontSize: '3rem' }}>BRANBOX CENTRAL</h1>
      <div style={{ background: '#1e1e1e', padding: '40px', borderRadius: '20px' }}>
        <input 
          style={{ padding: '15px', fontSize: '1.2rem', textAlign: 'center' }} 
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())} 
          placeholder="ENTER CODE" 
          maxLength={4}
        />
        <br /><br />
        <button 
          style={{ padding: '15px 40px', fontSize: '1.2rem', backgroundColor: '#00d4ff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }} 
          onClick={handleJoin}
        >
          JOIN GAME
        </button>
      </div>
    </div>
  );
}