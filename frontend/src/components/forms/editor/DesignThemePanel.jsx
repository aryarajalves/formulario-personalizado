import React from 'react';
import { Palette, Sun, Moon, Sparkles, RotateCcw } from 'lucide-react';
import './DesignThemePanel.css';

export const PRESET_THEMES = [
  {
    id: 'dark-default',
    name: 'Escuro Clássico',
    primaryColor: '#3b82f6',
    backgroundColor: '#090d16',
    cardColor: '#1e293b',
    textColor: '#f8fafc',
    buttonTextColor: '#ffffff'
  },
  {
    id: 'neon-violet',
    name: 'Violeta Neon',
    primaryColor: '#8b5cf6',
    backgroundColor: '#0f0a1c',
    cardColor: '#1a103c',
    textColor: '#f3e8ff',
    buttonTextColor: '#ffffff'
  },
  {
    id: 'emerald-flow',
    name: 'Esmeralda Moderno',
    primaryColor: '#10b981',
    backgroundColor: '#061a14',
    cardColor: '#0c2e24',
    textColor: '#ecfdf5',
    buttonTextColor: '#ffffff'
  },
  {
    id: 'sunset-orange',
    name: 'Pôr do Sol',
    primaryColor: '#f97316',
    backgroundColor: '#180c06',
    cardColor: '#2b170c',
    textColor: '#fff7ed',
    buttonTextColor: '#ffffff'
  },
  {
    id: 'light-clean',
    name: 'Claro Minimalista',
    primaryColor: '#2563eb',
    backgroundColor: '#f8fafc',
    cardColor: '#ffffff',
    textColor: '#0f172a',
    buttonTextColor: '#ffffff'
  },
  {
    id: 'rose-blush',
    name: 'Rosa Elegante',
    primaryColor: '#ec4899',
    backgroundColor: '#190a14',
    cardColor: '#2d1225',
    textColor: '#fdf2f8',
    buttonTextColor: '#ffffff'
  }
];

export default function DesignThemePanel({
  theme = {},
  onUpdateTheme,
  saving
}) {
  const currentTheme = {
    primaryColor: theme?.primaryColor || '#3b82f6',
    backgroundColor: theme?.backgroundColor || '#090d16',
    textColor: theme?.textColor || '#f8fafc',
    buttonTextColor: theme?.buttonTextColor || '#ffffff',
    ...theme
  };

  const handleApplyPreset = (preset) => {
    onUpdateTheme({
      primaryColor: preset.primaryColor,
      backgroundColor: preset.backgroundColor,
      textColor: preset.textColor,
      buttonTextColor: preset.buttonTextColor
    });
  };

  const handleResetToDefault = () => {
    handleApplyPreset(PRESET_THEMES[0]);
  };

  return (
    <div className="design-theme-panel" data-testid="design-theme-panel">
      <div className="design-panel-header">
        <div className="design-header-title">
          <Palette size={16} className="design-icon" />
          <span>Aparência e Cores</span>
        </div>
        <button
          type="button"
          className="design-reset-btn"
          onClick={handleResetToDefault}
          title="Restaurar padrão"
          data-testid="reset-theme-btn"
        >
          <RotateCcw size={13} />
          <span>Padrão</span>
        </button>
      </div>

      <div className="design-section">
        <label className="design-section-label">
          <Sparkles size={13} />
          <span>TEMAS PRÉ-DEFINIDOS</span>
        </label>
        <div className="design-presets-grid">
          {PRESET_THEMES.map((preset) => {
            const isSelected = 
              currentTheme.primaryColor === preset.primaryColor &&
              currentTheme.backgroundColor === preset.backgroundColor;

            return (
              <button
                key={preset.id}
                type="button"
                className={`preset-card ${isSelected ? 'active' : ''}`}
                onClick={() => handleApplyPreset(preset)}
                data-testid={`preset-${preset.id}`}
              >
                <div 
                  className="preset-preview-pill"
                  style={{ background: preset.backgroundColor }}
                >
                  <span 
                    className="preset-dot"
                    style={{ background: preset.primaryColor }}
                  />
                  <span 
                    className="preset-line"
                    style={{ background: preset.textColor }}
                  />
                </div>
                <span className="preset-name">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="design-section">
        <label className="design-section-label">
          <span>CORES PERSONALIZADAS</span>
        </label>

        <div className="design-color-items">
          {/* Cor Principal / Destaque */}
          <div className="color-field-row">
            <div className="color-info">
              <span className="color-title">Cor Principal / Botões</span>
              <span className="color-desc">Destaque de botões, números e foco</span>
            </div>
            <div className="color-picker-wrap">
              <input
                type="color"
                className="color-input"
                value={currentTheme.primaryColor}
                onChange={(e) => onUpdateTheme({ primaryColor: e.target.value })}
                data-testid="picker-primaryColor"
              />
              <span className="color-hex-tag">{currentTheme.primaryColor}</span>
            </div>
          </div>

          {/* Cor de Fundo */}
          <div className="color-field-row">
            <div className="color-info">
              <span className="color-title">Cor de Fundo da Tela</span>
              <span className="color-desc">Plano de fundo de todo o formulário</span>
            </div>
            <div className="color-picker-wrap">
              <input
                type="color"
                className="color-input"
                value={currentTheme.backgroundColor}
                onChange={(e) => onUpdateTheme({ backgroundColor: e.target.value })}
                data-testid="picker-backgroundColor"
              />
              <span className="color-hex-tag">{currentTheme.backgroundColor}</span>
            </div>
          </div>

          {/* Cor do Texto Principal */}
          <div className="color-field-row">
            <div className="color-info">
              <span className="color-title">Cor dos Textos</span>
              <span className="color-desc">Títulos das perguntas e descrições</span>
            </div>
            <div className="color-picker-wrap">
              <input
                type="color"
                className="color-input"
                value={currentTheme.textColor}
                onChange={(e) => onUpdateTheme({ textColor: e.target.value })}
                data-testid="picker-textColor"
              />
              <span className="color-hex-tag">{currentTheme.textColor}</span>
            </div>
          </div>

          {/* Cor do Texto do Botão */}
          <div className="color-field-row">
            <div className="color-info">
              <span className="color-title">Texto do Botão</span>
              <span className="color-desc">Cor da fonte nos botões principais</span>
            </div>
            <div className="color-picker-wrap">
              <input
                type="color"
                className="color-input"
                value={currentTheme.buttonTextColor}
                onChange={(e) => onUpdateTheme({ buttonTextColor: e.target.value })}
                data-testid="picker-buttonTextColor"
              />
              <span className="color-hex-tag">{currentTheme.buttonTextColor}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
