import React from 'react';
import { 
  CheckSquare, 
  ChevronDown, 
  Image, 
  ThumbsUp, 
  Mail, 
  Phone, 
  Calendar, 
  Globe, 
  AlignLeft, 
  FileText, 
  Hash, 
  Upload, 
  Star, 
  BarChart2, 
  Award, 
  Grid,
  CalendarCheck,
  AlertCircle
} from 'lucide-react';
import './QuestionTypePickerModal.css';

export const QUESTION_TYPES = [
  // ESCOLHAS
  { id: 'multiple_choice', category: 'ESCOLHAS', label: 'Múltipla escolha', icon: CheckSquare, defaultTitle: 'Qual opção melhor representa...' },
  { id: 'dropdown', category: 'ESCOLHAS', label: 'Menu suspenso', icon: ChevronDown, defaultTitle: 'Selecione uma opção' },
  { id: 'image_choice', category: 'ESCOLHAS', label: 'Escolha de imagem', icon: Image, defaultTitle: 'Selecione a imagem desejada' },
  { id: 'yes_no', category: 'ESCOLHAS', label: 'Sim/Não', icon: ThumbsUp, defaultTitle: 'Você confirma esta opção?' },

  // INFORMAÇÕES DE CONTATO
  { id: 'email', category: 'INFORMAÇÕES DE CONTATO', label: 'Email', icon: Mail, defaultTitle: 'Qual é o seu e-mail? *' },
  { id: 'phone', category: 'INFORMAÇÕES DE CONTATO', label: 'Telefone', icon: Phone, defaultTitle: 'Qual é o seu WhatsApp? *' },
  { id: 'date', category: 'INFORMAÇÕES DE CONTATO', label: 'Data', icon: Calendar, defaultTitle: 'Qual é a melhor data?' },
  { id: 'website', category: 'INFORMAÇÕES DE CONTATO', label: 'Website', icon: Globe, defaultTitle: 'Qual é o seu site ou link?' },

  // TEXTO E NÚMERO
  { id: 'short_text', category: 'TEXTO E NÚMERO', label: 'Texto curto', icon: AlignLeft, defaultTitle: 'Qual é o seu nome completo?' },
  { id: 'long_text', category: 'TEXTO E NÚMERO', label: 'Texto Longo', icon: FileText, defaultTitle: 'Conte brevemente sobre o seu caso' },
  { id: 'number', category: 'TEXTO E NÚMERO', label: 'Número', icon: Hash, defaultTitle: 'Informe um valor numérico' },

  // ESTRUTURA & TÉRMINO
  { 
    id: 'statement', 
    category: 'ESTRUTURA & TÉRMINO', 
    label: 'Mensagem de Término / Desqualificação', 
    icon: AlertCircle, 
    defaultTitle: 'Obrigado pelo seu tempo',
    defaultPlaceholder: 'Infelizmente você não atende aos requisitos desta etapa no momento.',
    buttonText: 'Finalizar'
  },

  // AVALIAÇÃO E ESCALAS
  { id: 'rating', category: 'AVALIAÇÃO E ESCALAS', label: 'Avaliação', icon: Star, defaultTitle: 'Como você avalia nosso atendimento?' },

  // ARQUIVO
  { id: 'file_upload', category: 'ARQUIVO', label: 'Upload de arquivo', icon: Upload, defaultTitle: 'Envie seu documento ou comprovante' },

  // INTEGRAÇÕES
  { id: 'google_calendar', category: 'INTEGRAÇÕES', label: 'Google Agenda', icon: CalendarCheck, defaultTitle: 'Agende uma data e horário no Google Agenda' },
];


export default function QuestionTypePickerModal({ isOpen, onClose, onSelectType }) {
  if (!isOpen) return null;

  const categories = [
    'ESCOLHAS',
    'INFORMAÇÕES DE CONTATO',
    'TEXTO E NÚMERO',
    'ESTRUTURA & TÉRMINO',
    'AVALIAÇÃO E ESCALAS',
    'ARQUIVO',
    'INTEGRAÇÕES',
  ];

  return (
    <div className="type-picker-overlay" data-testid="question-type-picker-overlay">
      <div 
        className="type-picker-card" 
        data-testid="question-type-picker-card"
      >
        <div className="type-picker-header">
          <h3>Selecione o tipo de questão</h3>
          <button type="button" className="type-picker-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="type-picker-grid">
          {categories.map((category) => {
            const items = QUESTION_TYPES.filter((q) => q.category === category);
            if (!items.length) return null;
            return (
              <div key={category} className="type-category-group">
                <span className="type-category-title">{category}</span>
                <div className="type-category-list">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="type-option-item"
                        onClick={() => {
                          onSelectType(item);
                          onClose();
                        }}
                        data-testid={`question-type-${item.id}`}
                      >
                        <div className={`type-icon-wrapper type-cat-${category.toLowerCase().replace(/[^a-z0-9]/g, '')}`}>
                          <Icon size={16} />
                        </div>
                        <span className="type-option-label">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
