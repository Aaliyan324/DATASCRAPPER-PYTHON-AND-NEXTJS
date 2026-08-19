import re


REPLACEMENTS = {
    # Compound patterns FIRST (before individual normalizations).
    r"\btalash\s+karo\b": "search",
    r"\bfind\s+karo\b": "search",
    r"\bnikal\s+do\b": "provide",
    r"\blist\s+bana\s+do\b": "list",
    r"\blist\s+do\b": "list",
    # Individual word normalizations.
    r"\bdhoondo\b": "dhundo",
    r"\bdhoondho\b": "dhundo",
    r"\bchaheye\b": "chahiye",
    r"\bnikaal\b": "nikal",
    r"\bbatado\b": "batao",
}

# Roman Urdu / Urdu filler words that should be preserved (not stripped)
# because they carry preposition/relationship meaning.
ROMAN_URDU_PREPOSITIONS = {
    "main", "mein", "me",          # in
    "andar",                        # inside
    "qareeb", "nazdeek", "paas",    # near
    "ke", "kay", "ka", "ki", "k",   # possessive/relationship
    "par",                          # on/at
    "se",                           # from
    "tak",                          # until/to
}


def normalize_query(text: str) -> str:
    q = text.strip().lower()
    q = re.sub(r"\s+", " ", q)
    for pattern, replacement in REPLACEMENTS.items():
        q = re.sub(pattern, replacement, q)
    return q


def strip_fillers(text: str) -> str:
    """Remove common Roman Urdu filler/verb words while preserving
    prepositions and location names."""
    fillers = {
        "dhundo", "dhoondo", "dhoondho", "nikal", "nikaal",
        "batao", "batado", "chahiye", "chaheye", "karo",
        "do", "dena", "bana", "banao",
    }
    words = text.lower().split()
    return " ".join(w for w in words if w not in fillers)
