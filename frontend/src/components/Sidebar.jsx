import React from 'react';
import { Database, Users, LogOut, Terminal, FileText, X } from 'lucide-react';

export default function Sidebar({ activeTab = 'users', onSelectTab, user, onLogout, isOpen = false, onClose }) {
  const isSuperAdmin = user?.role === 'superadmin';

  // Categorias de itens do menu
  const sections = [
    {
      title: 'APLICAÇÃO',
      items: [
        { id: 'forms', label: 'Formulários', icon: FileText }
      ]
    },
    ...(isSuperAdmin ? [
      {
        title: 'ADMINISTRAÇÃO',
        items: [
          { id: 'users', label: 'Gestão de Usuário', icon: Users },
          { id: 'backup', label: 'Backup Automático', icon: Database },
          { id: 'logs', label: 'Gerenciamento de logs', icon: Terminal },
        ]
      }
    ] : [])
  ];

  const handleSelect = (id) => {
    if (onSelectTab) {
      onSelectTab(id);
    }
    if (onClose) {
      onClose();
    }
  };

  const userName = user?.name || 'Super Admin';
  const userEmail = user?.email || 'aryarajmarketing@gmail.com';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} aria-label="Menu Lateral">
      <div className="sidebar-top">
        {/* Logo header */}
        <div className="logo-container">
          <div className="logo-icon" data-testid="logo-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="logo-text">Formulario</span>
          {onClose && (
            <button
              type="button"
              className="sidebar-close-mobile-btn"
              onClick={onClose}
              aria-label="Fechar menu"
              data-testid="sidebar-close-btn"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Buttons com Categorias */}
        <nav className="nav-menu">
          {sections.map((section) => (
            <div key={section.title} className="nav-category-section">
              <div className="nav-category-header" data-testid={`category-${section.title.toLowerCase()}`}>
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-button ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelect(item.id)}
                    data-testid={`nav-item-${item.id}`}
                  >
                    <Icon className="nav-icon" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>


      {/* User profile footer with Logout */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar" data-testid="user-avatar">{userInitial}</div>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-email">{userEmail}</span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="logout-button"
              title="Sair"
              data-testid="logout-btn"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
