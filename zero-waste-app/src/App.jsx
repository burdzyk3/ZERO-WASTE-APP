import React, { useState } from 'react';
import Fridge from './components/Fridge';
import Scanner from './components/Scanner';
import FridgeAdder from './components/FridgeAdder';
import RecipeAI from './components/RecipeAI';
import { Leaf } from 'lucide-react';

function App() {
  const [fridgeItems, setFridgeItems] = useState([]);

  const handleScanComplete = (items) => {
    setFridgeItems((prev) => {
      // Unikamy duplikatów przy skanowaniu
      const newItems = items.filter(item => !prev.some(p => p.name.toLowerCase() === item.name.toLowerCase()));
      return [...prev, ...newItems];
    });
  };

  const handleAddItems = (newItems) => {
    setFridgeItems((prev) => {
      // Filtrujemy przedmioty, które już istnieją w lodówce (porównanie po nazwie)
      const uniqueNewItems = newItems.filter(
        newItem => !prev.some(item => item.name.toLowerCase() === newItem.name.toLowerCase())
      );
      
      const duplicatesCount = newItems.length - uniqueNewItems.length;
      if (duplicatesCount > 0) {
        alert(`${duplicatesCount} produkt(ów) pominięto, ponieważ już znajdują się w lodówce.`);
      }
      
      return [...prev, ...uniqueNewItems];
    });
  };

  const handleRemoveItem = (id) => {
    setFridgeItems((prev) => prev.filter(item => item.id !== id));
  };

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }} className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Leaf size={40} color="var(--primary)" />
          <h1>Zero Waste App</h1>
        </div>
        <p className="subtitle">Inteligentne zarządzanie żywnością dzięki AI</p>
      </div>

      <div className="app-container">
        {/* Lewa kolumna - Operacje (Dodawanie ręczne, Skaner, Przepisy) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <FridgeAdder onAddItems={handleAddItems} />
          <Scanner onScanComplete={handleScanComplete} />
          <RecipeAI items={fridgeItems} />
        </div>

        {/* Prawa kolumna - Podgląd stanu lodówki */}
        <div>
          <Fridge items={fridgeItems} onRemoveItem={handleRemoveItem} />
        </div>
      </div>
    </>
  );
}

export default App;
