import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';

// 1. UPDATED IMPORTS (Pointing to the root folders)
// We go up one level (..) out of the 'src' folder, then into each game's folder.
import StirThePot from '../stir-the-pot/src/App.jsx';
import DirtyLaundry from '../dirty-laundry/src/App.jsx';
import Museum from '../museum-of-modern-mistakes/src/App.jsx';
import MyPoint from '../heres-my-point-new/src/App.jsx';

// 2. IMPORT THE HOST COMPONENT
import Host from './Host';

function App() {
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [gameType, setGameType] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  // Checks if the user is visiting the /host URL
  const isHostView = window.location.pathname === '/host';

  // 3. ANONYMOUS AUTH HANDSHAKE
  // This gives every player a unique ID so they don't lose progress if they refresh.
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

  // 4. THE AUTO-DETECT LOGIC
  // When a player enters a code, it looks up which game the host started.
  const handleJoinRoom = () => {
    if (!roomCode) return alert("Please enter a code");
    
    setIsJoining(true);
    const code = roomCode.toUpperCase();
    const roomRef = ref(db, `rooms/${code}`);

    onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setGameType(data.gameType);
        setRoomCode(code);
      } else {
        alert("Room not found! Ask the host for the 4-letter code.");
        setIsJoining(false);
      }
    });
  };

  // 5. RENDERING (The Router)

  // PATH A: The Host Screen (The Big Screen/TV)
  if (isHostView) {
    return <Host />;
  }

  // PATH B: The Active Game (The Phone)
  // Once the code is detected, it renders the specific game component.
  if (gameType) {
    switch (gameType) {
      case 'stir-the-pot':
        return <StirThePot code={roomCode} user={user} />;
      case 'dirty-laundry':
        return <DirtyLaundry code={roomCode} user={user} />;
      case 'museum':
        return <Museum code={roomCode} user={user} />;
      case 'my-point':
        return <MyPoint code={roomCode} user={user} />;
      default:
        return <div>Oops! Game type "{gameType}" not recognized.</div>;
    }
  }

  // PATH C: The Main Join Screen (Default)
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
        <button 
          onClick={handleJoinRoom} 
          disabled={isJoining}
          style={styles.button}
        >
          {isJoining ? "JOINING..." : "JOIN GAME"}
        </button>
      </div>
      <p style={styles.footer}>Hosting? Go to <b>/host</b> on the big screen.</p>
    </div>
  );
}

// Minimalist styling for the lobby
const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#121212', color: 'white', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
  title: { fontSize: '3.5rem', marginBottom: '30px', fontWeight: '900', letterSpacing: '2px', color: '#00d4ff' },
  card: { backgroundColor: '#1e1e1e', padding: '50px', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid #333' },
  input: { padding: '15px', fontSize: '1.8rem', textAlign: 'center', borderRadius: '10px', border: '2px solid #333', backgroundColor: '#000', color: '#fff', outline: 'none' },
  button: { padding: '15px', fontSize: '1.4rem', backgroundColor: '#00d4ff', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: 'transform 0.2s' },
  footer: { marginTop: '30px', fontSize: '1rem', opacity: 0.5 }
};

export default App;
