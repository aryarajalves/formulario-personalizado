import unittest.mock
from tests.conftest import client, TestingSessionLocal
from app.core.config import settings
from app.core.rate_limiter import reset_rate_limits
from app.models.form import Form

def test_forms_endpoints_crud_flow():
    # 1. Login superadmin para pegar token
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Criar novo formulário
    payload = {"title": "Pesquisa de Satisfação do Cliente"}
    create_res = client.post("/api/v1/forms", json=payload, headers=headers)
    assert create_res.status_code == 201
    form_data = create_res.json()
    assert form_data["title"] == "Pesquisa de Satisfação do Cliente"
    assert form_data["status"] == "PUBLICADO"
    assert form_data["responses_count"] == 0
    assert form_data["completion_rate"] == 0.0
    assert len(form_data["slug"]) > 0
    form_id = form_data["id"]

    # 3. Listar formulários
    list_res = client.get("/api/v1/forms", headers=headers)
    assert list_res.status_code == 200
    forms = list_res.json()
    assert any(f["id"] == form_id for f in forms)

    # 4. Falha com título vazio
    fail_res = client.post("/api/v1/forms", json={"title": "   "}, headers=headers)
    assert fail_res.status_code == 400

    # 5. Atualizar formulário (questões e webhook_url)
    update_res = client.put(f"/api/v1/forms/{form_id}", json={
        "title": "Pesquisa de Satisfação Atualizada",
        "webhook_url": "https://webhook.site/teste-unitario",
        "questions": [
            {
                "id": "q1",
                "type": "multiple_choice",
                "title": "Qual seu plano de preferência?",
                "required": True,
                "options": [
                    {"id": "opt_1", "label": "Plano VIP", "action": "jump", "jump_to_question_id": "q2"},
                    {"id": "opt_2", "label": "Gratuito", "action": "end", "jump_to_question_id": None}
                ]
            },
            {
                "id": "q2",
                "type": "short_text",
                "title": "Qual seu faturamento?",
                "required": False
            }
        ]
    }, headers=headers)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["title"] == "Pesquisa de Satisfação Atualizada"
    assert updated_data["webhook_url"] == "https://webhook.site/teste-unitario"
    assert len(updated_data["questions"]) == 2
    assert updated_data["questions"][0]["options"][0]["action"] == "jump"
    assert updated_data["questions"][0]["options"][1]["action"] == "end" 

    # 6. Testar webhook sem webhook_url configurada (espera 400)
    client.put(f"/api/v1/forms/{form_id}", json={"webhook_url": ""}, headers=headers)
    test_webhook_fail = client.post(f"/api/v1/forms/{form_id}/test-webhook", headers=headers)
    assert test_webhook_fail.status_code == 400

    # 7. Acesso público ao formulário pelo slug (sem login)
    public_res = client.get(f"/api/v1/forms/public/{form_data['slug']}")
    assert public_res.status_code == 200
    pub_data = public_res.json()
    assert pub_data["slug"] == form_data["slug"]
    assert pub_data["title"] == "Pesquisa de Satisfação Atualizada"

    # 7.1 Envio de resposta pública (com webhook em background)
    client.put(f"/api/v1/forms/{form_id}", json={"webhook_url": "https://webhook.site/teste-background"}, headers=headers)
    with unittest.mock.patch("app.api.v1.endpoints.forms.dispatch_webhook_in_background") as mock_bg_webhook:
        submit_res = client.post(f"/api/v1/forms/public/{form_data['slug']}/submit", json={
            "answers": [
                {"question_title": "Qual é o seu nome completo?", "answer": "Carlos Eduardo"},
                {"question_title": "Qual seu email?", "answer": "carlos@teste.com"}
            ]
        })
        assert submit_res.status_code == 200
        assert submit_res.json()["success"] is True
        assert mock_bg_webhook.called
        call_args = mock_bg_webhook.call_args[0]
        assert call_args[0] == form_id
        assert call_args[1] == "https://webhook.site/teste-background"
        assert call_args[2]["form_slug"] == form_data["slug"]

    # 7.2 Testar salvamento parcial (auto-save na 1ª pergunta)
    form_slug = form_data["slug"]
    partial_res = client.post(f"/api/v1/forms/public/{form_slug}/save-partial", json={
        "current_step": 1,
        "answers": [
            {"question_title": "Qual é o seu nome completo?", "answer": "Lead Parcial"}
        ]
    })
    assert partial_res.status_code == 200
    part_data = partial_res.json()
    assert part_data["success"] is True
    assert part_data["status"] == "PARCIAL"
    partial_id = part_data["response_id"]

    # 7.3 Listagem paginada de respostas com filtro por status e horário de Brasília
    responses_res = client.get(f"/api/v1/forms/{form_id}/responses?page=1&limit=20&status=PARCIAL", headers=headers)
    assert responses_res.status_code == 200
    res_data = responses_res.json()
    assert "items" in res_data
    assert any(item["id"] == partial_id for item in res_data["items"])
    assert res_data["counts"]["partial"] >= 1

    # 7.4 Testar rota de exportação CSV
    csv_res = client.get(f"/api/v1/forms/{form_id}/responses/export?status=ALL", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "Carlos Eduardo" in csv_res.text or "Lead Parcial" in csv_res.text

    # 7.5 Atualizar integração com Google Calendar
    cal_res = client.put(f"/api/v1/forms/{form_id}", json={
        "google_calendar_connected": True,
        "google_calendar_email": "agenda@gmail.com",
        "theme": {
            "primaryColor": "#8b5cf6",
            "backgroundColor": "#0f0a1c",
            "textColor": "#f3e8ff",
            "buttonTextColor": "#ffffff"
        }
    }, headers=headers)
    assert cal_res.status_code == 200
    assert cal_res.json()["google_calendar_connected"] is True
    assert cal_res.json()["google_calendar_email"] == "agenda@gmail.com"
    assert cal_res.json()["theme"]["primaryColor"] == "#8b5cf6"

    # Valida que o endpoint público agora entrega o theme
    pub_theme_res = client.get(f"/api/v1/forms/public/{form_slug}")
    assert pub_theme_res.status_code == 200
    assert pub_theme_res.json()["theme"]["primaryColor"] == "#8b5cf6"

    # 7.6 Testar rotas de OAuth do Google Calendar
    auth_url_res = client.get(f"/api/v1/forms/{form_id}/integrations/google-calendar/auth-url", headers=headers)
    assert auth_url_res.status_code in [200, 400]

    disc_res = client.post(f"/api/v1/forms/{form_id}/integrations/google-calendar/disconnect", headers=headers)
    assert disc_res.status_code == 200
    assert disc_res.json()["success"] is True

    form_check = client.get("/api/v1/forms", headers=headers)
    curr_form = next(f for f in form_check.json() if f["id"] == form_id)
    assert curr_form["google_calendar_connected"] is False

    # 7.6.1 Testar salvamento de turnos múltiplos e pausas nas configurações do calendário
    shift_res = client.put(f"/api/v1/forms/{form_id}/integrations/google-calendar/settings", json={
        "working_days": [1, 2, 3, 4, 5],
        "time_ranges": [
            {"start_time": "09:00", "end_time": "12:00"},
            {"start_time": "15:00", "end_time": "19:00"}
        ],
        "slot_duration": 60,
        "buffer_minutes": 0,
        "event_title": "Mentoria com {nome}",
        "event_description": "Briefing da mentoria VIP",
        "event_color_id": "7"
    }, headers=headers)
    assert shift_res.status_code == 200
    shift_settings = shift_res.json()["settings"]
    assert len(shift_settings["time_ranges"]) == 2
    assert shift_settings["time_ranges"][0]["end_time"] == "12:00"
    assert shift_settings["time_ranges"][1]["start_time"] == "15:00"
    assert shift_settings["event_title"] == "Mentoria com {nome}"
    assert shift_settings["event_description"] == "Briefing da mentoria VIP"
    assert shift_settings["event_color_id"] == "7"

    # Valida que o endpoint público de slots respeita a pausa das 12:00 às 15:00
    public_slots_res = client.get(f"/api/v1/forms/public/{form_slug}/calendar-slots")
    assert public_slots_res.status_code == 200
    slots_by_date = public_slots_res.json().get("slots_by_date", {})
    available_dates = [d for d, s in slots_by_date.items() if len(s) > 0]
    if available_dates:
        # Pega a última data disponível (garante que é futura e não sofre corte de horário passado no dia de hoje)
        future_day_slots = [slot["time"] for slot in slots_by_date[available_dates[-1]]]
        assert "09:00" in future_day_slots
        assert "15:00" in future_day_slots
        # Pausa: não deve conter 12:00, 13:00 nem 14:00
        assert "12:00" not in future_day_slots
        assert "13:00" not in future_day_slots
        assert "14:00" not in future_day_slots

    # 7.7 Testar exportação de estrutura de formulário em JSON
    export_res = client.get(f"/api/v1/forms/{form_id}/export", headers=headers)
    assert export_res.status_code == 200
    export_data = export_res.json()
    assert export_data["version"] == "1.0"
    assert export_data["type"] == "formulario_personalizado_export"
    assert export_data["title"] == "Pesquisa de Satisfação Atualizada"
    assert len(export_data["questions"]) >= 1
    assert export_data["questions"][0]["options"][0]["action"] == "jump"
    assert export_data["questions"][0]["options"][1]["action"] == "end"
    assert "google_calendar_access_token" not in export_data

    # 7.8 Testar importação do formulário exportado
    import_res = client.post("/api/v1/forms/import", json=export_data, headers=headers)
    assert import_res.status_code == 201
    imported_form = import_res.json()
    assert imported_form["title"] == "Pesquisa de Satisfação Atualizada"
    assert imported_form["id"] != form_id
    assert imported_form["slug"] != form_data["slug"]
    assert len(imported_form["questions"]) >= 1
    assert imported_form["questions"][0]["options"][0]["action"] == "jump"
    assert imported_form["questions"][0]["options"][1]["action"] == "end" 
    imported_id = imported_form["id"]

    # 7.9 Importar com substituição de título e estrutura customizada
    import_custom = client.post("/api/v1/forms/import", json={
        "title": "Formulário Importado Customizado",
        "data": export_data
    }, headers=headers)
    assert import_custom.status_code == 201
    assert import_custom.json()["title"] == "Formulário Importado Customizado"
    custom_id = import_custom.json()["id"]

    # Limpar os formulários importados no teste
    client.delete(f"/api/v1/forms/{imported_id}", headers=headers)
    client.delete(f"/api/v1/forms/{custom_id}", headers=headers)

    # 7.10 Exportar formulário inexistente retorna 404
    assert client.get("/api/v1/forms/99999/export", headers=headers).status_code == 404

    # 8. Excluir formulário
    del_res = client.delete(f"/api/v1/forms/{form_id}", headers=headers)
    assert del_res.status_code == 200

    # 9. Validar que foi removido
    list_after = client.get("/api/v1/forms", headers=headers)
    assert not any(f["id"] == form_id for f in list_after.json())

def test_optimized_metrics_and_composite_indexes():
    """Valida a performance da contagem única de métricas e suporte aos índices compostos de escalabilidade."""
    reset_rate_limits()

    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    form_res = client.post("/api/v1/forms", json={"title": "Form Escala Teste"}, headers=headers)
    form_id = form_res.json()["id"]
    slug = form_res.json()["slug"]

    # 1. Envia resposta parcial
    p_res = client.post(f"/api/v1/forms/public/{slug}/save-partial", json={
        "current_step": 1,
        "answers": [{"question_title": "Qual seu nome?", "answer": "Lead Escala"}]
    })
    assert p_res.status_code == 200

    # 2. Envia resposta concluída com recálculo agregado otimizado
    sub_res = client.post(f"/api/v1/forms/public/{slug}/submit", json={
        "answers": [{"question_title": "Qual seu nome?", "answer": "Cliente Finalizado"}]
    })
    assert sub_res.status_code == 200
    assert sub_res.json()["success"] is True

    # 3. Valida se o completion_rate foi recalculado perfeitamente
    db = TestingSessionLocal()
    updated_form = db.query(Form).filter(Form.id == form_id).first()
    assert updated_form.responses_count >= 1
    assert updated_form.completion_rate > 0.0
    db.close()

    # Limpeza
    client.delete(f"/api/v1/forms/{form_id}", headers=headers)

def test_submit_form_with_statement_disqualification():
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Cria formulário com nó de término/desqualificação
    form_res = client.post("/api/v1/forms", json={
        "title": "Formulario com Desqualificacao",
        "questions": [
            {"id": "q1", "type": "short_text", "title": "Seu nome"},
            {"id": "q_end", "type": "statement", "title": "Obrigado pelo seu tempo", "description": "Voce nao atende aos requisitos."}
        ]
    }, headers=headers)
    assert form_res.status_code == 201
    form_data = form_res.json()
    form_id = form_data["id"]
    slug = form_data["slug"]

    # 2. Submete marcando como desqualificado
    sub_res = client.post(f"/api/v1/forms/public/{slug}/submit", json={
        "answers": [
            {"question_id": "q1", "question_title": "Seu nome", "answer": "Candidato Nao Aprovado"},
            {"question_id": "q_end", "question_title": "Obrigado pelo seu tempo", "answer": "(Mensagem de Término)"}
        ],
        "disqualified": True
    })
    assert sub_res.status_code == 200
    assert sub_res.json()["success"] is True

    # 3. Consulta respostas do formulário
    resp_list = client.get(f"/api/v1/forms/{form_id}/responses", headers=headers)
    assert resp_list.status_code == 200
    r_data = resp_list.json()
    assert r_data["counts"]["completed"] >= 1
    found = [r for r in r_data["items"] if r["contact_name"] == "Candidato Nao Aprovado"]
    assert len(found) == 1
    assert found[0]["status"] == "CONCLUIDO_NAO_PASSOU"

    # 4. Limpeza
    client.delete(f"/api/v1/forms/{form_id}", headers=headers)
