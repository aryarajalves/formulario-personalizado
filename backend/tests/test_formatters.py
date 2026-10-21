import pytest
from app.core.formatters import format_answer_for_display

def test_format_google_calendar_iso_datetime():
    # Caso do usuário: 2026-10-23T13:00:00-03:00 -> 23/10/26 13:00
    assert format_answer_for_display("2026-10-23T13:00:00-03:00") == "23/10/26 13:00"
    assert format_answer_for_display("2026-10-21T09:30:00-03:00") == "21/10/26 09:30"
    assert format_answer_for_display("2026-05-04T15:45:00Z") == "04/05/26 15:45"
    assert format_answer_for_display("2026-12-31T20:00:00") == "31/12/26 20:00"

def test_format_pure_date():
    assert format_answer_for_display("2026-10-23") == "23/10/26"

def test_format_regular_text_and_empty():
    assert format_answer_for_display("Aryaraj Alves Fernandes") == "Aryaraj Alves Fernandes"
    assert format_answer_for_display("+55 85988146141") == "+55 85988146141"
    assert format_answer_for_display(None) == ""
    assert format_answer_for_display("") == ""
