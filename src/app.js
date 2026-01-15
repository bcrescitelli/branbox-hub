import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';

// 1. DYNAMIC IMPORTS
// These match your GitHub folder names exactly. 
// If your App.jsx is NOT inside a 'src' folder, remove the '/src' from these paths.
import StirThePot from '../stir-the-pot/src/App.jsx';
import DirtyLaundry from '../dirty-laundry/src/App.jsx';
import Museum from '../museum-of-modern-mistakes/src/App.jsx';
import MyPoint from '../heres-my-point-new/src/App.jsx';

import Host from './Host';

function App() {
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [gameType, setGameType] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  const isHostView = window.location.pathname === '/host';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        signInAnonymously(auth);
      } else {
        setUser(u);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleJoinRoom = () => {
    if (!roomCode) return alert("Please enter a code");
    
    setIsJoining(true);
    const code = roomCode.toUpperCase();
    const roomRef = ref(db, `rooms/${code}`);

    onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // The Host.js sets this value (e.g., 'stir-the-pot')
        setGameType(data.gameType);
        setRoomCode(code);
      } else {
        alert("Room not found! Ensure the host has started the game.");
        setIsJoining(false);
      }
    });
  };

  // --- ROUTING LOGIC ---

  if (isHostView) {
    return <Host />;
  }

  if (gameType) {
    switch (gameType) {
      case 'stir-the-pot':
        return <StirThePot code={roomCode} user={user} />;
      case 'dirty-laundry':
        return <DirtyLaundry code={roomCode} user={user} />;
      case 'museum-of-modern-mistakes': // Updated to match folder name for consistency
        return <Museum code={roomCode} user={user} />;
      case 'heres-my-point-new': // Updated to match folder name for consistency
        return <MyPoint code={roomCode} user={user} />;
      default:
        return <div>Game type "{gameType}" not recognized.</div>;
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>BRANBOX CENTRAL</h1>
      <div style={styles.card}>
        <input
          type="text"
          placeholder="ENTER CODE"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength={4}
          style={styles.input}
        />
        <button onClick={handleJoinRoom} disabled={isJoining} style={styles.button}>
          {isJoining ? "JOINING..." : "JOIN GAME"}
        </button>
      </div>
      <p style={styles.footer}>Hosting? Go to <b>/host</b> on the big screen.</p>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#121212', color: 'white', fontFamily: 'sans-serif' },
  title: { fontSize: '3rem', marginBottom: '30px', color: '#00d4ff', fontWeight: 'bold' },
  card: { backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid #333' },
  input: { padding: '15px', fontSize: '1.5rem', textAlign: 'center', borderRadius: '10px', border: 'none' },
  button: { padding: '15px', fontSize: '1.2rem', backgroundColor: '#00d4ff', color: 'black', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  footer: { marginTop: '20px', opacity: 0.6 }
};

export default App;
