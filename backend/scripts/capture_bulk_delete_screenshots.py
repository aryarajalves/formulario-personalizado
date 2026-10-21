import time
import os
import json
import requests
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\aryar\.gemini\antigravity\brain\2b5a88b5-19bb-4c92-92be-8d357471d820"

def take_screenshots():
    # 1. Obtém token JWT direto do backend
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
        context = browser.new_context(viewport={"width": 1366, "height": 850})
        page = context.new_page()

        print("Injetando sessão de autenticação...")
        page.goto("http://localhost:3002/")
        page.evaluate(f"localStorage.setItem('auth_token', '{token}')")
        user_json_str = json.dumps(json.dumps(user_data))
        page.evaluate(f"localStorage.setItem('auth_user', {user_json_str})")
        page.evaluate("localStorage.setItem('active_tab', 'forms')")
        page.goto("http://localhost:3002/")
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        print("Aguardando lista de formulários...")
        page.wait_for_selector('[data-testid="forms-management-view"]')
        time.sleep(1)

        # 1. Print da lista com os checkboxes visíveis
        list_path = os.path.join(ARTIFACT_DIR, "forms_bulk_checkboxes_visible.png")
        page.screenshot(path=list_path, full_page=False)
        print(f"Screenshot salvo: {list_path}")

        # 2. Seleciona os 2 primeiros checkboxes
        checkboxes = page.locator('.col-checkbox input[type="checkbox"]')
        count = checkboxes.count()
        print(f"Checkboxes encontrados: {count}")
        if count > 1:
            checkboxes.nth(1).click()
            time.sleep(0.5)
            if count > 2:
                checkboxes.nth(2).click()
                time.sleep(0.5)

        # 3. Print com barra de ação em massa (BulkActionBar)
        action_bar_path = os.path.join(ARTIFACT_DIR, "forms_bulk_action_bar_active.png")
        page.screenshot(path=action_bar_path, full_page=False)
        print(f"Screenshot salvo: {action_bar_path}")

        # 4. Clica em "Excluir selecionados" para abrir o modal
        bulk_delete_btn = page.locator('[data-testid="bulk-delete-trigger-btn"]')
        if bulk_delete_btn.is_visible():
            bulk_delete_btn.click()
            time.sleep(0.8)
            modal_path = os.path.join(ARTIFACT_DIR, "forms_bulk_delete_modal_open.png")
            page.screenshot(path=modal_path, full_page=False)
            print(f"Screenshot salvo: {modal_path}")

        browser.close()

if __name__ == "__main__":
    take_screenshots()
