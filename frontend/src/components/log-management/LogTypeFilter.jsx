import React from 'react';
import { Info, AlertTriangle, AlertCircle, Globe, ListFilter } from 'lucide-react';

export default function LogTypeFilter({ currentFilter, onSelectFilter, counts }) {
  const filterOptions = [
    { id: 'all', label: 'Todos', icon: ListFilter, count: counts.all, color: '#64748b' },
    { id: 'info', label: 'Info', icon: Info, count: counts.info, color: '#38bdf8' },
    { id: 'warning', label: 'Avisos', icon: AlertTriangle, count: counts.warning, color: '#f59e0b' },
    { id: 'error', label: 'Erros', icon: AlertCircle, count: counts.error, color: '#ef4444' },
    { id: 'http', label: 'HTTP', icon: Globe, count: counts.http, color: '#10b981' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        padding: '12px 18px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        marginBottom: '14px',
      }}
      data-testid="log-type-filter-bar"
    >
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginRight: '4px' }}>
        Separar por tipo:
      </span>
      {filterOptions.map((opt) => {
        const IconComponent = opt.icon;
        const isActive = currentFilter === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectFilter(opt.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: isActive ? `1.5px solid ${opt.color}` : '1px solid #e2e8f0',
              backgroundColor: isActive ? 'rgba(2, 132, 199, 0.08)' : '#f8fafc',
              color: isActive ? '#0f172a' : '#64748b',
            }}
            data-testid={`filter-btn-${opt.id}`}
          >
            <IconComponent size={14} color={opt.color} />
            <span>{opt.label}</span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '10px',
                backgroundColor: isActive ? opt.color : '#e2e8f0',
                color: isActive ? '#ffffff' : '#475569',
                fontWeight: 700,
                minWidth: '18px',
                textAlign: 'center',
              }}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
