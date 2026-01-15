import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';

// 1. IMPORT YOUR GAMES
// Note: We use the relative paths to the 'games' folder you uploaded
import StirThePot from '../games/stir-the-pot/src/App';
import DirtyLaundry from '../games/dirty-laundry/src/App';
import Museum from '../games/museum-of-modern-mistakes/src/App';
import MyPoint from '../games/heres-my-point-new/src/App';

// 2. IMPORT THE HOST COMPONENT
import Host from './Host';

function App() {
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [gameType, setGameType] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  // Determine if we are on the /host page or the main player page
  const isHostView = window.location.pathname === '/host';

  // 3. ANONYMOUS AUTH HANDSHAKE
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

  // 4. AUTO-DETECT LOGIC (The "Jackbox" Feel)
  const handleJoinRoom = () => {
    if (!roomCode) return alert("Please enter a code");
    
    setIsJoining(true);
    const code = roomCode.toUpperCase();
    const roomRef = ref(db, `rooms/${code}`);

    onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // This is the magic: it reads the gameType set by the Host
        setGameType(data.gameType);
        setRoomCode(code);
      } else {
        alert("Room not found! Ask the host for the 4-letter code.");
        setIsJoining(false);
      }
    });
  };

  // 5. RENDERING LOGIC

  // ROUTE A: The Host Screen (The TV)
  if (isHostView) {
    return <Host />;
  }

  // ROUTE B: The Active Game (The Phone after joining)
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
        return <div>Unknown game type detected.</div>;
    }
  }

  // ROUTE C: The Join Screen (The Default Home Page)
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>BRANBOX CENTRAL</h1>
      <div style={styles.card}>
        <input
          type="text"
          placeholder="ENTER 4-LETTER CODE"
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
      <p style={styles.footer}>Hosting a party? Go to <b>/host</b> on the big screen.</p>
    </div>
  );
}

// Simple styling to keep it clean
const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#1a1a1a', color: 'white', fontFamily: 'sans-serif' },
  title: { fontSize: '3rem', marginBottom: '20px', color: '#ffcc00' },
  card: { backgroundColor: '#333', padding: '40px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '20px' },
  input: { padding: '15px', fontSize: '1.5rem', textAlign: 'center', borderRadius: '5px', border: 'none', textTransform: 'uppercase' },
  button: { padding: '15px', fontSize: '1.2rem', backgroundColor: '#ffcc00', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  footer: { marginTop: '20px', fontSize: '0.9rem', opacity: 0.7 }
};

export default App;
