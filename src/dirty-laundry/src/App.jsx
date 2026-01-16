import React, { useState, useEffect, useRef } from 'react';
// Import the shared database from your hub
import { firestore as db } from '../../firebaseConfig'; 
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  arrayUnion,
  getDoc,
  serverTimestamp,
  increment,
  collection
} from 'firebase/firestore';
import { 
  Users, ShieldAlert, FileText, Lock, ArrowRight, 
  Volume2, VolumeX, Play, Gavel, ThumbsUp, 
  CheckCircle, XCircle, Camera, Skull, Ghost, AlertTriangle, RefreshCw
} from 'lucide-react';

/* -----------------------------------------------------------------------
  GAME CONFIGURATION
  -----------------------------------------------------------------------
*/
const appId = "murder-at-the-cabin";

const DEFAULT_WEAPONS = [
  'Rusty Axe', 'Poisoned Gumbo', 'Bear Trap', 'Hunting Rifle', 
  'Canoe Paddle', 'Fireplace Poker', 'Strangulation', 'Ice Pick',
  'Chainsaw', 'Antler', 'Fishing Line', 'Heavy Skillet', 'Flare Gun'
];

/* -----------------------------------------------------------------------
  UTILITIES & STYLES
  -----------------------------------------------------------------------
*/
const resizeImage = (file, maxWidth = 300) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6)); 
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
};

const GameStyles = () => (
  <style>{`
    @keyframes fog { 
      0% { transform: translateX(-5%) translateY(0); opacity: 0.3; } 
      50% { opacity: 0.6; }
      100% { transform: translateX(5%) translateY(-2%); opacity: 0.3; } 
    }
    .fog-layer {
      position: absolute; inset: -50%; width: 200%; height: 200%;
      background: radial-gradient(circle at 50% 50%, transparent 20%, rgba(200,200,200,0.1) 60%, transparent 80%);
      animation: fog 30s infinite alternate ease-in-out; 
      pointer-events: none; z-index: 1;
    }
    .crt-scanline {
      position: absolute; inset: 0; 
      background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2));
      background-size: 100% 4px; 
      pointer-events: none; z-index: 50;
    }
    .crt-vignette {
      position: absolute; inset: 0;
      background: radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.8) 100%);
      pointer-events: none; z-index: 49;
    }
    .animate-in { animation: fadeIn 0.5s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `}</style>
);

const SpookyBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-slate-950 z-0"></div>
    <div className="fog-layer"></div>
    <div className="crt-vignette"></div>
    <div className="crt-scanline"></div>
  </div>
);

/* -----------------------------------------------------------------------
  COMPONENTS
  -----------------------------------------------------------------------
*/
const Timer = ({ duration, onComplete, label = "TIME REMAINING" }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  useEffect(() => setTimeLeft(duration), [duration]);
  useEffect(() => {
    if (timeLeft <= 0) { onComplete && onComplete(); return; }
    const interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, onComplete]);

  return (
    <div className="flex flex-col items-center relative z-30">
      <div className="text-xs text-red-500 font-mono tracking-widest bg-black px-2 mb-1 border border-red-900/50 rounded">{label}</div>
      <div className={`text-4xl font-mono font-bold px-6 py-2 rounded-lg border-2 bg-black/80 backdrop-blur-md ${timeLeft < 10 ? 'text-red-500 border-red-500 animate-pulse' : 'text-slate-200 border-slate-700'}`}>
        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
      </div>
    </div>
  );
};

const CameraCapture = ({ onSave }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const resizedBase64 = await resizeImage(file);
      setPreview(resizedBase64);
      onSave(resizedBase64);
    }
  };
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-slate-800 rounded-lg border border-slate-700 w-full shadow-lg">
      <div className="text-xs uppercase text-slate-400 font-bold tracking-wider">MUGSHOT (REQUIRED)</div>
      {preview ? (
        <div className="relative animate-in"><img src={preview} className="w-32 h-32 object-cover rounded-lg bg-black border-2 border-white shadow-xl" /><button onClick={() => { setPreview(null); onSave(null); }} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 hover:bg-red-700"><XCircle className="w-5 h-5 text-white" /></button></div>
      ) : (
        <button onClick={() => fileInputRef.current.click()} className="w-20 h-20 rounded-full bg-slate-600 flex items-center justify-center hover:bg-slate-500 transition-colors"><Camera className="w-8 h-8 text-white" /></button>
      )}
      <input type="file" accept="image/*" capture="user" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
    </div>
  );
};

const DrawingCanvas = ({ onSave }) => {
  const canvasRef = useRef(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, 300, 300);
    ctx.lineWidth = 4; ctx.strokeStyle = 'white'; ctx.lineCap = 'round';
  }, []);
  const draw = (e) => {
    if (!e.touches && e.buttons !== 1) return;
    e.preventDefault(); setHasDrawn(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
  };
  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  return (
    <div className="flex flex-col gap-4 w-full items-center">
      <canvas ref={canvasRef} width={300} height={300} className="bg-slate-800 rounded-lg touch-none border-4 border-slate-600 shadow-2xl cursor-crosshair" onMouseDown={startDraw} onMouseMove={draw} onTouchStart={startDraw} onTouchMove={draw} />
      <button onClick={() => onSave(canvasRef.current.toDataURL('image/jpeg', 0.5))} disabled={!hasDrawn} className="w-full bg-white text-black py-4 rounded-lg font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors uppercase tracking-widest">SUBMIT SKETCH</button>
    </div>
  );
};

/* -----------------------------------------------------------------------
  MAIN APP COMPONENT
  -----------------------------------------------------------------------
*/
export default function App({ code, user, role: initialRole }) {
  const [gameId] = useState(code);
  const [gameState, setGameState] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [view] = useState(initialRole === 'HOST' ? 'host' : 'player'); 
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef(null); 
  const sfxRef = useRef(null);

  useEffect(() => {
    if (!user || !gameId) return;
    return onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId), (snap) => {
      if (snap.exists()) setGameState(snap.data());
      else setError("Game data missing.");
    });
  }, [user, gameId]);

  useEffect(() => {
    if (!user || !gameId || view !== 'player') return;
    return onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${user.uid}`), (snap) => {
      if (snap.exists()) setPlayerState(snap.data());
    });
  }, [user, gameId, view]);

  // Music Logic
  useEffect(() => {
    if (!audioRef.current || view !== 'host') return;
    const isPlayingMedia = gameState?.status === 'briefing';
    if (isPlayingMedia) {
        audioRef.current.pause(); 
    } else {
        if (audioRef.current.paused) audioRef.current.play().catch(()=>{});
        const isQuiet = !['lobby', 'debrief1', 'debrief2', 'reveal', 'round4_debate', 'rules'].includes(gameState?.status);
        audioRef.current.volume = isMuted ? 0 : (isQuiet ? 0.1 : 0.3);
    }
  }, [gameState?.status, isMuted, view]);

  if (!gameState && !error) return <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono">SYNCING WITH HUB...</div>;

  return (
    <div className="h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative selection:bg-red-900 selection:text-white">
      <GameStyles />
      {view === 'host' && <><audio ref={audioRef} src="/music.mp3" loop /><audio ref={sfxRef} src="/join.mp3" /></>}
      {view !== 'player' && <SpookyBackground />}
      
      {view === 'host' && gameState && <HostView gameId={gameId} gameState={gameState} />}
      {view === 'player' && gameState && <PlayerView gameId={gameId} gameState={gameState} playerState={playerState} user={user} />}
      
      {error && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 p-4 rounded z-[100]">{error}</div>}
    </div>
  );
}

// --- HOST VIEW ---
const HostView = ({ gameId, gameState }) => {
  const [mugshots, setMugshots] = useState({});
  const advance = (s, d={}) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId), { status: s, roundStartedAt: Date.now(), ...d });

  useEffect(() => {
      if(gameState.status === 'lobby' || ['round1_suspect', 'reveal', 'voting'].includes(gameState.status)) {
          const i = setInterval(async () => {
              const ms = {};
              for(const p of gameState.players) {
                  const d = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${p.uid}`));
                  if(d.exists() && d.data().dossier?.mugshot) ms[p.uid] = d.data().dossier.mugshot;
              }
              setMugshots(prev => ({...prev, ...ms}));
          }, 2000);
          return () => clearInterval(i);
      }
  }, [gameState.status, gameState.players]);

  useEffect(() => {
    const check = async () => {
      if(!gameState.players.length) return;
      const snaps = await Promise.all(gameState.players.map(p => getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${p.uid}`))));
      const data = snaps.map(s => s.data());

      if (gameState.status === 'rules' && data.every(p => p?.hasReadRules)) advance('briefing');
      if (gameState.status === 'brainstorm' && data.every(p => p?.hasSubmittedWeapons)) finishBrainstorm();
      if (gameState.status === 'round1_suspect' && data.every(p => p?.r1Suspect)) advance('round1_weapon');
      if (gameState.status === 'round1_weapon' && data.every(p => p?.r1Weapon)) calculateR1Stats();
      if (gameState.status === 'round2' && data.every(p => p?.sketch)) advance('lineup');
      if (gameState.status === 'lineup' && data.every(p => p?.sketchVote)) handleRound2Winner();
      if (gameState.status === 'round4_exchange' && data.every(p => p?.finishedExchange)) advance('round4_debate');
      
      if (gameState.status === 'killing_round') {
          const mData = data.find(p => p.isMurderer);
          if (mData && mData.victimChoice) handleMurder();
      }

      if (gameState.status === 'weapon_clues_murderer' && data.find(p => p.isMurderer)?.weaponClue) advance('weapon_clues_ghost');
      if (gameState.status === 'weapon_clues_ghost') {
         const ghost = data.find(p => p.isGhost);
         if (!gameState.ghostId || (ghost && ghost.weaponClue)) revealClues();
      }
      if (gameState.status === 'voting' && data.every(p => p?.finalVote)) checkWinner();
    };
    const i = setInterval(check, 2500);
    return () => clearInterval(i);
  }, [gameState.status, gameState.players, gameState.ghostId]);

  const finishBrainstorm = async () => {
    let weapons = [];
    for(const p of gameState.players) {
      const d = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${p.uid}`));
      if(d.data().submittedWeapons) weapons.push(...d.data().submittedWeapons);
    }
    if(weapons.length < 5) weapons = [...weapons, ...DEFAULT_WEAPONS];
    const pool = [...new Set(weapons)].sort(()=>0.5-Math.random()).slice(0, 15);
    const kUid = gameState.players[Math.floor(Math.random() * gameState.players.length)].uid;
    const weapon = pool[Math.floor(Math.random() * pool.length)];
    
    await Promise.all(gameState.players.map(p => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${p.uid}`), { isMurderer: p.uid === kUid })));
    advance('round1_suspect', { possibleWeapons: pool, murderWeapon: weapon, murdererId: kUid });
  };

  const calculateR1Stats = async () => {
    let perfect=0, kOnly=0, wOnly=0, wrong=0;
    for(const p of gameState.players) {
      const d = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${p.uid}`));
      const g = d.data();
      if(g.r1Suspect === gameState.murdererId && g.r1Weapon === gameState.murderWeapon) perfect++;
      else if(g.r1Suspect === gameState.murdererId) kOnly++;
      else if(g.r1Weapon === gameState.murderWeapon) wOnly++;
      else wrong++;
    }
    advance('debrief1', { r1Stats: { perfect, kOnly, wOnly, wrong }});
  };

  const setupSketchRound = async () => {
    const murderer = gameState.players.find(p => p.uid === gameState.murdererId);
    const innocents = gameState.players.filter(p => p.uid !== gameState.murdererId).sort(()=>0.5-Math.random());
    const prompts = [];
    if(murderer) {
        const d = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${murderer.uid}`));
        if(d.data().dossier?.descriptionText) prompts.push(d.data().dossier.descriptionText);
    }
    if(innocents.length > 0) {
        const d = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${innocents[0].uid}`));
        if(d.data().dossier?.descriptionText) prompts.push(d.data().dossier.descriptionText);
    }
    if(prompts.length < 1) prompts.push("A shadowy figure.");
    if(prompts.length < 2) prompts.push("Wearing a mask.");
    advance('round2', { sketchPrompts: prompts.sort(() => 0.5 - Math.random()) });
  };

  const handleRound2Winner = async () => {
    const votes = {};
    for(const p of gameState.players) {
        const d = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${p.uid}`));
        const v = d.data().sketchVote;
        if(v) votes[v] = (votes[v] || 0) + 1;
    }
    let winnerId = gameState.players[0].uid;
    let maxVotes = -1;
    Object.entries(votes).forEach(([uid, count]) => { if(count > maxVotes) { maxVotes = count; winnerId = uid; }});
    const winner = gameState.players.find(p => p.uid === winnerId);
    const innocents = gameState.players.filter(p => p.uid !== gameState.murdererId && p.uid !== winnerId);
    let clueText = innocents.length > 0 ? `${innocents[0].name} is INNOCENT.` : "Trust your instincts.";
    if (winnerId) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${winnerId}`), { advantageClue: clueText });
    advance('debrief2', { round2WinnerName: winner?.name || "No One" });
  };

  const setupRumors = async () => {
    let rumors = [];
    for(const p of gameState.players) {
      const d = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${p.uid}`));
      if(d.data().dossier?.rumor) rumors.push({ text: d.data().dossier.rumor, author: p.name });
    }
    if(rumors.length<2) rumors.push({text:"I saw blood.", author:"Anon"}, {text:"He is lying.", author:"Anon"});
    await Promise.all(gameState.players.map(async p => {
      const r1 = rumors[Math.floor(Math.random()*rumors.length)];
      const r2 = rumors[Math.floor(Math.random()*rumors.length)];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${p.uid}`), { hand: [r1, r2], inbox: [] });
    }));
    advance('round4_exchange');
  };

  const handleMurder = async () => {
      const kDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${gameState.murdererId}`));
      const victimId = kDoc.data().victimChoice;
      if(victimId) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${victimId}`), { isGhost: true });
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId), { ghostId: victimId });
          advance('killing_reveal', { victimId });
      } else advance('weapon_clues_murderer', { displayedWeapons: gameState.possibleWeapons });
  };

  const startWeaponRound = async () => {
      const others = gameState.possibleWeapons.filter(w => w !== gameState.murderWeapon).sort(()=>0.5-Math.random()).slice(0,6);
      advance('weapon_clues_murderer', { displayedWeapons: [...others, gameState.murderWeapon].sort(()=>0.5-Math.random()), weaponClues: [] });
  };
  
  const revealClues = async () => {
      const kDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${gameState.murdererId}`));
      const gDoc = gameState.ghostId ? await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${gameState.ghostId}`)) : null;
      const clues = [];
      if(kDoc.exists() && kDoc.data().weaponClue) clues.push({type: 'KILLER', text: kDoc.data().weaponClue});
      if(gDoc?.exists() && gDoc.data().weaponClue) clues.push({type: 'GHOST', text: gDoc.data().weaponClue});
      advance('weapon_reveal', { weaponClues: clues });
  };

  const checkWinner = async () => {
    const votes = {}; const wVotes = {};
    for(const p of gameState.players) {
      const d = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${p.uid}`));
      const v = d.data().finalVote; 
      if(v) { votes[v.suspect] = (votes[v.suspect] || 0) + 1; if(v.weapon) wVotes[v.weapon] = (wVotes[v.weapon] || 0) + 1; }
    }
    const topSuspect = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b, null);
    const topWeapon = Object.keys(wVotes).reduce((a, b) => wVotes[a] > wVotes[b] ? a : b, null);
    advance('reveal', { caught: topSuspect === gameState.murdererId && topWeapon === gameState.murderWeapon });
  };

  const restart = async () => {
    await Promise.all(gameState.players.map(p => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${p.uid}`), {
      dossier: {}, score: 0, hand: [], inbox: [], hasSubmittedDossier: false, submittedWeapons: [], r1Suspect: null, 
      r1Weapon: null, sketch: null, finalVote: null, sketchVote: null, victimChoice: null, weaponClue: null, 
      isGhost: false, hasReadRules: false
    })));
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId), {
      status: 'lobby', possibleWeapons: [], murderWeapon: '', roundStats: {}, sketches: [], weaponClues: [], ghostId: null
    });
  };

  if(gameState.status === 'lobby') return <div className="h-full flex flex-col items-center justify-center relative z-20 text-center"><h1 className="text-8xl font-black text-red-600 mb-4 drop-shadow-lg">LOBBY</h1><div className="text-4xl text-white mb-8 font-mono">{gameId}</div><div className="grid grid-cols-4 gap-6 w-full max-w-6xl">{gameState.players.map(p => <div key={p.uid} className="bg-slate-800 p-6 rounded-xl text-3xl font-bold border-2 border-slate-600 text-center flex flex-col items-center gap-2">{mugshots[p.uid] && <img src={mugshots[p.uid]} className="w-24 h-24 rounded-full object-cover border-2 border-slate-500"/>}{p.name}</div>)}</div>{gameState.players.length > 0 && <button onClick={()=>advance('rules')} className="mt-12 bg-red-600 px-16 py-6 text-4xl font-black rounded-full shadow-lg">START NIGHT</button>}</div>;
  if(gameState.status === 'rules') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-6xl font-bold mb-8">READ THE RULES</h2><p className="text-2xl text-slate-400">Waiting for all players to confirm...</p></div>;
  if(gameState.status === 'briefing') return <div className="h-full w-full bg-black relative z-50"><video src="/briefing.mp4" autoPlay className="w-full h-full object-contain" onEnded={()=>advance('brainstorm')} /></div>;
  if(gameState.status === 'brainstorm') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-6xl font-bold mb-8">THE ARMORY</h2><p className="text-2xl text-slate-400 mb-8">Detectives are identifying weapons...</p><Timer duration={60} onComplete={finishBrainstorm}/></div>;
  if(gameState.status === 'round1_suspect') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-6xl font-bold mb-8 text-red-500">WHO IS THE KILLER?</h2><div className="grid grid-cols-4 gap-4 w-full max-w-5xl">{gameState.players.map(p => <div key={p.uid} className="flex flex-col items-center"><img src={mugshots[p.uid]} className="w-32 h-32 rounded-full object-cover border-4 border-slate-700 mb-2"/><div className="text-xl font-bold">{p.name}</div></div>)}</div></div>;
  if(gameState.status === 'round1_weapon') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-6xl font-bold mb-8 text-blue-500">WHAT DID THEY USE?</h2><div className="flex flex-wrap justify-center gap-4 max-w-6xl">{gameState.possibleWeapons.map(w=><div key={w} className="bg-slate-800 px-6 py-3 rounded-full text-xl border border-slate-600">{w}</div>)}</div></div>;
  if(gameState.status === 'debrief1') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-7xl font-black mb-8">RESULTS</h2><div className="flex gap-8 mb-12"><div className="text-center"><div className="text-8xl font-black text-green-500">{gameState.r1Stats.perfect}</div><div>PERFECT</div></div><div className="text-center"><div className="text-8xl font-black text-yellow-500">{gameState.r1Stats.kOnly + gameState.r1Stats.wOnly}</div><div>PARTIAL</div></div><div className="text-center"><div className="text-8xl font-black text-red-500">{gameState.r1Stats.wrong}</div><div>WRONG</div></div></div><Timer duration={240} onComplete={setupSketchRound}/><button onClick={setupSketchRound} className="mt-8 bg-slate-700 px-8 py-3 rounded font-bold">Skip Debrief</button></div>;
  if(gameState.status === 'round2') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-6xl font-bold mb-8">WITNESS STATEMENTS</h2><div className="flex gap-8 mb-12">{gameState.sketchPrompts?.map((txt, i) => (<div key={i} className="bg-black/50 p-6 rounded-xl border-2 border-red-500 max-w-sm text-2xl font-serif text-white">"{txt}"</div>))}</div><Timer duration={90} onComplete={()=>advance('lineup')}/></div>;
  if(gameState.status === 'lineup') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-6xl font-bold mb-12">SKETCH VOTING</h2><Timer duration={45} onComplete={handleRound2Winner}/></div>;
  if(gameState.status === 'debrief2') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-7xl font-black mb-4">DEBRIEF</h2>{gameState.round2WinnerName && <div className="text-3xl text-green-400 mb-8">WINNER: {gameState.round2WinnerName}</div>}<Timer duration={240} onComplete={()=>advance('role_reveal')}/><button onClick={()=>advance('role_reveal')} className="mt-8 bg-slate-700 px-8 py-3 rounded font-bold">Skip</button></div>;
  if(gameState.status === 'role_reveal') return <div className="h-full flex flex-col items-center justify-center relative z-20 bg-black"><h1 className="text-8xl font-black text-white mb-8 animate-pulse">CHECK YOUR PHONE</h1><Timer duration={15} onComplete={setupRumors}/></div>;
  if(gameState.status === 'round4_exchange') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-6xl font-bold mb-4">RUMOR MILL</h2><button onClick={()=>advance('round4_debate')} className="mt-8 bg-slate-700 px-6 py-2 rounded">Force Debate</button></div>;
  if(gameState.status === 'round4_debate') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-7xl font-black mb-8">DEBATE SESSION</h2><Timer duration={150} onComplete={()=>advance('killing_round')}/><button onClick={()=>advance('killing_round')} className="mt-12 bg-red-600 px-12 py-4 text-2xl rounded-full font-bold shadow-lg">NEXT</button></div>;
  if(gameState.status === 'killing_round') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-6xl font-black mb-8 text-red-600 animate-pulse">SOMEONE IS DYING...</h2></div>;
  if(gameState.status === 'killing_reveal') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h1 className="text-8xl font-black text-white mb-4">MURDER!</h1><div className="text-5xl text-red-500 font-bold mb-8">VICTIM: {gameState.players.find(p=>p.uid===gameState.ghostId)?.name}</div><Timer duration={10} onComplete={startWeaponRound}/></div>;
  if(gameState.status === 'weapon_clues_murderer' || gameState.status === 'weapon_clues_ghost') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-5xl font-bold mb-8">WEAPON ANALYSIS</h2><div className="flex flex-wrap gap-4 justify-center max-w-6xl mb-8">{gameState.displayedWeapons?.map(w=><div key={w} className="bg-slate-800 px-6 py-3 rounded text-xl border border-slate-600">{w}</div>)}</div><p className="text-2xl text-slate-400 animate-pulse">The Killer and Ghost are providing clues...</p></div>;
  if(gameState.status === 'weapon_reveal') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-5xl font-bold mb-8">CLUES REVEALED</h2><div className="flex gap-12 mb-12">{gameState.weaponClues?.map((c,i)=><div key={i} className="bg-white text-black p-8 rounded-xl text-4xl font-black transform rotate-2">{c.text}</div>)}</div><Timer duration={120} onComplete={()=>advance('voting')}/><button onClick={()=>advance('voting')} className="mt-8 bg-red-600 px-8 py-3 rounded font-bold">Vote</button></div>;
  if(gameState.status === 'voting') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h2 className="text-7xl font-black mb-8 text-red-500">FINAL JUDGMENT</h2><div className="grid grid-cols-4 gap-4 w-full max-w-6xl mb-8">{gameState.players.map(p=><div key={p.uid} className="flex flex-col items-center"><img src={mugshots[p.uid]} className="w-24 h-24 rounded-full object-cover border-2 border-slate-600 mb-2"/><div className="font-bold">{p.name}</div></div>)}</div></div>;
  if(gameState.status === 'reveal') return <div className="h-full flex flex-col items-center justify-center relative z-20"><h1 className={`text-9xl font-black mb-12 drop-shadow-2xl ${gameState.caught ? 'text-green-500' : 'text-red-600'}`}>{gameState.caught ? "JUSTICE SERVED" : "KILLER ESCAPED"}</h1>{gameState.players.filter(p=>p.uid===gameState.murdererId).map(k=>(<div key={k.uid} className="text-center bg-black/80 p-12 rounded-2xl border-4 border-red-600"><img src={mugshots[k.uid]} className="w-64 h-64 rounded-full object-cover border-4 border-white mb-6 mx-auto"/><div className="text-6xl font-black text-white mb-2">{k.name}</div><div className="text-4xl text-red-500 font-bold">Weapon: {gameState.murderWeapon}</div></div>))}<button onClick={restart} className="mt-16 bg-slate-800 px-10 py-4 rounded-full text-2xl font-bold hover:bg-slate-700 border border-slate-500">New Mystery</button></div>;

  return null;
};

// --- PLAYER VIEW ---
const PlayerView = ({ gameId, gameState, playerState, user }) => {
  const [form, setForm] = useState({});
  const [wInput, setWInput] = useState("");
  const [vote, setVote] = useState({});
  const [showRole, setShowRole] = useState(false);
  const [rumorEdit, setRumorEdit] = useState("");
  const [rumorNote, setRumorNote] = useState("");
  const [cardIdx, setCardIdx] = useState(0);
  const [targetId, setTargetId] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [mugshots, setMugshots] = useState({});
  const [sketches, setSketches] = useState([]);
  const [weaponClue, setWeaponClue] = useState("");
  const [busyWork, setBusyWork] = useState("");

  useEffect(() => { setWaiting(false); }, [gameState.status]);
  
  useEffect(() => {
    const fetchData = async () => {
        if(gameState.status === 'round1_suspect' || gameState.status === 'voting') {
            gameState.players.forEach(async p => {
                const d = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${p.uid}`));
                if(d.exists() && d.data().dossier?.mugshot) setMugshots(prev => ({...prev, [p.uid]: d.data().dossier.mugshot}));
            });
        }
        if(gameState.status === 'lineup') {
             const s = [];
             for(const p of gameState.players) {
                 const d = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${p.uid}`));
                 if(d.exists() && d.data().sketch) s.push({id:p.uid, url:d.data().sketch});
             }
             setSketches(s);
        }
    };
    fetchData();
  }, [gameState.status]);

  const send = async (d) => { setWaiting(true); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${user.uid}`), d); };

  if(!playerState) return <div className="h-full flex items-center justify-center text-slate-500 font-bold text-xl animate-pulse">PROFILE SYNC...</div>;
  if(waiting) return <div className="h-full flex flex-col items-center justify-center text-slate-500"><CheckCircle className="w-16 h-16 text-green-500 mb-4"/><div>Waiting...</div></div>;

  if(gameState.status === 'rules') return <div className="p-6 h-full flex flex-col justify-center text-center"><h2 className="text-3xl font-black text-red-500 mb-6">THE CABIN RULES</h2><p className="text-lg text-slate-300 mb-8">One Killer. One Ghost. Trust No One.</p><button onClick={()=>updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${user.uid}`), { hasReadRules: true })} className="w-full bg-red-600 py-5 rounded-xl font-black text-xl shadow-lg">READY</button></div>;

  if(gameState.status === 'lobby') return <div className="p-6 h-full overflow-y-auto pb-32 relative z-30">{playerState.hasSubmittedDossier ? <div className="h-full flex items-center justify-center text-center"><CheckCircle className="w-20 h-20 text-green-500 mb-6" /><div className="text-2xl font-bold">Dossier Secured.</div></div> : <div className="space-y-8"><h2 className="text-2xl font-black text-white">INTAKE</h2><textarea className="w-full bg-slate-900 border border-slate-700 rounded p-4 text-white" placeholder="Start a Rumor..." onChange={e=>setForm({...form, rumor: e.target.value})} /><textarea className="w-full bg-slate-900 border border-slate-700 rounded p-4 text-white" placeholder="Killer Description..." onChange={e=>setForm({...form, descriptionText: e.target.value})} /><CameraCapture onSave={d=>setForm({...form, mugshot: d})} /><button disabled={!form.mugshot} onClick={()=>send({ dossier: form, hasSubmittedDossier: true })} className="w-full bg-red-600 py-5 rounded-xl font-black">SUBMIT</button></div>}</div>;

  if(gameState.status === 'brainstorm') return <div className="p-6 h-full flex flex-col"><h2 className="text-2xl font-bold mb-4">ADD WEAPONS</h2><div className="flex gap-2 mb-4"><input className="flex-1 bg-slate-800 rounded p-4 text-white" value={wInput} onChange={e=>setWInput(e.target.value)} placeholder="e.g. Flare Gun" /><button onClick={async ()=>{if(!wInput) return; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${user.uid}`), { submittedWeapons: arrayUnion(wInput) }); setWInput("");}} className="bg-blue-600 px-6 rounded font-bold">ADD</button></div><button onClick={()=>send({hasSubmittedWeapons:true})} className="mt-auto w-full bg-white text-black py-4 rounded font-black">FINISHED</button></div>;

  if(gameState.status === 'round1_suspect') return <div className="p-4 grid grid-cols-2 gap-4 h-full">{gameState.players.map(p => <button key={p.uid} onClick={()=>send({ r1Suspect: p.uid })} className="bg-slate-800 p-4 rounded-xl font-bold flex flex-col items-center">{mugshots[p.uid] && <img src={mugshots[p.uid]} className="w-16 h-16 rounded-full mb-2 object-cover"/>}{p.name}</button>)}</div>;
  if(gameState.status === 'round1_weapon') return <div className="p-4 grid grid-cols-2 gap-4 h-full">{gameState.possibleWeapons.map(w => <button key={w} onClick={()=>send({ r1Weapon: w })} className="bg-slate-800 p-4 rounded-xl text-sm font-bold">{w}</button>)}</div>;
  if(gameState.status === 'round2') return <div className="p-4 flex flex-col items-center h-full"><h2 className="font-bold mb-4 text-xl uppercase">Sketch the Killer</h2><div className="bg-slate-800 p-4 rounded mb-4 text-sm w-full">{gameState.sketchPrompts?.map((t,i) => <div key={i} className="mb-1 text-white border-l-2 border-red-500 pl-2">"{t}"</div>)}</div><DrawingCanvas onSave={d=>send({ sketch: d })} /></div>;

  if(gameState.status === 'lineup') return <div className="p-4 h-full"><h2 className="text-white font-bold mb-4 text-center">VOTE FOR SKETCH</h2><div className="grid grid-cols-2 gap-4">{sketches.map(s => <button key={s.id} onClick={() => s.id !== user.uid && send({ sketchVote: s.id })} disabled={s.id === user.uid} className="bg-white p-1 rounded aspect-square"><img src={s.url} className="w-full h-full object-cover" /></button>)}</div></div>;
  if(gameState.status === 'role_reveal') return <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-900">{!showRole ? <button onClick={()=>setShowRole(true)} className="w-64 h-64 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold shadow-2xl border-4 border-slate-700">REVEAL ROLE</button> : <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8"><h1 className={`text-5xl font-black mb-4 ${playerState.isMurderer?'text-red-600':'text-blue-500'}`}>{playerState.isMurderer?"MURDERER":"INNOCENT"}</h1><button onClick={()=>setShowRole(false)} className="mt-12 text-slate-500 underline">Hide</button></div>}</div>;

  if(gameState.status === 'round4_exchange') {
      const currentCard = playerState.hand && playerState.hand[cardIdx];
      if(!currentCard) return <div className="h-full flex items-center justify-center text-slate-500">Wait...</div>;
      return <div className="p-6 h-full flex flex-col"><h2 className="text-center font-bold mb-4 uppercase">Rumor Mill</h2><div className="bg-white text-black p-4 rounded mb-6 text-lg font-serif">"{currentCard.text}"</div>{playerState.isMurderer ? <textarea className="w-full h-24 bg-slate-800 text-white p-3 rounded mb-4" value={rumorEdit} onChange={e=>setRumorEdit(e.target.value)} placeholder="Rewrite this rumor..." /> : <textarea className="w-full h-24 bg-slate-800 text-white p-3 rounded mb-4" value={rumorNote} onChange={e=>setRumorNote(e.target.value)} placeholder="Type original rumor exactly..." />}<select className="w-full bg-slate-800 p-4 rounded mb-4 text-white" onChange={e=>setTargetId(e.target.value)} value={targetId}><option value="">Send To...</option>{gameState.players.filter(p=>p.uid!==user.uid).map(p=><option key={p.uid} value={p.uid}>{p.name}</option>)}</select><button disabled={!targetId} onClick={async ()=>{ const txt = playerState.isMurderer ? rumorEdit : rumorNote; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${targetId}`), { inbox: arrayUnion({ text: txt, fromName: playerState.name }) }); setRumorEdit(""); setRumorNote(""); setTargetId(""); if(cardIdx===0) setCardIdx(1); else send({finishedExchange:true}); }} className="w-full bg-blue-600 py-4 rounded font-bold">SEND</button></div>;
  }

  if(gameState.status === 'round4_debate') return <div className="p-6 h-full overflow-y-auto"><h2 className="text-2xl font-bold mb-4 border-b border-slate-700 pb-2">INBOX</h2><div className="space-y-4">{playerState.inbox?.map((msg, i) => (<div key={i} className="bg-slate-800 p-4 rounded border-l-4 border-blue-500"><div className="text-xs text-slate-400 mb-1">From: {msg.fromName}</div><p className="text-white font-serif">"{msg.text}"</p></div>))}</div></div>;
  if(gameState.status === 'killing_round') return <div className="p-6 h-full flex flex-col justify-center">{playerState.isMurderer ? <div className="grid grid-cols-2 gap-4"><h2 className="col-span-2 text-center text-red-600 font-black mb-4">KILL SOMEONE</h2>{gameState.players.filter(p=>p.uid!==user.uid).map(p=>(<button key={p.uid} onClick={()=>send({ victimChoice: p.uid })} className="bg-red-900 p-6 rounded font-bold">{p.name}</button>))}</div> : <p className="text-center animate-pulse">Kiler is choosing...</p>}</div>;
  if(gameState.status === 'killing_reveal') return <div className="h-full flex flex-col items-center justify-center p-6 text-center">{playerState.isGhost ? <><Ghost className="w-24 h-24 text-blue-300 mb-4"/><h1 className="text-4xl font-bold">YOU ARE DEAD</h1></> : <h1 className="text-3xl font-bold">YOU SURVIVED</h1>}</div>;

  if(gameState.status === 'weapon_clues_murderer' || gameState.status === 'weapon_clues_ghost') {
      const isMyTurn = (gameState.status === 'weapon_clues_murderer' && playerState.isMurderer) || (gameState.status === 'weapon_clues_ghost' && playerState.isGhost);
      if(isMyTurn) return <div className="p-6 h-full flex flex-col justify-center text-center"><div className="text-red-500 font-bold mb-2">WEAPON: {gameState.murderWeapon}</div><input className="w-full bg-slate-800 p-4 rounded mb-4 text-white" placeholder="One word clue..." onChange={e=>setWeaponClue(e.target.value)}/><button onClick={async ()=>{setWaiting(true); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', `${gameId}_${user.uid}`), { weaponClue }); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId), { weaponClues: arrayUnion({type: playerState.isMurderer ? 'KILLER' : 'GHOST', text: weaponClue}) });}} className="w-full bg-red-600 py-4 rounded font-bold">SEND</button></div>;
      return <div className="p-6 h-full flex flex-col justify-center"><h2 className="text-xl font-bold mb-4 uppercase">Journal</h2><textarea className="w-full h-32 bg-slate-800 text-white p-3 rounded" value={busyWork} onChange={e=>setBusyWork(e.target.value)} /><button onClick={()=>setBusyWork("")} className="w-full bg-slate-700 py-3 rounded mt-4 font-bold">SAVE</button></div>;
  }

  if(gameState.status === 'voting') return <div className="p-4 h-full"><h2 className="font-bold mb-4 text-red-500 uppercase">Final Vote</h2><div className="grid grid-cols-2 gap-2 mb-6">{gameState.players.map(p=><button key={p.uid} onClick={()=>setVote({...vote, suspect: p.uid})} className={`p-4 rounded border ${vote.suspect===p.uid?'bg-red-600':'bg-slate-800'} flex flex-col items-center`}>{mugshots[p.uid] && <img src={mugshots[p.uid]} className="w-12 h-12 rounded-full mb-1 object-cover"/>}{p.name}</button>)}</div>{!playerState.isGhost && <div className="grid grid-cols-2 gap-2 mb-6">{gameState.possibleWeapons.map(w=><button key={w} onClick={()=>setVote({...vote, weapon: w})} className={`p-2 rounded border text-xs ${vote.weapon===w?'bg-blue-600':'bg-slate-800'}`}>{w}</button>)}</div>}<button disabled={!vote.suspect} onClick={()=>send({ finalVote: vote })} className="w-full bg-white text-black py-5 rounded font-black">CAST VOTE</button></div>;

  return <div className="h-full flex items-center justify-center text-slate-500 animate-pulse uppercase">Watch TV...</div>;
};