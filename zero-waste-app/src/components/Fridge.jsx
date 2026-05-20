import React from 'react';
import { Refrigerator, Apple, Egg, Milk, Carrot, Trash2 } from 'lucide-react';

const getIcon = (iconName) => {
  switch (iconName) {
    case 'Apple': return <Apple />;
    case 'Egg': return <Egg />;
    case 'Milk': return <Milk />;
    case 'Carrot': return <Carrot />;
    default: return <Apple />;
  }
};

const getBadgeClass = (days) => {
  if (days <= 2) return 'badge badge-danger';
  if (days <= 5) return 'badge badge-warning';
  return 'badge badge-success';
};

const Fridge = ({ items, onRemoveItem }) => {
  return (
    <div className="glass-card fade-in">
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Refrigerator size={28} color="var(--primary)" />
          <h2 className="card-title">Wirtualna Lodówka</h2>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Suma: {items.length}
        </span>
      </div>
      
      {items.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
          Twoja lodówka jest pusta. Dodaj produkty ręcznie lub skorzystaj z symulatora skanowania paragonu!
        </p>
      ) : (
        <ul className="item-list">
          {items.map((item) => (
            <li key={item.id} className="item">
              <div className="item-info">
                <div className="item-icon">
                  {getIcon(item.icon)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="item-name">{item.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Ważność: {item.daysLeft} {item.daysLeft === 1 ? 'dzień' : item.daysLeft < 5 ? 'dni' : 'dni'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className={getBadgeClass(item.daysLeft)}>
                  {item.daysLeft} d.
                </span>
                {onRemoveItem && (
                  <button 
                    onClick={() => onRemoveItem(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(239, 68, 68, 0.6)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'rgba(239, 68, 68, 1)';
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(239, 68, 68, 0.6)';
                      e.currentTarget.style.background = 'none';
                    }}
                    title="Usuń produkt"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Fridge;
