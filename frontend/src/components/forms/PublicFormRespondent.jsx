import React, { useState, useEffect } from 'react';
import { Check, ArrowRight, Sparkles, Loader2, CheckCircle2, ChevronDown, AlertCircle, ExternalLink } from 'lucide-react';
import './PublicFormRespondent.css';
import { evaluateNextQuestionIndex } from '../../utils/logicJump';
import { COUNTRY_CODES } from '../../constants/countryCodes';

export default function PublicFormRespondent({ slug }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedDdi, setSelectedDdi] = useState('+55');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [inWelcomeScreen, setInWelcomeScreen] = useState(false);
  const [responseId, setResponseId] = useState(null);

  useEffect(() => {
    fetchPublicForm();
  }, [slug]);

  const fetchPublicForm = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/forms/public/${slug}`);
      if (!res.ok) {
        throw new Error('Formulário não encontrado ou inativo.');
      }
      const data = await res.json();
      setForm(data);
      if (data?.welcome_screen?.enabled) {
        setInWelcomeScreen(true);
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar o formulário.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setFieldError('');
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    setFieldError('');
    const questions = form?.questions || [];
    const currentQ = questions[currentStep];
    const rawVal = answers[currentQ?.id] ? String(answers[currentQ.id]).trim() : '';

    // Se obrigatória e sem resposta
    if (currentQ?.required && !rawVal) {
      setFieldError('Por favor, responda esta questão antes de avançar.');
      return;
    }
    if (rawVal) {
      // Validação de E-mail
      if (currentQ?.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(rawVal)) {
          setFieldError('Por favor, insira um endereço de e-mail válido (ex: seuemail@dominio.com).');
          return;
        }
      }

      // Validação de Telefone (DDD + Número)
      if (currentQ?.type === 'phone') {
        const digitsOnly = rawVal.replace(/\D/g, '');
        // Validação mínima para Brasil (10 a 11 dígitos: DDD + 8 ou 9 dígitos)
        if (selectedDdi === '+55' && (digitsOnly.length < 10 || digitsOnly.length > 11)) {
          setFieldError('Informe um número de telefone com DDD válido (10 ou 11 dígitos, ex: 11 98888-7777).');
          return;
        }
        if (digitsOnly.length < 7) {
          setFieldError('Número de telefone muito curto. Verifique o número digitado.');
          return;
        }
      }
    }

    const nextStep = evaluateNextQuestionIndex(currentStep, questions, answers);
    if (nextStep < questions.length) {
      setCurrentStep(nextStep);
      savePartialProgress(nextStep);
    } else {
      handleSubmit();
    }
  };

  const getFormattedAnswers = () => {
    const questions = form?.questions || [];
    return questions
      .filter(q => answers[q.id] !== undefined && answers[q.id] !== '')
      .map(q => {
        let val = answers[q.id] || '';
        if (q.type === 'phone' && val) {
          if (!val.startsWith('+')) {
            val = `${selectedDdi} ${val.trim()}`;
          }
        }
        return {
          question_id: q.id,
          question_title: q.title,
          answer: val
        };
      });
  };

  const savePartialProgress = async (stepIndex) => {
    try {
      const formattedAnswers = getFormattedAnswers();
      if (formattedAnswers.length === 0) return;

      const res = await fetch(`/api/v1/forms/public/${slug}/save-partial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_id: responseId,
          answers: formattedAnswers,
          current_step: stepIndex
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.response_id && !responseId) {
          setResponseId(data.response_id);
        }
      }
    } catch {
      // Falhas silenciosas em auto-save não interrompem o usuário
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const questions = form?.questions || [];
      const formattedAnswers = questions.map(q => {
        let val = answers[q.id] || '';
        if (q.type === 'phone' && val) {
          if (!val.startsWith('+')) {
            val = `${selectedDdi} ${val.trim()}`;
          }
        }
        return {
          question_id: q.id,
          question_title: q.title,
          answer: val
        };
      });

      const res = await fetch(`/api/v1/forms/public/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_id: responseId,
          answers: formattedAnswers
        })
      });

      if (!res.ok) {
        throw new Error('Falha ao enviar respostas.');
      }

      setCompleted(true);
    } catch (err) {
      alert(err.message || 'Erro ao enviar o formulário.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="public-form-screen loading">
        <Loader2 className="spinner-icon" size={36} />
        <span>Carregando formulário...</span>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="public-form-screen error">
        <h2>Formulário indisponível</h2>
        <p>{error || 'Este formulário não está acessível no momento.'}</p>
      </div>
    );
  }

  if (completed) {
    const finalScreen = form?.ending_screens && form.ending_screens.length > 0
      ? form.ending_screens[0]
      : null;

    return (
      <div className="public-form-screen completed">
        <div className="completion-card">
          <CheckCircle2 size={56} className="completion-icon" />
          <h2>{finalScreen?.title || 'Obrigado por responder!'}</h2>
          <p>{finalScreen?.description || 'Suas respostas foram registradas com sucesso no sistema.'}</p>
          
          {finalScreen?.button_text && finalScreen?.button_url && (
            <div className="completion-redirect-action">
              <a
                href={finalScreen.button_url.startsWith('http') ? finalScreen.button_url : `https://${finalScreen.button_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="public-redirect-btn"
                data-testid="completion-redirect-btn"
              >
                <span>{finalScreen.button_text}</span>
                <ExternalLink size={16} />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }


  if (inWelcomeScreen && form?.welcome_screen?.enabled) {
    const welcome = form.welcome_screen;
    return (
      <div 
        className="public-form-screen welcome-screen" 
        style={{
          background: form?.theme?.backgroundColor || '#090d16',
          color: form?.theme?.textColor || '#f8fafc'
        }}
        data-testid="public-welcome-screen"
      >
        <div className="public-welcome-card">
          <h1 className="public-welcome-title" style={{ color: form?.theme?.textColor || '#ffffff' }}>
            {welcome.title || form.title}
          </h1>
          {welcome.description && (
            <p className="public-welcome-desc">{welcome.description}</p>
          )}

          <div className="public-welcome-action-wrap">
            <button
              type="button"
              className="public-welcome-start-btn"
              style={{
                background: form?.theme?.primaryColor || '#2563eb',
                color: form?.theme?.buttonTextColor || '#ffffff'
              }}
              onClick={() => setInWelcomeScreen(false)}
              data-testid="start-form-btn"
            >
              <span>{welcome.button_text || 'COMEÇAR FORMULÁRIO'}</span>
            </button>
            <span className="public-welcome-hint">Pressione <strong>Enter ↵</strong></span>
          </div>
        </div>
      </div>
    );
  }


  const questions = form.questions || [];
  const currentQ = questions[currentStep] || questions[0];
  const progressPercent = questions.length > 0 ? Math.round(((currentStep + 1) / questions.length) * 100) : 100;

  const themeStyles = {
    '--form-primary': form?.theme?.primaryColor || '#3b82f6',
    '--form-bg': form?.theme?.backgroundColor || '#090d16',
    '--form-text': form?.theme?.textColor || '#f8fafc',
    '--form-btn-text': form?.theme?.buttonTextColor || '#ffffff',
    background: form?.theme?.backgroundColor || '#090d16',
    color: form?.theme?.textColor || '#f8fafc'
  };

  return (
    <div className="public-form-container" style={themeStyles}>
      {/* Barra de Progresso Superior */}
      <div className="public-progress-bar-bg">
        <div 
          className="public-progress-fill" 
          style={{ 
            width: `${progressPercent}%`,
            background: form?.theme?.primaryColor ? `linear-gradient(90deg, ${form.theme.primaryColor}, #60a5fa)` : undefined
          }} 
        />
      </div>

      <header className="public-form-header">

        <span className="public-form-brand">{form.title}</span>
        <span className="public-step-indicator">{currentStep + 1} de {questions.length}</span>
      </header>

      <main className="public-form-main">
        <div className="public-question-card">
          <div className="public-question-header">
            <span className="public-question-num">
              {currentQ?.tag !== undefined && currentQ?.tag !== null && currentQ?.tag !== '' ? currentQ.tag : `${currentStep + 1} →`}
            </span>
            <h1 className="public-question-title">
              {currentQ?.title}
              {currentQ?.required && <span className="public-required-star" title="Obrigatória"> *</span>}
            </h1>
          </div>

          <div className="public-answer-area">
            {/* Múltipla Escolha */}
            {currentQ?.type === 'multiple_choice' && (
              <div className="public-choices-list">
                {['Opção A', 'Opção B', 'Opção C'].map((opt, i) => {
                  const isSelected = answers[currentQ.id] === opt;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`public-choice-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleAnswerChange(currentQ.id, opt)}
                    >
                      <span className="choice-kbd">{String.fromCharCode(65 + i)}</span>
                      <span className="choice-txt">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sim/Não */}
            {currentQ?.type === 'yes_no' && (
              <div className="public-yes-no-row">
                <button
                  type="button"
                  className={`public-choice-btn ${answers[currentQ.id] === 'Sim' ? 'selected' : ''}`}
                  onClick={() => handleAnswerChange(currentQ.id, 'Sim')}
                >
                  <span className="choice-kbd">Y</span>
                  <span className="choice-txt">Sim</span>
                </button>
                <button
                  type="button"
                  className={`public-choice-btn ${answers[currentQ.id] === 'Não' ? 'selected' : ''}`}
                  onClick={() => handleAnswerChange(currentQ.id, 'Não')}
                >
                  <span className="choice-kbd">N</span>
                  <span className="choice-txt">Não</span>
                </button>
              </div>
            )}

            {/* Avaliação Estrelas */}
            {currentQ?.type === 'rating' && (
              <div className="public-rating-row">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`public-star-btn ${(answers[currentQ.id] || 0) >= star ? 'active' : ''}`}
                    onClick={() => handleAnswerChange(currentQ.id, star)}
                  >
                    ★
                  </button>
                ))}
              </div>
            )}

            {/* Google Agenda */}
            {currentQ?.type === 'google_calendar' && (
              <div className="public-google-cal-box">
                <input
                  type="datetime-local"
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                  className="public-input-field"
                  data-testid="calendar-input"
                  autoFocus
                />
              </div>
            )}

            {/* Texto Longo */}
            {currentQ?.type === 'long_text' && (
              <textarea
                value={answers[currentQ.id] || ''}
                onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                placeholder={currentQ?.placeholder || 'Digite sua resposta aqui...'}
                className="public-input-textarea"
                rows={4}
                autoFocus
              />
            )}

            {/* Telefone com Dropdown de DDI */}
            {currentQ?.type === 'phone' && (
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
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder={currentQ?.placeholder || '(11) 98888-7777'}
                  className="public-phone-input"
                  data-testid="phone-input"
                  autoFocus
                />
              </div>
            )}

            {/* Data (Calendário nativo) */}
            {currentQ?.type === 'date' && (
              <input
                type="date"
                value={answers[currentQ.id] || ''}
                onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                className="public-input-field public-date-field"
                data-testid="date-input"
                autoFocus
              />
            )}

            {/* Input Padrão (Texto curto, email, número, etc.) */}
            {!['multiple_choice', 'yes_no', 'rating', 'long_text', 'phone', 'google_calendar', 'date'].includes(currentQ?.type) && (
              <input
                type={currentQ?.type === 'email' ? 'email' : currentQ?.type === 'number' ? 'number' : 'text'}
                value={answers[currentQ.id] || ''}
                onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                placeholder={currentQ?.placeholder || (currentQ?.type === 'email' ? 'nome@exemplo.com' : 'Digite sua resposta...')}
                className="public-input-field"
                data-testid="standard-input"
                autoFocus
              />
            )}


            {/* Mensagem de Erro de Validação Visual */}
            {fieldError && (
              <div className="public-field-error-message" data-testid="field-error-message">
                <AlertCircle size={16} />
                <span>{fieldError}</span>
              </div>
            )}
          </div>


          <div className="public-actions-footer">
            <button
              type="button"
              className="public-next-button"
              style={{
                background: form?.theme?.primaryColor || '#2563eb',
                color: form?.theme?.buttonTextColor || '#ffffff'
              }}
              onClick={handleNext}
              disabled={submitting}
            >
              {submitting ? (

                <span>Enviando...</span>
              ) : currentStep === questions.length - 1 ? (
                <>
                  <span>Finalizar</span>
                  <Check size={16} />
                </>
              ) : (
                <>
                  <span>Avançar</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
            <span className="public-enter-helper">ou pressione <strong>Enter ↵</strong></span>
          </div>
        </div>
      </main>
    </div>
  );
}
