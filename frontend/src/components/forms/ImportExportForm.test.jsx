import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FormsManagement from './FormsManagement';
import FormEditor from './FormEditor';
import ImportFormModal from './ImportFormModal';
import { ToastProvider } from '../../context/ToastContext';

describe('Import and Export Forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('auth_token', 'fake-jwt-token');
  });

  it('renders "Importar formulário" button and opens the import modal', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(
      <ToastProvider>
        <FormsManagement />
      </ToastProvider>
    );

    const importBtn = screen.getByTestId('open-import-form-modal-btn');
    expect(importBtn).toBeDefined();

    fireEvent.click(importBtn);

    expect(screen.getByTestId('import-form-modal-overlay')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Importar formulário' })).toBeDefined();
    expect(screen.getByTestId('import-dropzone')).toBeDefined();
  });

  it('exports form via dropdown menu in FormsManagement', async () => {
    const mockExportData = {
      version: '1.0',
      type: 'formulario_personalizado_export',
      title: 'Formulário Teste',
      questions: [{ id: 'q1', type: 'short_text', title: 'Nome' }]
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 99,
            title: 'Formulário Teste',
            slug: 'slug-99',
            status: 'PUBLICADO',
            responses_count: 2,
            completion_rate: 100.0,
            created_at: new Date().toISOString()
          }
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockExportData,
      });

    // Mock createObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
    window.URL.revokeObjectURL = vi.fn();

    render(
      <ToastProvider>
        <FormsManagement />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('form-menu-trigger-99')).toBeDefined();
    });

    // Abre o menu dropdown
    fireEvent.click(screen.getByTestId('form-menu-trigger-99'));

    const exportBtn = screen.getByTestId('export-form-btn-99');
    expect(exportBtn).toBeDefined();

    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/forms/99/export', expect.any(Object));
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it('ImportFormModal handles file selection, preview and submits successfully', async () => {
    const onImportSuccess = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();

    render(
      <ImportFormModal
        isOpen={true}
        onClose={onClose}
        onImportSuccess={onImportSuccess}
      />
    );

    const fileContent = JSON.stringify({
      version: '1.0',
      type: 'formulario_personalizado_export',
      title: 'Formulário do Backup',
      questions: [
        { id: 'q1', type: 'short_text', title: 'Qual seu nome?' },
        { id: 'q2', type: 'email', title: 'Seu email' }
      ],
      welcome_screen: { title: 'Olá!' },
      ending_screens: [{ id: 'e1', title: 'Obrigado!' }],
      theme: { primary_color: '#6366f1' }
    });

    const file = new File([fileContent], 'backup.json', { type: 'application/json' });
    const input = screen.getByTestId('import-file-input');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('import-preview-box')).toBeDefined();
      expect(screen.getByDisplayValue('Formulário do Backup')).toBeDefined();
      expect(screen.getByText('2 perguntas')).toBeDefined();
      expect(screen.getByText('Tela Inicial')).toBeDefined();
    });

    // Edita o título
    const titleInput = screen.getByTestId('import-form-title-input');
    fireEvent.change(titleInput, { target: { value: 'Formulário Importado Novo' } });

    // Clica em importar
    const submitBtn = screen.getByTestId('import-form-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onImportSuccess).toHaveBeenCalledWith({
        title: 'Formulário Importado Novo',
        data: expect.objectContaining({
          title: 'Formulário do Backup',
          questions: expect.any(Array)
        })
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('ImportFormModal shows error when file is invalid JSON', async () => {
    const onClose = vi.fn();
    const onImportSuccess = vi.fn();

    render(
      <ImportFormModal
        isOpen={true}
        onClose={onClose}
        onImportSuccess={onImportSuccess}
      />
    );

    const badFile = new File(['invalid-json{{{'], 'bad.json', { type: 'application/json' });
    const input = screen.getByTestId('import-file-input');

    fireEvent.change(input, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('import-error-msg')).toBeDefined();
      expect(screen.getByText(/Verifique se o JSON é válido/i)).toBeDefined();
    });
  });

  it('FormEditor renders export button in navbar and triggers export API', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 50,
          title: 'Formulário Editor',
          slug: 'editor-50',
          status: 'PUBLICADO',
          questions: [],
          ending_screens: [],
          welcome_screen: {}
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: '1.0',
          title: 'Formulário Editor',
          questions: []
        }),
      });

    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-editor-url');
    window.URL.revokeObjectURL = vi.fn();

    render(
      <ToastProvider>
        <FormEditor formId={50} onBack={vi.fn()} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('editor-export-btn')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('editor-export-btn'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/forms/50/export', expect.any(Object));
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });
});
