from pakistan.roman_urdu import normalize_query


def test_roman_urdu_normalization():
    assert "dhundo" in normalize_query("Okara main hotels dhoondo")
    assert "chahiye" in normalize_query("schools ki information chaheye")
