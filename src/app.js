import React from 'react';

export default function App() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      backgroundColor: '#121212', 
      color: '#00d4ff', 
      fontFamily: 'sans-serif' 
    }}>
      <h1 style={{ fontSize: '3rem' }}>BRANBOX HUB: ONLINE</h1>
      <p style={{ color: 'white', fontSize: '1.2rem' }}>
        If you see this, your Main Brain is working perfectly.
      </p>
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        border: '2px solid #00d4ff', 
        borderRadius: '10px' 
      }}>
        <p>Next Step: Rename folders to remove colons, then add games back.</p>
      </div>
    </div>
  );
}