import time
import os
import json
import requests
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\aryar\.gemini\antigravity\brain\2b5a88b5-19bb-4c92-92be-8d357471d820"

def take_screenshots():
    # Obtém token JWT direto do backend
    login_res = requests.post(
        "http://localhost:8020/api/v1/auth/login",
        json={"email": "aryarajmarketing@gmail.com", "password": "SuperAdmin@2026!"}
    )
    if login_res.status_code != 200:
        print("Erro no login backend:", login_res.text)
        return
    token = login_res.json()["access_token"]
    user_data = login_res.json().get("user", {"email": "aryarajmarketing@gmail.com", "role": "superadmin"})

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        # 1. Abre a página pública do formulário com o Calendário Interativo Gigante (ORjYIxi4)
        print("Acessando formulário público ORjYIxi4...")
        page.goto("http://localhost:3002/form/ORjYIxi4")
        page.wait_for_selector('[data-testid="interactive-booking-calendar"]')
        time.sleep(2)

        # Clica em um horário disponível se houver para demonstrar ativo
        slots = page.locator('.slot-time-btn')
        if slots.count() > 0:
            slots.first.click()
            time.sleep(0.5)

        calendar_path = os.path.join(ARTIFACT_DIR, "calendar_booking_public_rendered.png")
        page.screenshot(path=calendar_path, full_page=False)
        print(f"Screenshot salvo: {calendar_path}")

        # 2. Configura sessão de autenticação para o Editor e aba Integrar
        print("Injetando sessão de autenticação...")
        page.goto("http://localhost:3002/")
        page.evaluate(f"localStorage.setItem('auth_token', '{token}')")
        user_json_str = json.dumps(json.dumps(user_data))
        page.evaluate(f"localStorage.setItem('auth_user', {user_json_str})")
        page.evaluate("localStorage.setItem('active_tab', 'forms')")
        page.goto("http://localhost:3002/")
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        print("Aguardando lista de formulários...")
        page.wait_for_selector('[data-testid="forms-management-view"]')
        time.sleep(1)

        print("Abrindo Formulario 1...")
        page.click('[data-testid="form-item-1"]')
        page.wait_for_selector('[data-testid="tab-integrar"]')
        time.sleep(1)

        print("Abrindo aba Integrar...")
        page.click('[data-testid="tab-integrar"]')
        page.wait_for_selector('[data-testid="expert-schedule-config"]')
        time.sleep(1.5)

        # Scroll até o painel de horários
        schedule_box = page.locator('[data-testid="expert-schedule-config"]')
        schedule_box.scroll_into_view_if_needed()
        time.sleep(1)

        integrations_path = os.path.join(ARTIFACT_DIR, "expert_schedule_settings_fixed.png")
        page.screenshot(path=integrations_path, full_page=False)
        print(f"Screenshot salvo: {integrations_path}")

        browser.close()

if __name__ == "__main__":
    take_screenshots()
