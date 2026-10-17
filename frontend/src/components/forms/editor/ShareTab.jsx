import React from 'react';
import { Share2, Copy, CheckCircle2, ExternalLink } from 'lucide-react';

export default function ShareTab({
  formSlug,
  copiedLink,
  onCopyLink
}) {
  const publicUrl = `${window.location.origin}/form/${formSlug}`;

  return (
    <div className="share-view-container" data-testid="share-view">
      <div className="share-inner">
        <div className="share-header">
          <h2>Compartilhar Formulário</h2>
          <p>Envie o link do formulário para seus clientes ou usuários responderem em qualquer dispositivo.</p>
        </div>

        {/* Card Principal de Link Compartilhável */}
        <div className="share-link-card">
          <div className="share-card-header">
            <div className="share-icon-box">
              <Share2 size={24} />
            </div>
            <div>
              <h3>Link Público do Formulário</h3>
              <p>Copie o link abaixo para divulgar no WhatsApp, e-mail, redes sociais ou anúncios.</p>
            </div>
          </div>

          <div className="share-link-input-group">
            <div className="share-url-box">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="share-url-input"
                data-testid="share-url-input"
              />
              <div className="share-action-buttons">
                <button
                  type="button"
                  className="copy-share-btn"
                  onClick={onCopyLink}
                  data-testid="copy-share-btn"
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 size={16} className="text-green" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>

                <a
                  href={`/form/${formSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="open-share-link-btn"
                  data-testid="open-share-link-btn"
                >
                  <ExternalLink size={16} />
                  <span>Abrir</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
