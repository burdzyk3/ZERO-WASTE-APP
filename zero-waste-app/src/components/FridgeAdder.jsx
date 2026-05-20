import React, { useState } from 'react';
import { Plus, Sparkles, Loader } from 'lucide-react';

const FridgeAdder = ({ onAddItems }) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('http://localhost:8888/api/analyze-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText.trim(),
          model_name: 'llama3.2' // Używamy mądrego modelu 3B zamiast słabego 0.5B
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.detail || 'Błąd serwera podczas analizy składników.';
        const err = new Error(msg);
        err.isValidationError = true;
        throw err;
      }

      const analyzedProducts = await response.json();
      
      // Dodajemy losowe unikalne ID do każdego produktu z backendu
      const productsWithId = analyzedProducts.map(p => ({
        ...p,
        id: Date.now() + Math.random()
      }));

      onAddItems(productsWithId);
      setInputText('');
    } catch (err) {
      console.error(err);
      
      if (err.isValidationError) {
        // Jeśli to świadomy błąd walidacji z serwera, po prostu go wyświetlamy i nie dodajemy niczego
        setErrorMsg(err.message);
      } else {
        // Awaryjny fallback na wypadek gdyby serwer był całkowicie offline (błędy połączenia sieciowego)
        const fallbackProducts = inputText
          .split(/[,;+\n]/)
          .map(p => p.trim())
          .filter(p => p.length > 0)
          .map((p, idx) => {
            let icon = 'Apple';
            let days = 7;
            const clean = p.toLowerCase();
            
            const isMilk = clean.includes('mlek') || clean.startsWith('ser') || clean.includes(' ser') || clean.includes('jogurt') || clean.includes('masl');
            const isEgg = clean.includes('kura') || (clean.includes('mies') && !clean.includes('mieszk')) || clean.includes('jaj') || clean.includes('szynk') || clean.includes('ryba') || clean.includes('ryby');
            const isCarrot = clean.includes('pomidor') || clean.includes('marchew') || clean.includes('ogór') || clean.includes('ogor') || clean.includes('sałat') || clean.includes('salat');
            
            if (isMilk) {
              icon = 'Milk';
              days = 5;
            } else if (isEgg) {
              icon = 'Egg';
              days = 3;
            } else if (isCarrot) {
              icon = 'Carrot';
              days = 4;
            }
            
            return {
              id: Date.now() + idx,
              name: p.charAt(0).toUpperCase() + p.slice(1),
              daysLeft: days,
              icon: icon
            };
          });

        onAddItems(fallbackProducts);
        setInputText('');
        setErrorMsg('Serwer backendu offline! Daty ważności zostały oszacowane lokalnie (tryb offline).');
      }
      
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card fade-in" style={{ marginBottom: '2rem' }}>
      <div className="card-header">
        <Sparkles size={28} color="var(--primary)" />
        <h2 className="card-title font-semibold">Inteligentne Dodawanie (AI)</h2>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Co kupiłeś? (Wpisz produkty oddzielając je przecinkami):
          </label>
          <textarea
            placeholder="np. mleko, pierś z kurczaka, 4 pomidory, banany..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '0.8rem',
              borderRadius: '12px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(0, 0, 0, 0.2)',
              color: 'var(--text-main)',
              fontSize: '1rem',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
            required
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading || !inputText.trim()}
          style={{ marginTop: '0.5rem' }}
        >
          {loading ? (
            <>
              <Loader className="spinner" size={20} style={{ animation: 'spin 1s linear infinite' }} />
              AI szacuje czas przydatności...
            </>
          ) : (
            <>
              <Plus size={20} />
              Dodaj produkty i oszacuj daty ważności (AI)
            </>
          )}
        </button>
      </form>

      {errorMsg && (
        <div className="fade-in" style={{ 
          marginTop: '1rem', 
          padding: '0.75rem', 
          background: 'rgba(245, 158, 11, 0.1)', 
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '8px',
          color: '#fcd34d',
          fontSize: '0.8rem',
          textAlign: 'center'
        }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default FridgeAdder;
