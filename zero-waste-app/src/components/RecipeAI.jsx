import React, { useState } from 'react';
import { ChefHat, Sparkles, AlertTriangle, Cpu } from 'lucide-react';

const RecipeAI = ({ items }) => {
  const [generating, setGenerating] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedModel, setSelectedModel] = useState('llama3.2');
  const [isDemoMode, setIsDemoMode] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setRecipe(null);
    setErrorMsg(null);
    setIsDemoMode(false);

    try {
      const response = await fetch('http://localhost:8888/api/generate-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            name: item.name,
            daysLeft: item.daysLeft,
            icon: item.icon
          })),
          model_name: selectedModel
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Wystąpił błąd podczas generowania przepisu.');
      }

      const data = await response.json();
      setRecipe(data);
    } catch (err) {
      console.error('Błąd połączenia z backendem:', err);
      
      // Pokazujemy czysty komunikat błędu (bez trybu demo)
      setErrorMsg(
        `Błąd generowania przepisu. Szczegóły: ${err.message}`
      );
    } finally {
      setGenerating(false);
    }
  };

  const hasUrgentItems = items.some(item => item.daysLeft <= 2);

  return (
    <div className="glass-card fade-in">
      <div className="card-header">
        <ChefHat size={28} color="var(--primary)" />
        <h2 className="card-title">Kreator Przepisów AI</h2>
      </div>

      <div style={{ textAlign: 'center', margin: '1rem 0' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Wykorzystaj generatywną sztuczną inteligencję do stworzenia posiłku z tego, co masz w lodówce.
        </p>

        {/* Sekcja ustawień modelu lokalnego */}
        {!generating && !recipe && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.5rem', 
            marginBottom: '1rem',
            background: 'rgba(255,255,255,0.02)',
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            border: '1px solid var(--glass-border)'
          }}>
            <Cpu size={16} color="var(--text-muted)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Model AI:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="llama3.2" style={{ background: 'var(--bg-dark)' }}>Llama 3.2 3B (Rekomendowany)</option>
              <option value="qwen2.5:1.5b" style={{ background: 'var(--bg-dark)' }}>Qwen 2.5 1.5B</option>
              <option value="qwen2.5:0.5b" style={{ background: 'var(--bg-dark)' }}>Qwen 2.5 0.5B (Lekki)</option>
              <option value="phi3" style={{ background: 'var(--bg-dark)' }}>Phi-3 Mini (3.8B)</option>
            </select>
          </div>
        )}

        {!generating && !recipe && (
          <button 
            className="btn btn-secondary" 
            onClick={handleGenerate}
            disabled={items.length === 0}
          >
            <Sparkles size={20} color={hasUrgentItems ? "var(--warning)" : "currentColor"} />
            Zaproponuj Przepis (Lokalne AI)
          </button>
        )}

        {generating && (
          <div className="loader-container fade-in">
            <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.1)', borderLeftColor: 'var(--primary)' }}></div>
            <p>Generowanie przepisu w modelu <strong>{selectedModel}</strong>...</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lokalne generowanie na Twoim CPU/GPU może zająć chwilę.</p>
          </div>
        )}

        {errorMsg && !isDemoMode && (
          <div className="fade-in" style={{ 
            margin: '1rem 0', 
            padding: '1rem', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            color: '#fca5a5',
            fontSize: '0.85rem',
            textAlign: 'left',
            display: 'flex',
            gap: '0.75rem'
          }}>
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong>Błąd serwera:</strong> {errorMsg}

            </div>
          </div>
        )}

        {recipe && (
          <div className="recipe-content fade-in" style={{ textAlign: 'left' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {recipe.title}
              {isDemoMode && <span style={{ fontSize: '0.7rem', background: 'rgba(245,158,11,0.2)', color: 'var(--warning)', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>Demo Mode</span>}
            </h3>
            <p style={{ fontStyle: 'italic', color: 'var(--success)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {recipe.description}
            </p>
            
            <h4 style={{ marginBottom: '0.5rem' }}>Składniki w przepisie:</h4>
            <ul style={{ paddingLeft: '1rem' }}>
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>{ing}</li>
              ))}
            </ul>
            
            <h4 style={{ margin: '1rem 0 0.5rem 0' }}>Instrukcja przygotowania:</h4>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{recipe.steps}</p>

            <button 
              className="btn btn-secondary" 
              style={{ marginTop: '1.5rem' }}
              onClick={() => {
                setRecipe(null);
                setErrorMsg(null);
                setIsDemoMode(false);
              }}
            >
              Generuj kolejny przepis
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeAI;
