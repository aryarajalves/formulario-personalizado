/**
 * Utilitário para exportar o lead detalhado em PDF / impressão formatada
 */
export function printLeadPdf(selectedResponse, formSlug, formatDate) {
  if (!selectedResponse) return;
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    window.print();
    return;
  }

  const leadName = selectedResponse.contact_name || 'Anônimo';
  const leadEmail = selectedResponse.contact_email || '—';
  const leadPhone = selectedResponse.contact_phone || '—';
  const statusLabel = selectedResponse.status === 'CONCLUIDO' 
    ? 'Concluído (100%)' 
    : `Parcial (${Math.round(selectedResponse.completion_percent || 0)}%)`;
  const createdAt = formatDate ? formatDate(selectedResponse.created_at) : (selectedResponse.created_at || '—');

  const questionsHtml = (selectedResponse.answers || []).map((qa, idx) => `
    <div style="margin-bottom: 14px; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa;">
      <div style="font-weight: 600; font-size: 13px; color: #1e293b; margin-bottom: 6px;">
        <span style="display: inline-block; padding: 2px 6px; background: #e0e7ff; color: #4338ca; border-radius: 4px; font-size: 11px; margin-right: 6px;">Q${idx + 1}</span>
        ${qa.question_title || `Pergunta ${idx + 1}`}
      </div>
      <div style="font-size: 14px; color: #0f172a; white-space: pre-wrap; font-weight: 500;">
        ${qa.answer || '—'}
      </div>
    </div>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Relatório do Lead - ${leadName}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px; color: #0f172a; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 22px; font-weight: 700; margin: 0 0 6px 0; color: #0f172a; }
          .subtitle { font-size: 13px; color: #64748b; margin: 0; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: #e0f2fe; color: #0369a1; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .grid-item { font-size: 13px; }
          .grid-label { color: #64748b; margin-bottom: 2px; font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
          .grid-value { font-weight: 600; color: #1e293b; font-size: 14px; }
          .section-title { font-size: 15px; font-weight: 700; color: #334155; margin: 24px 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; }
          @media print {
            body { padding: 0; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Relatório de Lead & Respostas</h1>
            <p class="subtitle">Formulário: ${formSlug || 'Geral'} • Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <span class="badge">${statusLabel}</span>
          </div>
        </div>

        <div class="grid">
          <div class="grid-item">
            <div class="grid-label">Nome do Contato</div>
            <div class="grid-value">${leadName}</div>
          </div>
          <div class="grid-item">
            <div class="grid-label">Data de Envio</div>
            <div class="grid-value">${createdAt}</div>
          </div>
          <div class="grid-item">
            <div class="grid-label">E-mail</div>
            <div class="grid-value">${leadEmail}</div>
          </div>
          <div class="grid-item">
            <div class="grid-label">Telefone / WhatsApp</div>
            <div class="grid-value">${leadPhone}</div>
          </div>
        </div>

        <div class="section-title">Respostas Coletadas (${(selectedResponse.answers || []).length})</div>
        <div>${questionsHtml || '<p style="color: #64748b;">Nenhuma resposta registrada.</p>'}</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
