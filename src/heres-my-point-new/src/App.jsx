import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
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
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Mic2, 
  Users, 
  Trophy, 
  Megaphone, 
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

// --- Firebase Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyDWQWZdm-tGIQ1kxZLqr9gcAA4EY85MXx8", 
      authDomain: "heres-my-point.firebaseapp.com",
      projectId: "heres-my-point",
      storageBucket: "heres-my-point.firebasestorage.app",
      messagingSenderId: "979742060620",
      appId: "1:979742060620:web:67c625cb61c0728dffc4e9"
    };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'heres-my-point-production';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants & Data ---
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
  "Is putting ketchup on steak acceptable or a crime?", "Is water wet?", "How many holes does a pair of pants have?",
  "Is a thumb a finger?", "Is 2-in-1 shampoo and conditioner a scam?", "Is the letter 'Y' a vowel or a consonant?",
  "Is a square a rectangle?", "If you replace every part of a boat, is it still the same boat?",
  "Is The Nightmare Before Christmas a Halloween or Christmas movie?", "Is the 'S' or the 'C' in 'Scent' silent?",
  "Is zero a number or just a placeholder?", "Does 'bi-weekly' mean twice a week or every two weeks?",
  "Is a tomato a fruit or a vegetable?", "Is it okay to wear socks with sandals?", "Should you make your bed every single day?",
  "Is it pronounced 'Gif' or 'Jif'?", "Is a nap a sign of health or laziness?", "Should toilet paper hang over or under the roll?",
  "Is Die Hard a Christmas movie?", "How many times can you wear jeans before washing them?",
  "Is a morning shower or a night shower better?", "Is it weird to go to the cinema alone?",
  "Should you peel a banana from the stem or the bottom?", "Are cargo shorts stylish or ugly?",
  "Is it called 'Soda' or 'Pop'?", "Is it pronounced 'Day-ta' or 'Dah-ta'?", "Should you tip for a takeout order?",
  "Is ghosting after one date ever okay?", "Are e-books 'real' books?", "Is being 'on time' early or exactly at the minute?",
  "Should 'unlimited' data be truly unlimited?", "Do phones belong at the dinner table?", "Is clapping when a plane lands nice or cringe?",
  "Were Ross and Rachel 'on a break'?", "Is Shrek the best animated movie ever?", "Are the Star Wars prequels actually good?",
  "Is Batman a superhero if he has no powers?", "Is reality TV real or scripted?", "Is the book always better than the movie?",
  "Is Harry Potter better than Lord of the Rings?", "Are Marvel movies 'cinema'?", "Is Taylor Swift the best songwriter of her generation?",
  "Is The Office US better than The Office UK?", "How long should you wait before posting spoilers?",
  "Is TikTok ruining or helping the music industry?", "Is binge-watching better than weekly episode releases?",
  "Is Mario or Luigi the better brother?", "Is anime just cartoons?", "What is the rudest animal in the world?",
  "Are cats better than dogs?", "Is a zebra white with black stripes or black with white stripes?",
  "Are spiders cute or terrifying?", "Is a fish a pet or a decoration?", "If a dog wore pants, would they cover two legs or four?",
  "Are pigeons cool birds or rats with wings?", "Is keeping a bird in a cage cruel?", "Which is the better pet: a dragon or a unicorn?",
  "Should Pluto be a planet?", "Was the color 'orange' named after the fruit?", "Is it a couch or a sofa?",
  "Is the glass half full or half empty?", "Is luck real or just math?", "Should the penny be abolished?",
  "Is it a napkin or a serviette?", "Is 'Y' yhe best plural pronoun?", "Is it a remote or a clicker?",
  "Is it 'Math' or 'Maths'?", "Is super strength or flight the better superpower?", "Is clipping your nails in public a crime?",
  "Is breakfast actually the most important meal of the day?", "Is wearing pajamas in public acceptable?",
  "Do 'hot takes' games cause too much drama?", "Is Apple better than Android?", "Is winter or summer the best season?",
  "Is washing dishes by hand better than using a dishwasher?", "Are video games a form of art?",
  "Is the ocean better than the mountains?", "Is dark mode or light mode superior?",
  "Is it better to have a window seat or an aisle seat on a plane?", "Should you listen to Christmas music before December?",
  "Is it acceptable to wear pajamas on a flight?", "Is it better to stay up late or wake up early?",
  "Is it okay to go to sleep with the TV on?", "Is it better to be the driver or the passenger on a long road trip?",
  "Should you always take your shoes off when entering someone’s house?", "Should you tell someone they have food in their teeth if you just met them?",
  "Should you brush your teeth before or after your morning coffee or tea?", "Is it okay to listen to music without headphones in public?",
  "Should the person who didn't cook always do the dishes?", "Is it better to live in a city or the countryside?",
  "Should you be allowed to recline your seat on a short flight?", "Is it okay to wear a hat inside a restaurant?",
  "Should you wash new clothes before you wear them for the first time?", "Should you pay for a first date or split the bill?",
  "Is it better to travel to a new place or return to a favorite one?", "Is it okay to stay in your 'outside clothes' on the bed?",
  "Should you finish a movie even if you aren't enjoying it?", "Is it better to be overdressed or underdressed for an event?",
  "Is it better to have a lot of friends or a few close ones?", "Is it better to receive a text or a phone call?",
  "Is it better to be the first one at a party or the last to leave?", "Should you let your pet sleep in the bed with you?"
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
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [roomCode, setRoomCode] = useState('');
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

  // Authentication Sequence
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else { await signInAnonymously(auth); }
      } catch (err) { setError("Failed to sync with game engine."); } 
      finally { setAuthLoading(false); }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

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
      } else if (role === 'player') { setRole(null); setRoom(null); }
    }, (err) => console.error("Room listener error:", err));

    const playersRef = collection(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snap) => {
      setPlayers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    }, (err) => console.error("Players listener error:", err));

    return () => { unsubRoom(); unsubPlayers(); };
  }, [roomCode, user, role]);

  // --- Core Handlers ---
  const createRoom = async () => {
    if (!user) return;
    initAudioSystem();
    try {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code), {
        code, status: 'LOBBY', hostUid: user.uid, roundNum: 0, turnIdx: 0, lastHeckle: null,
        usedTopics: [], createdAt: serverTimestamp()
      });
      setRoomCode(code); setRole('host');
    } catch (err) { setError("Permission denied."); }
  };

  const joinRoom = async (e) => {
    if (e) e.preventDefault();
    if (!user || roomCode.length < 4) return;
    initAudioSystem();
    try {
      const code = roomCode.toUpperCase();
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code));
      if (!snap.exists()) return setError('Room not found.');
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code, 'players', user.uid), {
        uid: user.uid, name: (playerName || `Player ${user.uid.slice(0,3)}`).toUpperCase(), 
        score: 0, hecklesLeft: MAX_HECKLES, joinedAt: serverTimestamp()
      });
      setRoomCode(code); setRole('player');
    } catch (err) { setError("Join failed."); }
  };

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

  if (authLoading) return <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center p-8 text-white uppercase"><Loader2 className="animate-spin mb-4" /><p className="uppercase text-xs font-black tracking-widest leading-none">Establishing Connection...</p></div>;

  if (!role) {
    return (
      <div className="min-h-screen bg-indigo-950 text-white flex flex-col items-center justify-center p-8 font-sans overflow-hidden uppercase">
        <div className="max-w-md w-full text-center space-y-12 animate-in fade-in zoom-in duration-500">
          <div className="space-y-4 leading-none"><h1 className="text-6xl md:text-7xl font-black italic text-yellow-400 uppercase tracking-tighter transform -rotate-2">HERE'S MY POINT!</h1><p className="text-indigo-400 font-bold uppercase text-xs tracking-[0.4em]">The Ultimate Debate Party</p></div>
          <div className="grid gap-6">
            <button onClick={createRoom} className="group relative bg-indigo-600 hover:bg-indigo-500 p-8 rounded-[2.5rem] flex items-center justify-between border-b-8 border-indigo-900 shadow-2xl transition-all active:translate-y-2 active:border-b-0"><div className="text-left relative z-10"><p className="font-black text-2xl uppercase italic leading-none mb-1 text-white uppercase">Host Show</p><p className="text-indigo-300 text-sm font-bold leading-none">Project on Big Screen</p></div><Monitor className="w-12 h-12 text-indigo-300" /></button>
            <div className="bg-indigo-900/40 p-8 rounded-[2.5rem] border-2 border-indigo-800 space-y-6 text-left shadow-xl uppercase">
              <div className="flex items-center gap-2 text-indigo-300 relative z-10"><Smartphone className="w-5 h-5" /><p className="font-black uppercase text-[10px] tracking-[0.2em] uppercase">Join the Party</p></div>
              <form onSubmit={e => joinRoom(e)} className="space-y-4 relative z-10">
                <input type="text" placeholder="CODE" maxLength={4} className="w-full bg-indigo-950 text-center font-black text-5xl py-4 rounded-3xl uppercase text-white border-2 border-indigo-800 shadow-inner focus:ring-4 focus:ring-yellow-400 outline-none leading-none" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
                <input type="text" placeholder="YOUR NAME" className="w-full bg-indigo-900 p-5 rounded-2xl font-bold border-2 border-indigo-800 focus:outline-none focus:border-indigo-400 text-indigo-100 uppercase leading-none" value={playerName} onChange={e => setPlayerName(e.target.value)} />
                <button type="submit" className="w-full bg-yellow-400 text-indigo-950 py-6 rounded-[2rem] font-black text-2xl uppercase shadow-lg hover:bg-yellow-300 active:scale-95 leading-none">ENTER LOBBY</button>
              </form>
            </div>
          </div>
          {error && <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl text-red-200 font-bold flex items-center gap-2 animate-bounce leading-none uppercase"><AlertTriangle className="w-5 h-5 shrink-0 uppercase" /><p className="text-xs text-left leading-none uppercase">{error}</p></div>}
        </div>
      </div>
    );
  }

  return role === 'host' ? (
    <HostView 
      room={room} players={players} roomCode={roomCode} 
      startSpeaking={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode), { status: 'SPEAKING', startTime: Date.now() })} 
      activeHeckle={activeHeckle} restartGame={restartGame} 
    />
  ) : (
    <PlayerView room={room} players={players} user={user} stopSpeaking={stopSpeaking} setupTurn={setupTurn} advanceGame={advanceGame} startNextRound={startNextRound} joinRoom={joinRoom} playerName={playerName} setPlayerName={setPlayerName} roomCodeInput={roomCode} setRoomCodeInput={setRoomCode} />
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
             {players.length >= 2 && <p className="text-yellow-400 font-black animate-pulse tracking-widest">The leader controls the start...</p>}
          </div>
        )}

        {room.status === 'ROUND_INTRO' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-700 max-w-3xl w-full leading-none">
            <div className="flex justify-center mb-6 drop-shadow-2xl leading-none">{ROUND_DETAILS[room.roundType].icon}</div>
            <h2 className="text-6xl md:text-8xl font-black italic text-white leading-none leading-none uppercase">{ROUND_DETAILS[room.roundType].title}</h2>
            <div className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-[3rem] backdrop-blur-md shadow-2xl leading-none uppercase">
              <p className="text-xl md:text-2xl text-indigo-100 font-medium leading-tight uppercase leading-none">{ROUND_DETAILS[room.roundType].description}</p>
            </div>
            <p className="text-yellow-400 font-black animate-pulse mt-8 leading-none uppercase">Waiting for leader to pick prompt...</p>
          </div>
        )}

        {room.status === 'TOPIC_REVEAL' && (
          <div className="space-y-12 animate-in zoom-in duration-500 w-full max-w-5xl overflow-hidden leading-none">
            <div className="space-y-4 leading-none uppercase uppercase"><p className="text-yellow-400 font-black uppercase tracking-[0.3em] text-xs italic leading-none">The Controversy</p><h2 className="text-5xl md:text-8xl font-black italic leading-tight text-white drop-shadow-lg break-words leading-none uppercase uppercase">"{room.topic}"</h2></div>
            <div className="flex justify-center gap-8 md:gap-16 items-center flex-wrap leading-none uppercase">
              <div className="space-y-2 uppercase uppercase"><p className="text-indigo-400 uppercase font-black text-[10px] tracking-widest leading-none leading-none uppercase">Active Player</p><div className="text-3xl md:text-5xl font-black text-white uppercase leading-none leading-none uppercase">{speaker?.name}</div></div>
              {room.roundType === 3 && (<><Swords className="w-8 h-8 md:w-12 md:h-12 text-pink-500 animate-pulse leading-none" /><div className="space-y-2 leading-none uppercase"><p className="text-indigo-400 uppercase font-black text-[10px] tracking-widest leading-none leading-none uppercase">Opponent</p><div className="text-3xl md:text-5xl font-black text-white uppercase leading-none leading-none uppercase">{opponent?.name}</div></div></>)}
            </div>
            <div className="flex flex-col items-center gap-6 leading-none">
               {room.roundType === 2 && !room.sneakyWord ? (<div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-8 rounded-[2rem] animate-pulse leading-none uppercase"><p className="text-emerald-400 font-black uppercase text-xl italic leading-none">The Plant is Sabotaging...</p></div>) : (<div className="relative group leading-none"><div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-10 animate-pulse leading-none uppercase"></div><div className="relative bg-indigo-900/50 px-12 py-8 rounded-[3rem] border-2 border-indigo-700 flex flex-col items-center leading-none uppercase"><p className="text-indigo-400 font-black uppercase text-[10px] mb-2 tracking-[0.3em] leading-none uppercase uppercase">Preparation Clock</p><p className="text-8xl font-black text-white tabular-nums drop-shadow-glow leading-none uppercase">{room.prepCountdown}</p></div></div>)}
            </div>
          </div>
        )}

        {room.status === 'SPEAKING' && (
          <div className="space-y-12 w-full max-w-6xl animate-in fade-in leading-none uppercase">
            <div className={`text-6xl md:text-9xl font-black italic mb-20 drop-shadow-2xl break-words px-4 leading-none uppercase uppercase ${room.isSecondHalf ? 'text-pink-500 scale-105' : 'text-white'}`}>{room.roundType === 3 && !room.isSecondHalf ? `${speaker?.name}` : room.roundType === 3 ? `${opponent?.name}` : room.topic}</div>
            <div className="flex flex-col items-center gap-12 leading-none">
              <div className="relative w-56 h-56 md:w-72 md:h-72 flex items-center justify-center leading-none uppercase"><div className="absolute inset-0 border-8 border-indigo-800 rounded-full"></div><div className={`absolute inset-0 border-8 border-yellow-400 rounded-full animate-ping opacity-20 leading-none uppercase`} style={{ animationDuration: '2s' }}></div><Mic2 className="w-16 h-16 md:w-24 md:h-24 text-yellow-400 drop-shadow-glow leading-none" /></div>
              <div className="text-3xl md:text-4xl font-black uppercase text-indigo-400 tracking-widest h-20 leading-none uppercase uppercase">{room.roundType === 3 && speakTime >= 14 && speakTime <= 16 ? <span className="text-pink-500 animate-bounce block text-8xl uppercase uppercase">SWITCH!</span> : "Internal Clock Active"}</div>
            </div>
          </div>
        )}

        {activeHeckle && (
          <div key={activeHeckle.id} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-in zoom-in slide-in-from-bottom-20 pointer-events-none z-50 w-full max-w-2xl text-center leading-none uppercase">
            <div className="bg-red-500 p-8 md:p-12 rounded-[3rem] text-white font-black text-5xl md:text-8xl shadow-2xl border-8 border-white/20 uppercase italic break-words mx-4 leading-none uppercase uppercase">{activeHeckle.text}</div>
            <p className="mt-6 text-2xl font-bold bg-indigo-950 px-6 py-3 rounded-2xl border-2 border-white/20 shadow-xl inline-block leading-none uppercase uppercase uppercase">{activeHeckle.sender}</p>
          </div>
        )}

        {room.status === 'VOTING_WORD' && (
           <div className="space-y-12 animate-in zoom-in w-full max-w-4xl leading-none uppercase">
              <h2 className="text-7xl font-black uppercase italic tracking-tighter text-emerald-400 leading-none uppercase uppercase">Sneaky Check!</h2>
              <div className="bg-indigo-900 p-12 rounded-[3rem] border-4 border-emerald-600 shadow-2xl space-y-6 leading-none uppercase uppercase"><p className="text-indigo-300 uppercase font-black tracking-widest leading-none leading-none uppercase uppercase">Secret Word Was:</p><h3 className="text-8xl font-black text-white uppercase italic tracking-tighter leading-none leading-none uppercase uppercase">"{room.sneakyWord}"</h3><p className="text-2xl text-white leading-none uppercase uppercase">Audience: Did they slip it in naturally?</p></div>
              <div className="flex justify-center gap-12 leading-none uppercase">
                 <div className="text-center leading-none uppercase uppercase">
                   <p className="text-8xl font-black text-emerald-400">{Object.values(room.votes || {}).filter(v => v === 'YES').length}</p>
                   <p className="text-xs font-bold opacity-50">YES</p>
                 </div>
                 <div className="text-center leading-none uppercase uppercase">
                   <p className="text-8xl font-black text-red-400">{Object.values(room.votes || {}).filter(v => v === 'NO').length}</p>
                   <p className="text-xs font-bold opacity-50">NO</p>
                 </div>
              </div>
           </div>
        )}

        {room.status === 'VOTING_VIBE' && (
          <div className="space-y-12 animate-in zoom-in w-full max-w-5xl leading-none uppercase">
            <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-pink-400 leading-none uppercase">Vibe Check!</h2>
            <div className="flex justify-center gap-6 md:gap-12 flex-wrap leading-none">
              <div className="bg-indigo-900/50 p-10 md:p-12 rounded-[3rem] border-4 border-indigo-700 min-w-[280px] md:min-w-[350px] leading-none uppercase uppercase"><p className="text-7xl md:text-9xl font-black text-white tabular-nums leading-none uppercase">{Object.values(room.votes || {}).filter(v => v === speaker?.uid).length}</p><p className="text-2xl md:text-3xl font-black mt-6 uppercase text-indigo-300 leading-none uppercase uppercase uppercase">{speaker?.name}</p></div>
              <div className="bg-indigo-900/50 p-10 md:p-12 rounded-[3rem] border-4 border-indigo-700 min-w-[280px] md:min-w-[350px] leading-none uppercase uppercase"><p className="text-7xl md:text-9xl font-black text-white tabular-nums leading-none uppercase">{Object.values(room.votes || {}).filter(v => v === opponent?.uid).length}</p><p className="text-2xl md:text-3xl font-black mt-6 uppercase text-indigo-300 leading-none uppercase uppercase uppercase">{opponent?.name}</p></div>
            </div>
          </div>
        )}

        {room.status === 'RESULTS' && (
          <div className="space-y-12 animate-in zoom-in w-full overflow-hidden text-center leading-none uppercase">
             <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-none uppercase">The Scoring</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto px-4 text-center leading-none uppercase">
                <div className="bg-indigo-900/50 p-10 md:p-16 rounded-[3rem] border-2 border-white/10 shadow-2xl overflow-hidden text-center leading-none uppercase uppercase"><p className="text-indigo-400 font-black uppercase text-xl md:text-2xl tracking-widest mb-4 leading-none uppercase uppercase uppercase">Final Time</p><p className="text-[6rem] md:text-[10rem] font-black text-yellow-400 leading-none uppercase">{(speaker?.lastTurnTime || 0).toFixed(2)}s</p></div>
                <div className="bg-indigo-900/50 p-10 md:p-16 rounded-[3rem] border-2 border-white/10 shadow-2xl overflow-hidden text-center leading-none uppercase uppercase"><p className="text-indigo-400 font-black uppercase text-xl md:text-2xl tracking-widest mb-4 leading-none uppercase uppercase uppercase">Points Gained</p><p className="text-[6rem] md:text-[10rem] font-black text-white leading-none uppercase">+{speaker?.lastTurnScore || 0}</p></div>
             </div>
             <p className="text-2xl font-black uppercase text-yellow-400 italic animate-pulse leading-none mt-8 uppercase uppercase">Speaker controls the show...</p>
          </div>
        )}

        {room.status === 'FINAL_PODIUM' && (
           <div className="space-y-12 animate-in slide-in-from-bottom-20 duration-1000 w-full max-w-4xl px-4 overflow-hidden relative text-center leading-none uppercase">
              <Confetti />
              <Trophy className="w-32 h-32 md:w-48 md:h-48 text-yellow-400 mx-auto animate-bounce relative z-10 drop-shadow-glow leading-none uppercase" />
              <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-none uppercase">The Winners</h2>
              <div className="grid gap-4 mt-12 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide leading-none uppercase">{sortedWinners.slice(0, 3).map((p, i) => (<div key={p.uid} className={`flex items-center justify-between p-6 md:p-8 rounded-[2.5rem] border-4 backdrop-blur-md shadow-2xl ${i === 0 ? 'bg-yellow-400 text-indigo-950 border-white/50 scale-105' : 'bg-indigo-900 text-white border-indigo-700 opacity-80'} leading-none uppercase`}><div className="flex items-center gap-6 leading-none uppercase uppercase"><span className="text-4xl md:text-6xl font-black italic opacity-40 leading-none uppercase uppercase">#{i+1}</span><span className="text-3xl md:text-5xl font-black uppercase tracking-tighter truncate max-w-[200px] leading-none uppercase uppercase uppercase uppercase">{p.name}</span></div><div className="text-right leading-none uppercase uppercase"><span className="text-3xl md:text-5xl font-black leading-none uppercase uppercase">{p.score}</span><span className="text-[10px] uppercase font-black block tracking-widest leading-none uppercase uppercase uppercase">Points</span></div></div>))}</div>
              <button onClick={restartGame} className="bg-indigo-600 px-12 py-5 rounded-2xl font-black text-xl md:text-2xl uppercase flex items-center gap-3 shadow-xl active:scale-95 mx-auto mt-8 leading-none uppercase uppercase leading-none uppercase uppercase"><RotateCcw className="w-6 h-6 leading-none uppercase uppercase" /> Replay Show</button>
           </div>
        )}
      </div>

      <div className="bg-indigo-900 p-6 md:p-8 flex justify-center flex-wrap gap-4 md:gap-8 border-t-4 border-black/20 shadow-2xl max-h-[140px] overflow-hidden shrink-0 leading-none uppercase">
        {players.sort((a,b) => b.score - a.score).map((p, i) => (<div key={p.uid} className="flex items-center gap-4 bg-indigo-950/50 px-5 md:px-6 py-3 rounded-2xl border-2 border-indigo-700 shadow-inner group transition-all leading-none uppercase"><div className="font-black text-indigo-500 text-2xl italic group-hover:text-yellow-400 leading-none uppercase">#{i+1}</div><div className="text-left leading-tight leading-none uppercase"><p className="font-black uppercase text-[10px] md:text-xs tracking-tighter truncate max-w-[80px] text-indigo-100 uppercase uppercase leading-none uppercase">{p.name}</p><p className="font-black text-yellow-400 text-xl md:text-2xl leading-none mt-1 leading-none uppercase">{p.score}</p></div></div>))}
      </div>
    </div>
  );
}

// --- Player View ---
function PlayerView({ room, players, user, stopSpeaking, setupTurn, advanceGame, startNextRound, joinRoom, playerName, setPlayerName, roomCodeInput, setRoomCodeInput }) {
  const [sneakyInput, setSneakyInput] = useState('');
  const [customHeckle, setCustomHeckle] = useState('');
  const [localVote, setLocalVote] = useState(null);
  
  const me = players.find(p => p.uid === user?.uid);
  const isSpeaker = room?.currentSpeakerUid === user?.uid;
  const isOpponent = room?.opponentUid === user?.uid;
  const isPlant = room?.plantUid === user?.uid;

  const sortedByJoined = [...players].sort((a, b) => (a.joinedAt?.seconds || 0) - (b.joinedAt?.seconds || 0));
  const isLeader = sortedByJoined.length > 0 && sortedByJoined[0]?.uid === user?.uid;

  // Reset local vote UI when room status changes
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
    } else if (room.status === 'FINAL_PODIUM' && isLeader) {
       // Podium phase on player side handled automatically
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
        <div className="max-w-md w-full text-center space-y-12 animate-in fade-in zoom-in duration-500 uppercase leading-none">
          <div className="space-y-4 leading-none uppercase"><h1 className="text-6xl md:text-7xl font-black italic text-yellow-400 uppercase tracking-tighter leading-none uppercase">HERE'S MY POINT!</h1><p className="text-indigo-400 font-bold uppercase text-xs tracking-[0.4em] leading-none uppercase">The Ultimate Debate Party</p></div>
          <div className="bg-indigo-900/40 p-8 rounded-[2.5rem] border-2 border-indigo-800 space-y-6 text-left shadow-xl uppercase leading-none uppercase">
            <div className="flex items-center gap-2 text-indigo-300 relative z-10 leading-none uppercase uppercase uppercase"><Smartphone className="w-5 h-5 leading-none uppercase uppercase uppercase uppercase" /><p className="font-black uppercase text-[10px] tracking-[0.2em] leading-none uppercase uppercase uppercase">Join the Party</p></div>
            <form onSubmit={e => joinRoom(e)} className="space-y-4 relative z-10 leading-none uppercase uppercase uppercase">
              <input type="text" placeholder="CODE" maxLength={4} className="w-full bg-indigo-950 text-center font-black text-5xl py-4 rounded-3xl uppercase text-white border-2 border-indigo-800 shadow-inner focus:ring-4 focus:ring-yellow-400 outline-none leading-none uppercase uppercase uppercase uppercase" value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value)} />
              <input type="text" placeholder="YOUR NAME" className="w-full bg-indigo-900 p-5 rounded-2xl font-bold border-2 border-indigo-800 focus:outline-none focus:border-indigo-400 text-indigo-100 uppercase leading-none uppercase uppercase uppercase uppercase" value={playerName} onChange={e => setPlayerName(e.target.value)} />
              <button type="submit" className="w-full bg-yellow-400 text-indigo-950 py-6 rounded-[2rem] font-black text-2xl uppercase shadow-lg leading-none uppercase leading-none uppercase uppercase uppercase">ENTER LOBBY</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-indigo-950 text-white flex flex-col font-sans touch-none select-none overflow-hidden max-w-full uppercase leading-none uppercase leading-none">
       <div className="p-4 bg-indigo-900 flex justify-between items-center border-b-2 border-black/20 shadow-md shrink-0 leading-none uppercase leading-none">
          <div className="flex items-center gap-3 leading-none uppercase uppercase uppercase"><div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-indigo-950 font-black leading-none uppercase uppercase uppercase uppercase">{me?.name?.charAt(0) || '?'}</div><span className="font-black text-sm truncate max-w-[100px] leading-none uppercase uppercase uppercase uppercase">{me?.name}</span></div>
          <div className="flex gap-4 leading-none uppercase uppercase uppercase">
             <div className="text-right leading-none border-r border-white/10 pr-4 leading-none uppercase leading-none uppercase uppercase uppercase uppercase"><p className="text-[10px] font-black text-indigo-400 mb-1 leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase">Ammo</p><div className="flex gap-0.5 leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase">{[...Array(MAX_HECKLES)].map((_, i) => (<div key={i} className={`w-1 h-2 rounded-full ${i < (me?.hecklesLeft || 0) ? 'bg-red-500' : 'bg-indigo-950 opacity-30'} leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase`} />))}</div></div>
             <div className="text-right leading-none leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase"><p className="text-[10px] font-black text-indigo-400 mb-1 leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase uppercase">Score</p><p className="text-lg font-black text-yellow-400 tabular-nums leading-none leading-none uppercase uppercase uppercase uppercase uppercase leading-none uppercase uppercase uppercase uppercase uppercase">{me?.score || 0}</p></div>
          </div>
       </div>

       <div className="flex-1 flex flex-col p-6 overflow-y-auto leading-none uppercase leading-none uppercase uppercase">
          {room.status === 'LOBBY' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 leading-none uppercase leading-none uppercase uppercase uppercase">
              <Users className="w-20 h-20 text-indigo-400 animate-pulse leading-none uppercase leading-none uppercase uppercase uppercase uppercase" />
              <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none text-white leading-none uppercase uppercase uppercase uppercase uppercase">HERE'S MY POINT!</h2>
              <p className="text-indigo-300 font-bold uppercase text-[10px] tracking-widest leading-relaxed text-center leading-none uppercase uppercase uppercase uppercase uppercase">
                {isLeader ? "YOU ARE THE LEADER!" : "CONNECTED TO SHOW"}<br/>WATCH THE BIG SCREEN.
              </p>
              {isLeader && players.length >= 2 && <button onClick={startNextRound} className="w-full bg-yellow-400 text-indigo-950 py-10 rounded-[3rem] font-black text-4xl shadow-2xl active:scale-95 animate-bounce mt-4 leading-none uppercase uppercase uppercase uppercase uppercase">EVERYONE'S IN!</button>}
            </div>
          )}

          {room.status === 'ROUND_INTRO' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center animate-in zoom-in leading-none uppercase uppercase uppercase">
              <div className="bg-indigo-900 p-8 rounded-[2.5rem] border-2 border-indigo-800 shadow-xl w-full leading-none uppercase uppercase uppercase">
                <div className="flex justify-center mb-6 scale-75 leading-none uppercase uppercase uppercase uppercase">{ROUND_DETAILS[room.roundType].icon}</div>
                <h3 className="text-4xl font-black italic mb-3 text-yellow-400 uppercase tracking-tighter leading-none leading-none uppercase uppercase uppercase uppercase uppercase">{ROUND_DETAILS[room.roundType].title}</h3>
                <p className="text-indigo-200 text-xs leading-relaxed opacity-70 italic leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase uppercase">Rules are on the big screen!</p>
              </div>
              {isLeader && <button onClick={handleContinue} className="w-full bg-white text-indigo-950 py-8 rounded-[2rem] font-black text-2xl shadow-xl active:scale-95 leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase">PICK PROMPT</button>}
            </div>
          )}
          
          {room.status === 'TOPIC_REVEAL' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-10 text-center max-w-full leading-none uppercase uppercase uppercase uppercase">
              {(isSpeaker || (isOpponent && room.roundType === 3)) ? (
                <>
                  <div className="bg-yellow-400 text-indigo-950 px-8 py-2 rounded-full font-black uppercase text-[10px] tracking-widest animate-bounce leading-none uppercase uppercase uppercase uppercase uppercase uppercase">Your Turn!</div>
                  <h2 className="text-3xl font-black italic text-white leading-tight break-words max-w-full leading-none uppercase uppercase uppercase uppercase uppercase">"{room.topic}"</h2>
                  {room.roundType === 2 && room.sneakyWord && <div className="bg-emerald-500/20 p-6 rounded-2xl border-2 border-emerald-500/30 font-black text-xl text-emerald-400 uppercase tracking-tighter leading-none leading-none uppercase uppercase uppercase uppercase">Sneaky Word: {room.sneakyWord}</div>}
                  {isSpeaker && <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { prepCountdown: 0 })} className="w-full bg-white text-indigo-950 py-10 rounded-[2.5rem] font-black text-4xl uppercase shadow-xl tracking-tighter active:scale-95 transition-all leading-none uppercase uppercase uppercase uppercase uppercase uppercase">READY!</button>}
                  {isOpponent && <div className="p-10 border-4 border-dashed border-indigo-700 rounded-[2.5rem] text-pink-400 font-black uppercase italic leading-none uppercase uppercase uppercase uppercase uppercase">You go 2nd!<br/><span className="text-xs uppercase tracking-widest leading-none uppercase uppercase uppercase uppercase uppercase">Defend the opposite side</span></div>}
                </>
              ) : isPlant && !room.sneakyWord ? (
                <>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-emerald-400 leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase">You are<br/>The Plant!</h2>
                  <p className="text-indigo-300 text-sm italic leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase">Pick a secret word the speaker must use:</p>
                  <input type="text" maxLength={HECKLE_CHAR_LIMIT} className="w-full bg-indigo-900 p-6 rounded-2xl border-4 border-indigo-800 font-black text-3xl text-center focus:border-emerald-500 text-white outline-none leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase" value={sneakyInput} onChange={e => setSneakyInput(e.target.value)} />
                  <button onClick={() => { if (!sneakyInput) return; updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { sneakyWord: sneakyInput.toUpperCase() }); setSneakyInput(''); }} className="w-full bg-emerald-500 text-indigo-950 py-6 rounded-[2rem] font-black text-2xl uppercase shadow-lg active:scale-95 leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase">Sabotage!</button>
                </>
              ) : <div className="bg-indigo-900/50 p-10 rounded-[2rem] border border-white/5 w-full text-center leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase"><p className="text-xl font-black uppercase text-indigo-400 tracking-widest animate-pulse leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase uppercase">Wait for Setup...</p></div>}
            </div>
          )}

          {room.status === 'SPEAKING' && (
            <div className="flex-1 flex flex-col max-w-full leading-none uppercase uppercase uppercase uppercase uppercase">
              {(isSpeaker || isOpponent) ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-12 leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase uppercase">
                   <div className="text-center space-y-2 leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase"><p className="text-yellow-400 font-black uppercase text-[10px] tracking-widest leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">Mic is Active</p><h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">{(isOpponent && !room.isSecondHalf) ? 'ON DECK...' : (isSpeaker && room.isSecondHalf) ? 'WAIT...' : 'DEFEND!'}</h2></div>
                   <div className="w-64 h-64 rounded-full border-[16px] border-indigo-900 flex items-center justify-center relative bg-indigo-950 shadow-inner leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase">{(isOpponent && room.isSecondHalf) || (isSpeaker && !room.isSecondHalf) ? <div className="absolute inset-0 rounded-full border-8 border-yellow-400 animate-ping opacity-10 leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase"></div> : null}<Mic2 className={`w-20 h-20 text-yellow-400 ${((isSpeaker && !room.isSecondHalf) || (isOpponent && room.isSecondHalf)) ? 'opacity-100 animate-pulse' : 'opacity-10'} leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase`} /></div>
                   {((room.roundType !== 3 && isSpeaker) || (room.roundType === 3 && isOpponent && room.isSecondHalf)) && (<button onClick={() => stopSpeaking((Date.now() - room.startTime) / 1000)} className="w-full bg-red-500 py-12 rounded-[3rem] font-black text-5xl uppercase tracking-tighter shadow-[0_12px_0_rgb(150,0,0)] active:translate-y-3 active:shadow-none transition-all leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">STOP!</button>)}
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-6 max-w-full overflow-hidden leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase">
                   <div className="bg-indigo-900/50 p-4 rounded-[2rem] border border-white/5 text-center leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase"><p className="text-[10px] font-black text-indigo-400 tracking-widest mb-1 leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">Currently Active</p><h3 className="text-xs font-black italic truncate leading-none opacity-50 leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">"{room.topic}"</h3></div>
                   <form onSubmit={e => { e.preventDefault(); if (!customHeckle || (me?.hecklesLeft || 0) <= 0) return; updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code, 'players', user.uid), { hecklesLeft: increment(-1) }); updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', room.code), { lastHeckle: { id: Math.random().toString(), text: customHeckle.toUpperCase(), sender: me.name } }); setCustomHeckle(''); }} className="space-y-4 leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase">
                      <div className="text-center space-y-2 leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase leading-none uppercase uppercase uppercase uppercase"><p className="text-[10px] font-black text-red-500 tracking-widest leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase leading-none uppercase uppercase">Distraction Engine</p><input type="text" placeholder="TYPE A HECKLE..." maxLength={HECKLE_CHAR_LIMIT} className="w-full bg-indigo-900 p-6 rounded-[2rem] border-4 border-indigo-800 font-black text-2xl text-center focus:border-red-500 text-white outline-none leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase" value={customHeckle} onChange={e => setCustomHeckle(e.target.value)} /></div>
                      <button type="submit" disabled={(me?.hecklesLeft || 0) <= 0 || !customHeckle} className="w-full bg-red-500 text-white p-7 rounded-[2rem] border-b-8 border-red-900 font-black uppercase text-3xl flex items-center justify-center gap-4 active:translate-y-2 active:border-b-0 shadow-xl disabled:opacity-10 leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">FIRE!</button>
                   </form>
                   <div className="mt-auto flex justify-center items-center gap-1 leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase"><p className="text-[10px] font-black text-indigo-400 tracking-widest mr-1 leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">Ammo:</p>{[...Array(MAX_HECKLES)].map((_, i) => (<div key={i} className={`w-2 h-4 rounded-full transition-all duration-300 ${i < (me?.hecklesLeft || 0) ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-indigo-950 opacity-20'} leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase`} />))}</div>
                </div>
              )}
            </div>
          )}

          {room.status === 'VOTING_WORD' && (
             <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">
                <h2 className="text-4xl font-black uppercase text-emerald-400 italic tracking-tighter leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">Word Check!</h2>
                <div className="bg-indigo-900 p-8 rounded-3xl border-2 border-emerald-500/30 w-full text-center font-black text-3xl text-white italic leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">"{room.sneakyWord}"</div>
                {!isSpeaker && !localVote ? (
                  <div className="grid grid-cols-2 gap-4 w-full leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase"><button onClick={() => castVote('YES')} className="bg-emerald-500 p-10 rounded-[2rem] font-black text-3xl active:scale-95 shadow-xl leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase"><ThumbsUp className="w-12 h-12 mx-auto leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase" /></button><button onClick={() => castVote('NO')} className="bg-red-500 p-10 rounded-[2rem] font-black text-3xl active:scale-95 shadow-xl leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase"><ThumbsDown className="w-12 h-12 mx-auto leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase" /></button></div>
                ) : (
                   <div className="flex flex-col items-center gap-4 text-emerald-400 font-black animate-pulse uppercase uppercase uppercase">
                      <CheckCircle2 className="w-12 h-12" />
                      <p>{isSpeaker ? "Wait for audience..." : "Vote Recorded!"}</p>
                   </div>
                )}
                {(isSpeaker || isOpponent || isLeader) && <button onClick={handleContinue} className="w-full bg-white text-indigo-950 py-6 rounded-[2rem] font-black text-xl active:scale-95 leading-none uppercase leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">TALLY VOTES</button>}
             </div>
          )}

          {room.status === 'VOTING_VIBE' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">
               <h2 className="text-4xl font-black uppercase text-pink-500 italic tracking-tighter leading-none text-center leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">Vibe Check!</h2>
               {!localVote ? (
                 <div className="space-y-4 w-full uppercase uppercase uppercase">
                   <button onClick={() => castVote(room.currentSpeakerUid)} className="w-full bg-indigo-900 p-8 rounded-[2.5rem] border-4 border-indigo-800 font-black text-2xl active:bg-yellow-400 transition-all shadow-xl uppercase leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">{players.find(p => p.uid === room.currentSpeakerUid)?.name}</button>
                   <button onClick={() => castVote(room.opponentUid)} className="w-full bg-indigo-900 p-8 rounded-[2.5rem] border-4 border-indigo-800 font-black text-2xl active:bg-yellow-400 transition-all shadow-xl uppercase leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">{players.find(p => p.uid === room.opponentUid)?.name}</button>
                 </div>
               ) : (
                <div className="flex flex-col items-center gap-4 text-pink-400 font-black animate-pulse uppercase uppercase uppercase uppercase">
                   <CheckCircle2 className="w-12 h-12 uppercase" />
                   <p>Bonus Choice Sent!</p>
                </div>
               )}
               {(isSpeaker || isOpponent || isLeader) && <button onClick={handleContinue} className="w-full bg-white text-indigo-950 py-6 rounded-[2rem] font-black text-xl active:scale-95 mt-4 leading-none uppercase leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">Award Bonus</button>}
            </div>
          )}

          {(room.status === 'RESULTS' || room.status === 'FINAL_PODIUM') && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">
              <Trophy className="w-24 h-24 text-yellow-400 animate-bounce leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase" />
              <h2 className="text-5xl font-black italic tracking-tighter text-center leading-none leading-none leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">
                {room.status === 'FINAL_PODIUM' ? 'GAME OVER!' : 'TURN FINISHED'}
              </h2>
              {(isSpeaker || isOpponent || isLeader) && (
                <button onClick={handleContinue} className="w-full bg-yellow-400 text-indigo-950 py-10 rounded-[3rem] font-black text-4xl shadow-2xl active:scale-95 animate-pulse leading-none uppercase leading-none uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase uppercase">
                  {room.status === 'FINAL_PODIUM' ? 'VIEW PODIUM' : 'CONTINUE SHOW'}
                </button>
              )}
            </div>
          )}
       </div>
       <style>{`
          @keyframes confetti { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(360deg); opacity: 0; } }
          .animate-confetti { position: absolute; top: -50px; animation: confetti linear infinite; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .drop-shadow-glow { filter: drop-shadow(0 0 15px rgba(250, 204, 21, 0.4)); }
       `}</style>
    </div>
  );
}
