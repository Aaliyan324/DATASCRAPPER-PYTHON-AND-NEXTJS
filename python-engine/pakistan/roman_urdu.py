import re


REPLACEMENTS = {
    r"\bdhoondo\b": "dhundo",
    r"\bdhoondho\b": "dhundo",
    r"\bchaheye\b": "chahiye",
    r"\bnikaal\b": "nikal",
    r"\bbatado\b": "batao",
}


def normalize_query(text: str) -> str:
    q = text.strip().lower()
    q = re.sub(r"\s+", " ", q)
    for pattern, replacement in REPLACEMENTS.items():
        q = re.sub(pattern, replacement, q)
    return q
