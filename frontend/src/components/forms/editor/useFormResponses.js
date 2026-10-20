import { useState, useEffect } from 'react';

export function useFormResponses(formId, editorTab, addToast) {
  const [responses, setResponses] = useState([]);
  const [responsesPage, setResponsesPage] = useState(1);
  const [responsesTotal, setResponsesTotal] = useState(0);
  const [responsesTotalPages, setResponsesTotalPages] = useState(1);
  const [responsesFilter, setResponsesFilter] = useState('ALL'); // 'ALL' | 'CONCLUIDO' | 'PARCIAL'
  const [responsesCounts, setResponsesCounts] = useState({ all: 0, completed: 0, partial: 0 });
  const [loadingResponses, setLoadingResponses] = useState(false);

  useEffect(() => {
    if (editorTab === 'resultados') {
      fetchResponses(responsesPage, responsesFilter);
    }
  }, [editorTab, responsesPage, responsesFilter]);

  const fetchResponses = async (page = 1, status = 'ALL') => {
    try {
      setLoadingResponses(true);
      const token = localStorage.getItem('auth_token');
      const statusParam = status !== 'ALL' ? `&status=${status}` : '';
      const res = await fetch(`/api/v1/forms/${formId}/responses?page=${page}&limit=20${statusParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Não foi possível carregar as respostas.');
      const data = await res.json();
      setResponses(data.items || []);
      setResponsesTotal(data.total || 0);
      setResponsesTotalPages(data.total_pages || 1);
      if (data.counts) {
        setResponsesCounts(data.counts);
      }
    } catch (err) {
      if (addToast) addToast(err.message || 'Erro ao carregar respostas', 'error');
    } finally {
      setLoadingResponses(false);
    }
  };

  return {
    responses, setResponses,
    responsesPage, setResponsesPage,
    responsesTotal, setResponsesTotal,
    responsesTotalPages, setResponsesTotalPages,
    responsesFilter, setResponsesFilter,
    responsesCounts, setResponsesCounts,
    loadingResponses, fetchResponses
  };
}
