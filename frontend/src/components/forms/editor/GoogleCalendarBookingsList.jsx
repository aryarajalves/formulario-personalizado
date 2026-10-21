import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck2, 
  RotateCw, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  Clock, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import ConfirmDeleteBookingModal from '../modals/ConfirmDeleteBookingModal';
import './GoogleCalendarBookingsList.css';

export default function GoogleCalendarBookingsList({
  formId,
  googleCalConnected,
  googleCalEmail
}) {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 20;
  const { addToast } = useToast();

  const fetchBookings = async (targetPage = page) => {
    if (!formId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/forms/${formId}/integrations/google-calendar/bookings?page=${targetPage}&limit=${pageSize}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Não foi possível carregar a lista de agendamentos.');
      }

      const data = await res.json();
      setBookings(data.bookings || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setPage(data.page || targetPage);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar agendamentos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!bookingToDelete) return;
    try {
      setDeleting(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/forms/${formId}/integrations/google-calendar/bookings/${bookingToDelete.response_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Falha ao excluir agendamento.');
      }

      addToast('Agendamento, lembretes e evento da Google Agenda excluídos com sucesso!', 'success');
      setBookingToDelete(null);
      fetchBookings(page);
    } catch (err) {
      addToast(err.message || 'Erro ao excluir agendamento.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchBookings(1);
  }, [formId]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === page || loading) return;
    fetchBookings(newPage);
  };

  return (
    <div className="calendar-bookings-container" data-testid="google-calendar-bookings-list">
      {/* Cabeçalho da Aba Agendamentos */}
      <div className="bookings-header-row">
        <div className="bookings-header-text">
          <div className="bookings-title-wrap">
            <CalendarCheck2 size={18} className="bookings-title-icon" />
            <h4>Agendamentos Realizados</h4>
            <span className="bookings-count-badge" data-testid="bookings-count-badge">
              {total} {total === 1 ? 'agendamento' : 'agendamentos'}
            </span>
          </div>
          <p>
            Veja todas as reuniões e compromissos marcados pelos respondentes no calendário deste formulário.
          </p>
        </div>

        <button
          type="button"
          className="bookings-refresh-btn"
          onClick={() => fetchBookings(page)}
          disabled={loading}
          data-testid="refresh-bookings-btn"
          title="Recarregar lista de agendamentos"
        >
          {loading ? (
            <Loader2 size={14} className="spinner-icon" />
          ) : (
            <RotateCw size={14} />
          )}
          <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>

      {/* Conteúdo / Estados */}
      {loading && bookings.length === 0 ? (
        <div className="bookings-loading-state" data-testid="bookings-loading">
          <Loader2 size={24} className="spinner-icon" />
          <span>Buscando agendamentos sincronizados...</span>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bookings-empty-state" data-testid="bookings-empty">
          <div className="empty-calendar-icon-box">
            <Calendar size={32} />
          </div>
          <h5>Nenhum agendamento realizado ainda</h5>
          <p>
            Assim que os respondentes escolherem uma data e horário no formulário e confirmarem,
            as reuniões aparecerão listadas aqui com todos os detalhes e sincronizadas na sua Google Agenda.
          </p>
        </div>
      ) : (
        <div className="bookings-table-wrapper" data-testid="bookings-table-wrapper">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Data e Horário</th>
                <th>Lead / Contato</th>
                <th>E-mail</th>
                <th>Telefone / WhatsApp</th>
                <th>Status da Sincronia</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, idx) => (
                <tr key={idx} data-testid={`booking-row-${idx}`}>
                  {/* Data e Horário Formatado */}
                  <td className="col-booking-datetime">
                    <div className="booking-datetime-pill" data-testid={`booking-datetime-${idx}`}>
                      <Clock size={13} />
                      <strong>{b.formatted_datetime || b.scheduled_iso}</strong>
                    </div>
                  </td>

                  {/* Nome do Contato */}
                  <td className="col-booking-lead">
                    <div className="lead-name-cell">
                      <div className="lead-avatar-icon">
                        <User size={13} />
                      </div>
                      <span>{b.contact_name || 'Anônimo'}</span>
                    </div>
                  </td>

                  {/* E-mail */}
                  <td className="col-booking-email">
                    {b.contact_email ? (
                      <div className="cell-with-icon">
                        <Mail size={13} className="text-muted" />
                        <span>{b.contact_email}</span>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>

                  {/* Telefone */}
                  <td className="col-booking-phone">
                    {b.contact_phone ? (
                      <div className="cell-with-icon">
                        <Phone size={13} className="text-muted" />
                        <span>{b.contact_phone}</span>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="col-booking-sync">
                    <span className="booking-sync-badge synced">
                      <CheckCircle2 size={12} />
                      <span>Sincronizado na Agenda</span>
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="col-booking-actions" style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="booking-delete-btn"
                      onClick={() => setBookingToDelete(b)}
                      title="Excluir agendamento (cancela no Google Calendar e remove lembretes)"
                      data-testid={`delete-booking-btn-${idx}`}
                    >
                      <Trash2 size={13} />
                      <span>Excluir</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Rodapé de Paginação (20 itens por página) */}
          <div className="bookings-pagination-footer" data-testid="bookings-pagination">
            <div className="bookings-pagination-info">
              Mostrando <strong>{bookings.length}</strong> de <strong>{total}</strong> {total === 1 ? 'agendamento' : 'agendamentos'} (20 por página)
            </div>
            <div className="bookings-pagination-buttons">
              <button
                type="button"
                className="bookings-pagination-nav-btn"
                disabled={page <= 1 || loading}
                onClick={() => handlePageChange(page - 1)}
                data-testid="pagination-prev-btn"
              >
                Anterior
              </button>
              <span className="bookings-pagination-page-indicator" data-testid="pagination-page-indicator">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                className="bookings-pagination-nav-btn"
                disabled={page >= totalPages || loading}
                onClick={() => handlePageChange(page + 1)}
                data-testid="pagination-next-btn"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Agendamento */}
      <ConfirmDeleteBookingModal
        isOpen={Boolean(bookingToDelete)}
        booking={bookingToDelete}
        loading={deleting}
        onClose={() => setBookingToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
