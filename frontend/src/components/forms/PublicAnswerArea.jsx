import React from 'react';
import { ChevronDown, Image as ImageIcon } from 'lucide-react';
import { COUNTRY_CODES } from '../../constants/countryCodes';
import { normalizeQuestionOptions } from '../../utils/logicJump';
import InteractiveBookingCalendar from './calendar/InteractiveBookingCalendar';
import './PublicAnswerArea.css';

export default function PublicAnswerArea({
  currentQ,
  answers,
  selectedDdi,
  setSelectedDdi,
  onAnswerChange,
  onNext,
  formSlug
}) {
  if (!currentQ) return null;

  const currentAnswer = answers[currentQ.id];

  return (
    <div className="public-answer-area">
      {/* Múltipla Escolha */}
      {currentQ.type === 'multiple_choice' && (
        <div className="public-choices-list" data-testid="public-choices-list">
          {normalizeQuestionOptions(currentQ).map((opt, i) => {
            const isSelected = currentAnswer === opt.label || currentAnswer === opt.id;
            return (
              <button
                key={opt.id || i}
                type="button"
                className={`public-choice-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => onAnswerChange(currentQ.id, opt.label)}
                data-testid={`choice-opt-${i}`}
              >
                <span className="choice-kbd">{String.fromCharCode(65 + (i % 26))}</span>
                <span className="choice-txt">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Menu Suspenso (Dropdown) */}
      {currentQ.type === 'dropdown' && (
        <div className="public-dropdown-wrapper">
          <select
            value={currentAnswer || ''}
            onChange={(e) => onAnswerChange(currentQ.id, e.target.value)}
            className="public-input-field public-dropdown-select"
            data-testid="dropdown-select"
            autoFocus
          >
            <option value="">Selecione uma opção...</option>
            {normalizeQuestionOptions(currentQ).map((opt, i) => (
              <option key={opt.id || i} value={opt.label}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Escolha de Imagem */}
      {currentQ.type === 'image_choice' && (
        <div className="public-image-choices-grid" data-testid="image-choices-grid">
          {normalizeQuestionOptions(currentQ).map((opt, i) => {
            const isSelected = currentAnswer === opt.label || currentAnswer === opt.id;
            return (
              <button
                key={opt.id || i}
                type="button"
                className={`public-image-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onAnswerChange(currentQ.id, opt.label)}
                data-testid={`image-opt-${i}`}
              >
                <div className="public-card-image-box">
                  {opt.image_url ? (
                    <img src={opt.image_url} alt={opt.label} />
                  ) : (
                    <ImageIcon size={32} className="public-img-placeholder-icon" />
                  )}
                </div>
                <div className="public-card-label-box">
                  <span className="choice-kbd">{String.fromCharCode(65 + (i % 26))}</span>
                  <span className="choice-txt">{opt.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Sim/Não */}
      {currentQ.type === 'yes_no' && (
        <div className="public-yes-no-row">
          <button
            type="button"
            className={`public-choice-btn ${currentAnswer === 'Sim' ? 'selected' : ''}`}
            onClick={() => onAnswerChange(currentQ.id, 'Sim')}
            data-testid="choice-yes"
          >
            <span className="choice-kbd">Y</span>
            <span className="choice-txt">Sim</span>
          </button>
          <button
            type="button"
            className={`public-choice-btn ${currentAnswer === 'Não' ? 'selected' : ''}`}
            onClick={() => onAnswerChange(currentQ.id, 'Não')}
            data-testid="choice-no"
          >
            <span className="choice-kbd">N</span>
            <span className="choice-txt">Não</span>
          </button>
        </div>
      )}

      {/* Avaliação Estrelas */}
      {currentQ.type === 'rating' && (
        <div className="public-rating-row">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`public-star-btn ${(currentAnswer || 0) >= star ? 'active' : ''}`}
              onClick={() => onAnswerChange(currentQ.id, star)}
            >
              ★
            </button>
          ))}
        </div>
      )}

      {/* Google Agenda */}
      {currentQ.type === 'google_calendar' && (
        <InteractiveBookingCalendar
          formSlug={formSlug}
          value={currentAnswer || ''}
          onChange={(val) => onAnswerChange(currentQ.id, val)}
          onConfirm={onNext}
        />
      )}

      {/* Texto Longo */}
      {currentQ.type === 'long_text' && (
        <textarea
          value={currentAnswer || ''}
          onChange={(e) => onAnswerChange(currentQ.id, e.target.value)}
          placeholder={currentQ.placeholder || 'Digite sua resposta aqui...'}
          className="public-input-textarea"
          rows={4}
          autoFocus
        />
      )}

      {/* Telefone com Dropdown de DDI */}
      {currentQ.type === 'phone' && (
        <div className="public-phone-input-wrapper">
          <div className="public-ddi-select-box">
            <select
              value={selectedDdi}
              onChange={(e) => setSelectedDdi(e.target.value)}
              className="public-ddi-select"
              data-testid="ddi-select"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.name})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="ddi-arrow-icon" />
          </div>
          <input
            type="tel"
            value={currentAnswer || ''}
            onChange={(e) => onAnswerChange(currentQ.id, e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onNext()}
            placeholder={currentQ.placeholder || '(11) 98888-7777'}
            className="public-phone-input"
            data-testid="phone-input"
            autoFocus
          />
        </div>
      )}

      {/* Data (Calendário nativo) */}
      {currentQ.type === 'date' && (
        <input
          type="date"
          value={currentAnswer || ''}
          onChange={(e) => onAnswerChange(currentQ.id, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onNext()}
          className="public-input-field public-date-field"
          data-testid="date-input"
          autoFocus
        />
      )}

      {/* Nó de Término / Declaração (Sem input fields) */}
      {currentQ.type === 'statement' && (
        <div className="public-statement-area" data-testid="public-statement-area">
          <p className="public-statement-message">
            {currentQ.description || currentQ.placeholder || 'Infelizmente você não atende aos requisitos desta etapa no momento.'}
          </p>
        </div>
      )}

      {/* Input Padrão (Texto curto, email, número, website, etc.) */}
      {!['multiple_choice', 'dropdown', 'image_choice', 'yes_no', 'rating', 'long_text', 'phone', 'google_calendar', 'date', 'statement'].includes(currentQ.type) && (
        <input
          type={currentQ.type === 'email' ? 'email' : currentQ.type === 'number' ? 'number' : 'text'}
          value={currentAnswer || ''}
          onChange={(e) => onAnswerChange(currentQ.id, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onNext()}
          placeholder={currentQ.placeholder || (currentQ.type === 'email' ? 'nome@exemplo.com' : 'Digite sua resposta...')}
          className="public-input-field"
          data-testid="standard-input"
          autoFocus
        />
      )}
    </div>
  );
}
