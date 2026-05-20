import React, { useState } from 'react';
import { Camera, ReceiptText, CheckCircle2 } from 'lucide-react';

const Scanner = ({ onScanComplete }) => {
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setSuccess(false);

    // Symulacja skanowania AI
    setTimeout(() => {
      setScanning(false);
      setSuccess(true);
      
      const mockedItems = [
        { id: 1, name: 'Mleko 3.2%', daysLeft: 4, icon: 'Milk' },
        { id: 2, name: 'Pomidory Maliniaki', daysLeft: 2, icon: 'Apple' },
        { id: 3, name: 'Jajka z wolnego wybiegu', daysLeft: 7, icon: 'Egg' },
        { id: 4, name: 'Marchew', daysLeft: 10, icon: 'Carrot' }
      ];
      
      onScanComplete(mockedItems);
      
      setTimeout(() => setSuccess(false), 3000);
    }, 2500);
  };

  return (
    <div className="glass-card fade-in">
      <div className="card-header">
        <Camera size={28} color="var(--primary)" />
        <h2 className="card-title">Skaner AI (Paragony)</h2>
      </div>

      <div style={{ textAlign: 'center', margin: '1rem 0' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Zrób zdjęcie paragonu, a nasz model NLP automatycznie przypisze produkty i daty ważności.
        </p>

        {scanning ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Model analizuje tekst z paragonu...</p>
          </div>
        ) : success ? (
          <div className="loader-container fade-in">
            <CheckCircle2 size={48} color="var(--success)" />
            <p style={{ color: 'var(--success)', fontWeight: 'bold' }}>Ukończono! Dodano produkty.</p>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={handleScan}>
            <ReceiptText size={20} />
            Symuluj Skanowanie Paragonu
          </button>
        )}
      </div>
    </div>
  );
};

export default Scanner;
