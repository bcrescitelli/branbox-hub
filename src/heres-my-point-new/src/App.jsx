import React, { useState, useEffect, useRef } from 'react';
// Import the shared database from your hub
import { firestore as db } from '../../firebaseConfig'; 
import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  serverTimestamp,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { 
  Mic2, 
  Users, 
  Trophy, 
  Monitor, 
  Smartphone, 
  Loader2, 
  AlertTriangle, 
  Swords, 
  MessageSquare, 
  RotateCcw, 
  ThumbsUp, 
  ThumbsDown,
  CheckCircle2
} from 'lucide-react';

// --- Constants & Data ---
const appId = 'heres-my-point-production';
const AUDIO_FILE_COUNT = 18; 
const MAX_HECKLES = 12;
const HECKLE_CHAR_LIMIT = 20;
const AUDIO_GAIN_VALUE = 1.0; 
const HECKLE_DURATION = 3000; 

const TOPICS = [
  "Is a hot dog a sandwich?", "Does a straw have one hole or two?", "Does pineapple belong on pizza?",
  "Is cereal a soup?", "Is a burrito a wrap?", "Is sparkling water good or does it taste like static?",
  "Should ketchup be kept in the fridge or the pantry?", "Is deep-dish pizza actually pizza or a casserole?",
  "Is a taco a sandwich?", "Should the milk go in before or after the cereal?", "Is cheesecake a cake or a pie?",
  "Is a Pop-Tart a ravioli?", "Is white chocolate actually chocolate?", "Should fries be eaten with your hands or a fork?",
  "Is a corn dog a popsicle?", "Is smooth peanut butter better than crunchy?", "Is iced coffee with melted ice still iced coffee?",
  "Is orange juice better with or without pulp?", "Do ice cubes belong in wine?", "Are boneless wings just chicken nuggets?",
  "Is a bagel just a bread donut?", "Should pizza be eaten tip-first or crust-first?", "Is a burger a sandwich?",
  "Is water wet?", "How many holes does a pair of pants have?", "Is Die Hard a Christmas movie?"
];

const ROUND_DETAILS = {
  1: {
    title: "Solo Standard",
    description: "Defend your prompt for exactly 30s. Don't look at the big screen timer!",
    icon: <Mic2 className="w-16 h-16 text-yellow-400" />
  },
  2: {
    title: "The Sneaky Word",
    description: "A secret word is 'Planted' by an audience member. Use it naturally for a 300pt bonus!",
    icon: <MessageSquare className="w-16 h-16 text-emerald-400" />
  },
  3: {
    title: "The Face-Off",
    description: "Random pairings. One topic. At 15s, SWITCH and defend the opposite side!",
    icon: <Swords className="w-16 h-16 text-pink-400" />
  }
};

const Confetti = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[...Array(50)].map((_, i) => (
      <div 
        key={i} 
        className="animate-confetti absolute w-2 h-2 rounded-full"
        style={{
          left: `${Math.random() * 100}%`,
          top: `-10px`,
          backgroundColor: ['#fbbf24', '#818cf8', '#f472b6', '#ffffff', '#4ade80'][i % 5],
          animationDelay: `${Math.random() * 4}s`,
          animationDuration: `${2 + Math.random() * 3}s`
        }}
      />
    ))}
  </div>
);

const calculatePoints = (duration) => {
  let score = Math.max(0, Math.floor(1000 - (Math.abs(30.0 - duration) * 100)));
  if (Math.abs(30.0 - duration) <= 0.2) score += 500;
  return score;
};

// --- Main App Logic ---
export default function App({ code, user, role: initialRole }) {
  const [role, setRole] = useState(initialRole || 'player');
  const [roomCode, setRoomCode] = useState(code);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [activeHeckle, setActiveHeckle] = useState(null);
  
  const lastHeckleIdRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const currentIntroSource = useRef(null);
  const heckleCooldownRef = useRef(false);

  // Audio Context Initialization
  const initAudioSystem = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = AUDIO_GAIN_VALUE;
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playWithGain = (path, loop = false) => {
    if (!audioContextRef.current) return null;
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    const trySource = (ext) => {
      return new Promise((resolve, reject) => {
        audio.src = `${path}.${ext}`;
        audio.oncanplaythrough = () => resolve();
        audio.onerror = reject;
        audio.load();
      });
    };
    const attemptPlay = async () => {
      try {
        try { await trySource('m4a'); } catch { await trySource('mp3'); }
        const source = audioContextRef.current.createMediaElementSource(audio);
        source.connect(gainNodeRef.current);
        audio.loop = loop;
        audio.play().catch(() => {});
        if (!loop) setTimeout(() => { audio.pause(); audio.src = ""; }, HECKLE_DURATION);
      } catch (err) { console.warn("Audio load failed:", path); }
    };
    attemptPlay();
    return audio;
  };

  // Lobby Music Logic
  useEffect(() => {
    if (role === 'host' && room?.status === 'LOBBY' && audioContextRef.current) {
      if (!currentIntroSource.current) currentIntroSource.current = playWithGain('/sounds/intro', true);
    } else if (currentIntroSource.current) {
      currentIntroSource.current.pause();
      currentIntroSource.current = null;
    }
  }, [role, room?.status]);

  // Data Sync
  useEffect(() => {
    if (!roomCode || !user) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const unsubRoom = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoom(data);
        if (data.lastHeckle?.id && data.lastHeckle.id !== lastHeckleIdRef.current) {
          lastHeckleIdRef.current = data.lastHeckle.id;
          setActiveHeckle(data.lastHeckle);
          if (role === 'host' && audioContextRef.current && !heckleCooldownRef.current) {
            heckleCooldownRef.current = true;
            const idx = Math.floor(Math.random() * AUDIO_FILE_COUNT) + 1;
            playWithGain(`/sounds/sound${idx}`);
            setTimeout(() => { heckleCooldownRef.current = false; }, 2500); 
          }
          setTimeout(() => setActiveHeckle(null), HECKLE_DURATION);
        }
      }
    }, (err) => console.error("Room listener error:", err));

    const playersRef = collection(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snap) => {
      setPlayers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    }, (err) => console.error("Players listener error:", err));

    return () => { unsubRoom(); unsubPlayers(); };
  }, [roomCode, user, role]);

  const startNextRound = async () => {
    if (!user || !room) return;
    const nextRound = (room.roundNum || 0) + 1;
    if (nextRound > 3) return updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'FINAL_PODIUM' });
    const shuffledIds = players.map(p => p.uid).sort(() => Math.random() - 0.5);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), {
      status: 'ROUND_INTRO', roundNum: nextRound, roundType: nextRound, turnIdx: 0, roundOrder: shuffledIds
    });
  };

  const setupTurn = async (forcedIdx = null) => {
    if (!user || !room?.roundOrder) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const roundType = room.roundType;
    const turnIdx = forcedIdx !== null ? forcedIdx : room.turnIdx || 0;
    const used = room.usedTopics || [];
    const available = TOPICS.filter(t => !used.includes(t));
    const topic = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : TOPICS[Math.floor(Math.random() * TOPICS.length)];

    let turnData = { 
      status: 'TOPIC_REVEAL', topic, usedTopics: arrayUnion(topic),
      plantUid: null, sneakyWord: null, opponentUid: null, prepCountdown: 10, votes: {},
      isSecondHalf: false, ghostOpponent: false, turnIdx
    };
    
    if (roundType < 3) {
      turnData.currentSpeakerUid = room.roundOrder[turnIdx];
      const others = players.filter(p => p.uid !== turnData.currentSpeakerUid);
      if (roundType === 2) turnData.plantUid = others[0]?.uid || user.uid;
    } else {
      turnData.currentSpeakerUid = room.roundOrder[turnIdx * 2];
      const secondId = room.roundOrder[turnIdx * 2 + 1];
      if (secondId) { turnData.opponentUid = secondId; } 
      else { 
        const ghost = players.find(p => p.uid !== turnData.currentSpeakerUid);
        turnData.opponentUid = ghost?.uid || user.uid;
        turnData.ghostOpponent = true;
      }
    }
    await updateDoc(roomRef, turnData);
  };

  const advanceGame = async () => {
    if (!user || !room?.roundOrder) return;
    const nextIdx = (room.turnIdx || 0) + 1;
    const limit = room.roundType === 3 ? Math.ceil(players.length / 2) : players.length;
    if (nextIdx >= limit) { await startNextRound(); } else { await setupTurn(nextIdx); }
  };

  const stopSpeaking = async (duration) => {
    if (!room || !user) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const scoreVal = calculatePoints(duration);
    const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', room.currentSpeakerUid);
    
    if (room.roundType === 3) {
      const split = Math.floor(scoreVal / 2);
      await updateDoc(pRef, { score: increment(split), lastTurnScore: split, lastTurnTime: duration });
      if (!room.ghostOpponent) {
        const opRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', room.opponentUid);
        await updateDoc(opRef, { score: increment(split) });
      }
      await updateDoc(roomRef, { status: 'VOTING_VIBE' });
    } else if (room.roundType === 2) {
      await updateDoc(pRef, { score: increment(scoreVal), lastTurnScore: scoreVal, lastTurnTime: duration });
      await updateDoc(roomRef, { status: 'VOTING_WORD' });
    } else {
      await updateDoc(pRef, { score: increment(scoreVal), lastTurnScore: scoreVal, lastTurnTime: duration });
      await updateDoc(roomRef, { status: 'RESULTS' });
    }
  };

  const restartGame = async () => {
    if (!roomCode) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { 
      status: 'LOBBY', roundNum: 0, turnIdx: 0, currentSpeakerUid: null, opponentUid: null, lastHeckle: null, usedTopics: []
    });
    for (const p of players) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', p.uid), { score: 0, hecklesLeft: MAX_HECKLES });
    }
  };

  const joinGame = async (e) => {
    if (e) e.preventDefault();
    initAudioSystem();
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players', user.uid), {
        uid: user.uid, name: (playerName || `Player ${user.uid.slice(0,3)}`).toUpperCase(), 
        score: 0, hecklesLeft: MAX_HECKLES, joinedAt: serverTimestamp()
      });
      setRole('player');
    } catch (err) { setError("Join failed."); }
  };

  if (!room) return <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center p-8 text-white uppercase"><Loader2 className="animate-spin mb-4" /><p className="uppercase text-xs font-black tracking-widest leading-none">Establishing Connection...</p></div>;

  return role === 'host' ? (
    <HostView 
      room={room} players={players} roomCode={roomCode} 
      startSpeaking={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'SPEAKING', startTime: Date.now() })} 
      activeHeckle={activeHeckle} restartGame={restartGame} 
    />
  ) : (
    <PlayerView room={room} players={players} user={user} stopSpeaking={stopSpeaking} setupTurn={setupTurn} advanceGame={advanceGame} startNextRound={startNextRound} joinRoom={joinGame} playerName={playerName} setPlayerName={setPlayerName} roomCode={roomCode} />
  );
}

// --- Host Components ---
function HostView({ room, players, roomCode, startSpeaking, activeHeckle, restartGame }) {
  const [speakTime, setSpeakTime] = useState(0);

  useEffect(() => {
    let timer;
    const isTopicScreen = room?.status === 'TOPIC_REVEAL';
    const isR2Ready = room?.roundType !== 2 || room?.sneakyWord;
    if (isTopicScreen && isR2Ready && room.prepCountdown > 0) {
      timer = setInterval(() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { prepCountdown: room.prepCountdown - 1 }), 1000);
    } else if (isTopicScreen && isR2Ready && room.prepCountdown === 0) startSpeaking();
    return () => clearInterval(timer);
  }, [room?.status, room?.prepCountdown, room?.sneakyWord]);

  useEffect(() => {
    let speakTimer;
    if (room?.status === 'SPEAKING') {
      speakTimer = setInterval(() => {
        const diff = (Date.now() - room.startTime) / 1000; setSpeakTime(diff);
        if (room.roundType === 3 && diff >= 15 && !room.isSecondHalf) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { isSecondHalf: true });
      }, 100);
    } else setSpeakTime(0);
    return () => clearInterval(speakTimer);
  }, [room?.status]);

  if (!room) return null;

  const speaker = players.find(p => p.uid === room.currentSpeakerUid);
  const opponent = players.find(p => p.uid === room.opponentUid);
  const sortedWinners = [...players].sort((a,b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-indigo-950 text-white flex flex-col font-sans overflow-hidden select-none uppercase leading-none">
      <div className="p-6 md:p-8 bg-indigo-900 flex justify-between items-center border-b-4 border-black/20 shadow-2xl shrink-0 z-20">
        <h1 className="text-3xl md:text-4xl font-black italic text-yellow-400 tracking-tighter leading-none">HERE'S MY POINT!</h1>
        <div className="flex items-center gap-4 md:gap-6 overflow-hidden">
          <div className="px-4 md:px-6 py-2 bg-indigo-950 rounded-full border-2 border-indigo-700 shadow-inner flex items-center shrink-0 leading-none"><span className="text-indigo-400 font-bold uppercase text-[10px] mr-2 tracking-widest hidden sm:inline">Room Code:</span><span className="text-xl md:text-2xl font-black text-white">{roomCode}</span></div>
          <div className="bg-indigo-800 px-4 py-2 rounded-lg border border-white/10 text-indigo-100 font-bold text-[10px] shrink-0 whitespace-nowrap leading-none">{room.roundNum > 0 ? `Round ${room.roundNum}/3` : 'Lobby'}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative text-center overflow-hidden">
        {room.status === 'LOBBY' && (
          <div className="space-y-12 max-w-4xl animate-in zoom-in w-full">
             <h2 className="text-6xl md:text-8xl font-black relative leading-[0.9]">Waiting for<br/><span className="text-yellow-400 italic">Opinionators</span></h2>
             <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-h-[250px] overflow-y-auto p-4 scrollbar-hide">
               {players.map((p, i) => (<div key={p.uid} className="bg-indigo-800 px-6 md:px-8 py-3 md:py-4 rounded-2xl border-b-4 border-indigo-950 font-black text-xl md:text-2xl animate-bounce shadow-lg leading-none" style={{ animationDelay: `${i*100}ms` }}>{p.name}</div>))}
             </div>
          </div>
        )}

        {room.status === 'ROUND_INTRO' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-700 max-w-3xl w-full leading-none">
            <div className="flex justify-center mb-6 drop-shadow-2xl leading-none">{ROUND_DETAILS[room.roundType].icon}</div>
            <h2 className="text-6xl md:text-8xl font-black italic text-white leading-none uppercase">{ROUND_DETAILS[room.roundType].title}</h2>
            <div className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-[3rem] backdrop-blur-md shadow-2xl leading-none uppercase">
              <p className="text-xl md:text-2xl text-indigo-100 font-medium leading-tight uppercase leading-none">{ROUND_DETAILS[room.roundType].description}</p>
            </div>
          </div>
        )}

        {room.status === 'TOPIC_REVEAL' && (
          <div className="space-y-12 animate-in zoom-in duration-500 w-full max-w-5xl overflow-hidden leading-none">
            <div className="space-y-4 leading-none uppercase"><p className="text-yellow-400 font-black uppercase tracking-[0.3em] text-xs italic leading-none">The Controversy</p><h2 className="text-5xl md:text-8xl font-black italic leading-tight text-white drop-shadow-lg break-words leading-none uppercase">"{room.topic}"</h2></div>
            <div className="flex justify-center gap-8 md:gap-16 items-center flex-wrap leading-none uppercase">
              <div className="space-y-2 uppercase"><p className="text-indigo-400 uppercase font-black text-[10px] tracking-widest leading-none">Active Player</p><div className="text-3xl md:text-5xl font-black text-white uppercase leading-none">{speaker?.name}</div></div>
              {room.roundType === 3 && (<><Swords className="w-8 h-8 md:w-12 md:h-12 text-pink-500 animate-pulse leading-none" /><div className="space-y-2 leading-none uppercase"><p className="text-indigo-400 uppercase font-black text-[10px] tracking-widest leading-none">Opponent</p><div className="text-3xl md:text-5xl font-black text-white uppercase leading-none">{opponent?.name}</div></div></>)}
            </div>
            <div className="flex flex-col items-center gap-6 leading-none">
               {room.roundType === 2 && !room.sneakyWord ? (<div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-8 rounded-[2rem] animate-pulse leading-none uppercase"><p className="text-emerald-400 font-black uppercase text-xl italic leading-none">The Plant is Sabotaging...</p></div>) : (<div className="relative group leading-none"><div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-10 animate-pulse leading-none uppercase"></div><div className="relative bg-indigo-900/50 px-12 py-8 rounded-[3rem] border-2 border-indigo-700 flex flex-col items-center leading-none uppercase"><p className="text-indigo-400 font-black uppercase text-[10px] mb-2 tracking-[0.3em] leading-none uppercase">Preparation Clock</p><p className="text-8xl font-black text-white tabular-nums drop-shadow-glow leading-none uppercase">{room.prepCountdown}</p></div></div>)}
            </div>
          </div>
        )}

        {room.status === 'SPEAKING' && (
          <div className="space-y-12 w-full max-w-6xl animate-in fade-in leading-none uppercase">
            <div className={`text-6xl md:text-9xl font-black italic mb-20 drop-shadow-2xl break-words px-4 leading-none uppercase ${room.isSecondHalf ? 'text-pink-500 scale-105' : 'text-white'}`}>{room.topic}</div>
            <div className="flex flex-col items-center gap-12 leading-none">
              <div className="relative w-56 h-56 md:w-72 md:h-72 flex items-center justify-center leading-none uppercase"><div className="absolute inset-0 border-8 border-indigo-800 rounded-full"></div><Mic2 className="w-16 h-16 md:w-24 md:h-24 text-yellow-400 drop-shadow-glow leading-none" /></div>
              <div className="text-3xl md:text-4xl font-black uppercase text-indigo-400 tracking-widest h-20 leading-none uppercase">{room.roundType === 3 && speakTime >= 14 && speakTime <= 16 ? <span className="text-pink-500 animate-bounce block text-8xl">SWITCH!</span> : "Internal Clock Active"}</div>
            </div>
          </div>
        )}

        {room.status === 'VOTING_WORD' && (
           <div className="space-y-12 animate-in zoom-in w-full max-w-4xl leading-none uppercase">
              <h2 className="text-7xl font-black uppercase italic tracking-tighter text-emerald-400 leading-none uppercase">Sneaky Check!</h2>
              <div className="bg-indigo-900 p-12 rounded-[3rem] border-4 border-emerald-600 shadow-2xl space-y-6 leading-none uppercase"><p className="text-indigo-300 uppercase font-black tracking-widest leading-none uppercase">Secret Word Was:</p><h3 className="text-8xl font-black text-white uppercase italic tracking-tighter leading-none uppercase">"{room.sneakyWord}"</h3><p className="text-2xl text-white leading-none uppercase">Audience: Did they slip it in naturally?</p></div>
           </div>
        )}

        {room.status === 'RESULTS' && (
          <div className="space-y-12 animate-in zoom-in w-full overflow-hidden text-center leading-none uppercase">
             <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-none uppercase">The Scoring</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto px-4 text-center leading-none uppercase">
                <div className="bg-indigo-900/50 p-10 md:p-16 rounded-[3rem] border-2 border-white/10 shadow-2xl overflow-hidden text-center leading-none uppercase"><p className="text-indigo-400 font-black uppercase text-xl md:text-2xl tracking-widest mb-4 leading-none uppercase">Final Time</p><p className="text-[6rem] md:text-[10rem] font-black text-yellow-400 leading-none uppercase">{(speaker?.lastTurnTime || 0).toFixed(2)}s</p></div>
                <div className="bg-indigo-900/50 p-10 md:p-16 rounded-[3rem] border-2 border-white/10 shadow-2xl overflow-hidden text-center leading-none uppercase"><p className="text-indigo-400 font-black uppercase text-xl md:text-2xl tracking-widest mb-4 leading-none uppercase">Points Gained</p><p className="text-[6rem] md:text-[10rem] font-black text-white leading-none uppercase">+{speaker?.lastTurnScore || 0}</p></div>
             </div>
          </div>
        )}

        {room.status === 'FINAL_PODIUM' && (
           <div className="space-y-12 animate-in slide-in-from-bottom-20 duration-1000 w-full max-w-4xl px-4 overflow-hidden relative text-center leading-none uppercase">
              <Confetti />
              <Trophy className="w-32 h-32 md:w-48 md:h-48 text-yellow-400 mx-auto animate-bounce relative z-10 drop-shadow-glow leading-none uppercase" />
              <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-none uppercase">The Winners</h2>
              <div className="grid gap-4 mt-12 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide leading-none uppercase">{sortedWinners.slice(0, 3).map((p, i) => (<div key={p.uid} className={`flex items-center justify-between p-6 md:p-8 rounded-[2.5rem] border-4 backdrop-blur-md shadow-2xl ${i === 0 ? 'bg-yellow-400 text-indigo-950 border-white/50 scale-105' : 'bg-indigo-900 text-white border-indigo-700 opacity-80'} leading-none uppercase`}><div className="flex items-center gap-6 leading-none uppercase"><span className="text-4xl md:text-6xl font-black italic opacity-40 leading-none uppercase">#{i+1}</span><span className="text-3xl md:text-5xl font-black uppercase tracking-tighter truncate max-w-[200px] leading-none uppercase">{p.name}</span></div><div className="text-right leading-none uppercase"><span className="text-3xl md:text-5xl font-black leading-none uppercase">{p.score}</span><span className="text-[10px] uppercase font-black block tracking-widest leading-none uppercase">Points</span></div></div>))}</div>
              <button onClick={restartGame} className="bg-indigo-600 px-12 py-5 rounded-2xl font-black text-xl md:text-2xl uppercase flex items-center gap-3 shadow-xl active:scale-95 mx-auto mt-8 leading-none uppercase"><RotateCcw className="w-6 h-6 leading-none uppercase" /> Replay Show</button>
           </div>
        )}
      </div>

      <div className="bg-indigo-900 p-6 md:p-8 flex justify-center flex-wrap gap-4 md:gap-8 border-t-4 border-black/20 shadow-2xl max-h-[140px] overflow-hidden shrink-0 leading-none uppercase">
        {players.sort((a,b) => b.score - a.score).map((p, i) => (<div key={p.uid} className="flex items-center gap-4 bg-indigo-950/50 px-5 md:px-6 py-3 rounded-2xl border-2 border-indigo-700 shadow-inner group transition-all leading-none uppercase"><div className="font-black text-indigo-500 text-2xl italic group-hover:text-yellow-400 leading-none uppercase">#{i+1}</div><div className="text-left leading-tight leading-none uppercase"><p className="font-black uppercase text-[10px] md:text-xs tracking-tighter truncate max-w-[80px] text-indigo-100 uppercase leading-none">{p.name}</p><p className="font-black text-yellow-400 text-xl md:text-2xl leading-none mt-1 leading-none uppercase">{p.score}</p></div></div>))}
      </div>
    </div>
  );
}

// --- Player View ---
function PlayerView({ room, players, user, stopSpeaking, setupTurn, advanceGame, startNextRound, joinRoom, playerName, setPlayerName, roomCode }) {
  const [sneakyInput, setSneakyInput] = useState('');
  const [customHeckle, setCustomHeckle] = useState('');
  const [localVote, setLocalVote] = useState(null);
  
  const me = players.find(p => p.uid === user?.uid);
  const isSpeaker = room?.currentSpeakerUid === user?.uid;
  const isOpponent = room?.opponentUid === user?.uid;
  const isPlant = room?.plantUid === user?.uid;

  const sortedByJoined = [...players].sort((a, b) => (a.joinedAt?.seconds || 0) - (b.joinedAt?.seconds || 0));
  const isLeader = sortedByJoined.length > 0 && sortedByJoined[0]?.uid === user?.uid;

  useEffect(() => {
    setLocalVote(null);
  }, [room?.status, room?.currentSpeakerUid]);

  const handleContinue = async () => {
    if (!room) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code);
    
    if (room.status === 'ROUND_INTRO' && isLeader) {
       setupTurn();
    } else if (room.status === 'VOTING_WORD' && (isSpeaker || isLeader)) {
       const votes = Object.values(room.votes || {});
       const yes = votes.filter(v => v === 'YES').length;
       const no = votes.filter(v => v === 'NO').length;
       if (yes > no) {
          const winRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code, 'players', room.currentSpeakerUid);
          await updateDoc(winRef, { score: increment(300), lastTurnScore: increment(300) });
       }
       updateDoc(roomRef, { status: 'RESULTS' });
    } else if (room.status === 'VOTING_VIBE' && (isSpeaker || isOpponent || isLeader)) {
       const votes = Object.values(room.votes || {});
       const sV = votes.filter(v => v === room.currentSpeakerUid).length;
       const oV = votes.filter(v => v === room.opponentUid).length;
       const winnerId = sV >= oV ? room.currentSpeakerUid : room.opponentUid;
       const winRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code, 'players', winnerId);
       await updateDoc(winRef, { score: increment(500) });
       updateDoc(roomRef, { status: 'RESULTS' });
    } else if (room.status === 'RESULTS' && (isSpeaker || isOpponent || isLeader)) {
       advanceGame();
    }
  };

  const castVote = (val) => {
    if (isSpeaker) return;
    setLocalVote(val);
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { [`votes.${user.uid}`]: val });
  };

  if (!me) {
    return (
      <div className="min-h-screen bg-indigo-950 text-white flex flex-col items-center justify-center p-8 font-sans overflow-hidden uppercase leading-none">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500 uppercase leading-none">
          <h2 className="text-4xl font-black italic text-yellow-400">JOIN THE DEBATE</h2>
          <form onSubmit={joinRoom} className="space-y-4 leading-none uppercase">
            <input type="text" placeholder="YOUR NAME" className="w-full bg-indigo-900 p-5 rounded-2xl font-bold border-2 border-indigo-800 focus:outline-none focus:border-indigo-400 text-indigo-100 uppercase leading-none" value={playerName} onChange={e => setPlayerName(e.target.value)} />
            <button type="submit" className="w-full bg-yellow-400 text-indigo-950 py-6 rounded-[2rem] font-black text-2xl uppercase shadow-lg hover:bg-yellow-300 active:scale-95 leading-none">ENTER LOBBY</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-indigo-950 text-white flex flex-col font-sans touch-none select-none overflow-hidden max-w-full uppercase leading-none">
       <div className="p-4 bg-indigo-900 flex justify-between items-center border-b-2 border-black/20 shadow-md shrink-0 leading-none">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-indigo-950 font-black">{me?.name?.charAt(0) || '?'}</div><span className="font-black text-sm truncate max-w-[100px]">{me?.name}</span></div>
          <div className="text-right"><p className="text-[10px] font-black text-indigo-400 mb-1">Score</p><p className="text-lg font-black text-yellow-400 tabular-nums">{me?.score || 0}</p></div>
       </div>

       <div className="flex-1 flex flex-col p-6 overflow-y-auto leading-none uppercase">
          {room.status === 'LOBBY' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 leading-none">
              <Users className="w-20 h-20 text-indigo-400 animate-pulse" />
              <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none text-white">READY!</h2>
              {isLeader && players.length >= 2 && <button onClick={startNextRound} className="w-full bg-yellow-400 text-indigo-950 py-10 rounded-[3rem] font-black text-4xl shadow-2xl active:scale-95 animate-bounce mt-4 leading-none">EVERYONE'S IN!</button>}
            </div>
          )}

          {room.status === 'ROUND_INTRO' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center animate-in zoom-in leading-none">
              <div className="bg-indigo-900 p-8 rounded-[2.5rem] border-2 border-indigo-800 shadow-xl w-full">
                <h3 className="text-4xl font-black italic mb-3 text-yellow-400 uppercase tracking-tighter">{ROUND_DETAILS[room.roundType].title}</h3>
                <p className="text-indigo-200 text-xs leading-relaxed opacity-70 italic">Rules are on the big screen!</p>
              </div>
              {isLeader && <button onClick={handleContinue} className="w-full bg-white text-indigo-950 py-8 rounded-[2rem] font-black text-2xl shadow-xl active:scale-95 leading-none">PICK PROMPT</button>}
            </div>
          )}
          
          {room.status === 'TOPIC_REVEAL' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-10 text-center max-w-full leading-none">
              {(isSpeaker || (isOpponent && room.roundType === 3)) ? (
                <>
                  <div className="bg-yellow-400 text-indigo-950 px-8 py-2 rounded-full font-black uppercase text-[10px] tracking-widest animate-bounce">Your Turn!</div>
                  <h2 className="text-3xl font-black italic text-white leading-tight break-words max-w-full">"{room.topic}"</h2>
                  {room.roundType === 2 && room.sneakyWord && <div className="bg-emerald-500/20 p-6 rounded-2xl border-2 border-emerald-500/30 font-black text-xl text-emerald-400">Sneaky Word: {room.sneakyWord}</div>}
                  {isSpeaker && <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { prepCountdown: 0 })} className="w-full bg-white text-indigo-950 py-10 rounded-[2.5rem] font-black text-4xl uppercase shadow-xl active:scale-95 transition-all leading-none">READY!</button>}
                </>
              ) : isPlant && !room.sneakyWord ? (
                <>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-emerald-400">You are The Plant!</h2>
                  <input type="text" maxLength={HECKLE_CHAR_LIMIT} className="w-full bg-indigo-900 p-6 rounded-2xl border-4 border-indigo-800 font-black text-3xl text-center focus:border-emerald-500 text-white outline-none" value={sneakyInput} onChange={e => setSneakyInput(e.target.value)} />
                  <button onClick={() => { if (!sneakyInput) return; updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { sneakyWord: sneakyInput.toUpperCase() }); setSneakyInput(''); }} className="w-full bg-emerald-500 text-indigo-950 py-6 rounded-[2rem] font-black text-2xl uppercase shadow-lg active:scale-95 leading-none">Sabotage!</button>
                </>
              ) : <div className="bg-indigo-900/50 p-10 rounded-[2rem] border border-white/5 w-full text-center"><p className="text-xl font-black uppercase text-indigo-400 tracking-widest animate-pulse">Wait for Setup...</p></div>}
            </div>
          )}

          {room.status === 'SPEAKING' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-12">
               {(isSpeaker || isOpponent) ? (
                 <>
                   <h2 className="text-5xl font-black italic uppercase tracking-tighter">{(isOpponent && !room.isSecondHalf) ? 'ON DECK...' : (isSpeaker && room.isSecondHalf) ? 'WAIT...' : 'DEFEND!'}</h2>
                   <div className="w-64 h-64 rounded-full border-[16px] border-indigo-900 flex items-center justify-center relative bg-indigo-950">
                      <Mic2 className={`w-20 h-20 text-yellow-400 ${((isSpeaker && !room.isSecondHalf) || (isOpponent && room.isSecondHalf)) ? 'opacity-100 animate-pulse' : 'opacity-10'}`} />
                   </div>
                   {((room.roundType !== 3 && isSpeaker) || (room.roundType === 3 && isOpponent && room.isSecondHalf)) && (<button onClick={() => stopSpeaking((Date.now() - room.startTime) / 1000)} className="w-full bg-red-500 py-12 rounded-[3rem] font-black text-5xl uppercase tracking-tighter shadow-[0_12px_0_rgb(150,0,0)] active:translate-y-3 leading-none">STOP!</button>)}
                 </>
               ) : (
                 <form onSubmit={e => { e.preventDefault(); if (!customHeckle || (me?.hecklesLeft || 0) <= 0) return; updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code, 'players', user.uid), { hecklesLeft: increment(-1) }); updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { lastHeckle: { id: Math.random().toString(), text: customHeckle.toUpperCase(), sender: me.name } }); setCustomHeckle(''); }} className="w-full space-y-4">
                    <input type="text" placeholder="TYPE A HECKLE..." maxLength={HECKLE_CHAR_LIMIT} className="w-full bg-indigo-900 p-6 rounded-[2rem] border-4 border-indigo-800 font-black text-2xl text-center focus:border-red-500 text-white outline-none" value={customHeckle} onChange={e => setCustomHeckle(e.target.value)} />
                    <button type="submit" disabled={(me?.hecklesLeft || 0) <= 0 || !customHeckle} className="w-full bg-red-500 text-white p-7 rounded-[2rem] border-b-8 border-red-900 font-black uppercase text-3xl shadow-xl disabled:opacity-10 leading-none">FIRE!</button>
                 </form>
               )}
            </div>
          )}

          {room.status === 'VOTING_WORD' && (
             <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                <h2 className="text-4xl font-black uppercase text-emerald-400 italic">Word Check!</h2>
                {!isSpeaker && !localVote ? (
                  <div className="grid grid-cols-2 gap-4 w-full"><button onClick={() => castVote('YES')} className="bg-emerald-500 p-10 rounded-[2rem] shadow-xl"><ThumbsUp className="w-12 h-12 mx-auto" /></button><button onClick={() => castVote('NO')} className="bg-red-500 p-10 rounded-[2rem] shadow-xl"><ThumbsDown className="w-12 h-12 mx-auto" /></button></div>
                ) : <div className="flex flex-col items-center gap-4 text-emerald-400 font-black animate-pulse"><CheckCircle2 className="w-12 h-12" /><p>Vote Recorded!</p></div>}
                {(isSpeaker || isLeader) && <button onClick={handleContinue} className="w-full bg-white text-indigo-950 py-6 rounded-[2rem] font-black text-xl">TALLY VOTES</button>}
             </div>
          )}

          {room.status === 'RESULTS' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in leading-none">
              <Trophy className="w-24 h-24 text-yellow-400 animate-bounce" />
              <h2 className="text-5xl font-black italic tracking-tighter text-center">TURN FINISHED</h2>
              {(isSpeaker || isLeader) && <button onClick={handleContinue} className="w-full bg-yellow-400 text-indigo-950 py-10 rounded-[3rem] font-black text-4xl shadow-2xl animate-pulse leading-none">CONTINUE SHOW</button>}
            </div>
          )}
       </div>
    </div>
  );
}