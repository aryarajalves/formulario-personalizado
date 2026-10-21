import re

def format_answer_for_display(val: any) -> str:
    """
    Formata valores de respostas para exibição amigável.
    Converte datas/horários ISO (como os do Google Agenda: 2026-10-23T13:00:00-03:00)
    para o formato dd/MM/yy HH:mm (ex: 23/10/26 13:00).
    """
    if val is None:
        return ""
    str_val = str(val).strip()
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})", str_val)
    if m:
        short_year = m.group(1)[-2:]
        return f"{m.group(3)}/{m.group(2)}/{short_year} {m.group(4)}:{m.group(5)}"
    date_m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", str_val)
    if date_m:
        short_year = date_m.group(1)[-2:]
        return f"{date_m.group(3)}/{date_m.group(2)}/{short_year}"
    return str_val
