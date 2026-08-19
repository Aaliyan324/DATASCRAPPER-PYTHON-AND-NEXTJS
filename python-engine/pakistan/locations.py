# Pakistan location registry — cities, tehsils, towns, societies, and aliases.
#
# This is a *knowledge layer*, not an exhaustive gazetteer.  Unknown locations
# are resolved at runtime via the Google Geocoding API (see engine/geocoding.py).
# Each entry stores administrative hierarchy so the resolver can fill gaps.

# ──────────────────────────────────────────────────────────────────────────────
# Major cities
# ──────────────────────────────────────────────────────────────────────────────
PAKISTAN_LOCATIONS: dict[str, dict] = {
    # Punjab
    "Islamabad": {"province": "Islamabad Capital Territory", "district": "Islamabad", "city": "Islamabad"},
    "Lahore": {"province": "Punjab", "district": "Lahore", "city": "Lahore"},
    "Rawalpindi": {"province": "Punjab", "district": "Rawalpindi", "city": "Rawalpindi"},
    "Faisalabad": {"province": "Punjab", "district": "Faisalabad", "city": "Faisalabad"},
    "Multan": {"province": "Punjab", "district": "Multan", "city": "Multan"},
    "Gujranwala": {"province": "Punjab", "district": "Gujranwala", "city": "Gujranwala"},
    "Sialkot": {"province": "Punjab", "district": "Sialkot", "city": "Sialkot"},
    "Gujrat": {"province": "Punjab", "district": "Gujrat", "city": "Gujrat"},
    "Sahiwal": {"province": "Punjab", "district": "Sahiwal", "city": "Sahiwal"},
    "Okara": {"province": "Punjab", "district": "Okara", "city": "Okara"},
    "Jhelum": {"province": "Punjab", "district": "Jhelum", "city": "Jhelum"},
    "Chakwal": {"province": "Punjab", "district": "Chakwal", "city": "Chakwal"},
    "Attock": {"province": "Punjab", "district": "Attock", "city": "Attock"},
    "Kasur": {"province": "Punjab", "district": "Kasur", "city": "Kasur"},
    "Sheikhupura": {"province": "Punjab", "district": "Sheikhupura", "city": "Sheikhupura"},
    "Bahawalpur": {"province": "Punjab", "district": "Bahawalpur", "city": "Bahawalpur"},
    "Rahim Yar Khan": {"province": "Punjab", "district": "Rahim Yar Khan", "city": "Rahim Yar Khan"},
    "Mandi Bahauddin": {"province": "Punjab", "district": "Mandi Bahauddin", "city": "Mandi Bahauddin"},
    "Sargodha": {"province": "Punjab", "district": "Sargodha", "city": "Sargodha"},
    "Dera Ghazi Khan": {"province": "Punjab", "district": "Dera Ghazi Khan", "city": "Dera Ghazi Khan"},
    "Muzaffargarh": {"province": "Punjab", "district": "Muzaffargarh", "city": "Muzaffargarh"},
    "Vehari": {"province": "Punjab", "district": "Vehari", "city": "Vehari"},
    "Khanewal": {"province": "Punjab", "district": "Khanewal", "city": "Khanewal"},
    "Jhang": {"province": "Punjab", "district": "Jhang", "city": "Jhang"},
    "Toba Tek Singh": {"province": "Punjab", "district": "Toba Tek Singh", "city": "Toba Tek Singh"},
    "Nankana Sahib": {"province": "Punjab", "district": "Nankana Sahib", "city": "Nankana Sahib"},
    "Hafizabad": {"province": "Punjab", "district": "Hafizabad", "city": "Hafizabad"},
    "Bhakkar": {"province": "Punjab", "district": "Bhakkar", "city": "Bhakkar"},
    "Mianwali": {"province": "Punjab", "district": "Mianwali", "city": "Mianwali"},
    "Khushab": {"province": "Punjab", "district": "Khushab", "city": "Khushab"},
    "Lodhran": {"province": "Punjab", "district": "Lodhran", "city": "Lodhran"},
    "Pakpattan": {"province": "Punjab", "district": "Pakpattan", "city": "Pakpattan"},
    "Narowal": {"province": "Punjab", "district": "Narowal", "city": "Narowal"},
    "Bahawalnagar": {"province": "Punjab", "district": "Bahawalnagar", "city": "Bahawalnagar"},
    "Layyah": {"province": "Punjab", "district": "Layyah", "city": "Layyah"},
    "Rajanpur": {"province": "Punjab", "district": "Rajanpur", "city": "Rajanpur"},
    "Chiniot": {"province": "Punjab", "district": "Chiniot", "city": "Chiniot"},
    # Sindh
    "Karachi": {"province": "Sindh", "district": "Karachi", "city": "Karachi"},
    "Hyderabad": {"province": "Sindh", "district": "Hyderabad", "city": "Hyderabad"},
    "Sukkur": {"province": "Sindh", "district": "Sukkur", "city": "Sukkur"},
    "Larkana": {"province": "Sindh", "district": "Larkana", "city": "Larkana"},
    "Mirpur Khas": {"province": "Sindh", "district": "Mirpur Khas", "city": "Mirpur Khas"},
    "Nawabshah": {"province": "Sindh", "district": "Shaheed Benazirabad", "city": "Nawabshah"},
    "Thatta": {"province": "Sindh", "district": "Thatta", "city": "Thatta"},
    "Badin": {"province": "Sindh", "district": "Badin", "city": "Badin"},
    "Jacobabad": {"province": "Sindh", "district": "Jacobabad", "city": "Jacobabad"},
    "Shikarpur": {"province": "Sindh", "district": "Shikarpur", "city": "Shikarpur"},
    # KPK
    "Peshawar": {"province": "Khyber Pakhtunkhwa", "district": "Peshawar", "city": "Peshawar"},
    "Abbottabad": {"province": "Khyber Pakhtunkhwa", "district": "Abbottabad", "city": "Abbottabad"},
    "Mardan": {"province": "Khyber Pakhtunkhwa", "district": "Mardan", "city": "Mardan"},
    "Swat": {"province": "Khyber Pakhtunkhwa", "district": "Swat", "city": "Mingora"},
    "Mansehra": {"province": "Khyber Pakhtunkhwa", "district": "Mansehra", "city": "Mansehra"},
    "Kohat": {"province": "Khyber Pakhtunkhwa", "district": "Kohat", "city": "Kohat"},
    "Dera Ismail Khan": {"province": "Khyber Pakhtunkhwa", "district": "Dera Ismail Khan", "city": "Dera Ismail Khan"},
    "Nowshera": {"province": "Khyber Pakhtunkhwa", "district": "Nowshera", "city": "Nowshera"},
    "Charsadda": {"province": "Khyber Pakhtunkhwa", "district": "Charsadda", "city": "Charsadda"},
    "Bannu": {"province": "Khyber Pakhtunkhwa", "district": "Bannu", "city": "Bannu"},
    "Haripur": {"province": "Khyber Pakhtunkhwa", "district": "Haripur", "city": "Haripur"},
    # Balochistan
    "Quetta": {"province": "Balochistan", "district": "Quetta", "city": "Quetta"},
    "Gwadar": {"province": "Balochistan", "district": "Gwadar", "city": "Gwadar"},
    "Khuzdar": {"province": "Balochistan", "district": "Khuzdar", "city": "Khuzdar"},
    "Turbat": {"province": "Balochistan", "district": "Kech", "city": "Turbat"},
    "Sibi": {"province": "Balochistan", "district": "Sibi", "city": "Sibi"},
    # Gilgit-Baltistan
    "Gilgit": {"province": "Gilgit-Baltistan", "district": "Gilgit", "city": "Gilgit"},
    "Skardu": {"province": "Gilgit-Baltistan", "district": "Skardu", "city": "Skardu"},
    # AJK
    "Muzaffarabad": {"province": "Azad Kashmir", "district": "Muzaffarabad", "city": "Muzaffarabad"},
    "Mirpur": {"province": "Azad Kashmir", "district": "Mirpur", "city": "Mirpur"},
}

# ──────────────────────────────────────────────────────────────────────────────
# Tehsils / towns (sub-district entities)
# ──────────────────────────────────────────────────────────────────────────────
PAKISTAN_TEHSILS: dict[str, dict] = {
    # Sahiwal Division
    "Chichawatni": {"province": "Punjab", "district": "Sahiwal", "tehsil": "Chichawatni", "city": "Chichawatni"},
    "Depalpur": {"province": "Punjab", "district": "Okara", "tehsil": "Depalpur", "city": "Depalpur"},
    "Renala Khurd": {"province": "Punjab", "district": "Okara", "tehsil": "Renala Khurd", "city": "Renala Khurd"},
    "Pattoki": {"province": "Punjab", "district": "Kasur", "tehsil": "Pattoki", "city": "Pattoki"},
    "Chunian": {"province": "Punjab", "district": "Kasur", "tehsil": "Chunian", "city": "Chunian"},
    # Lahore tehsils
    "Model Town": {"province": "Punjab", "district": "Lahore", "tehsil": "Model Town", "city": "Lahore"},
    "Shalimar": {"province": "Punjab", "district": "Lahore", "tehsil": "Shalimar", "city": "Lahore"},
    "Cantt": {"province": "Punjab", "district": "Lahore", "tehsil": "Cantt", "city": "Lahore"},
    # Okara tehsils
    "Okara Cantt": {"province": "Punjab", "district": "Okara", "tehsil": "Okara", "city": "Okara"},
    # Other Punjab tehsils
    "Sillanwali": {"province": "Punjab", "district": "Sargodha", "tehsil": "Sillanwali", "city": "Sillanwali"},
    "Shahpur": {"province": "Punjab", "district": "Sargodha", "tehsil": "Shahpur", "city": "Shahpur"},
    "Bhalwal": {"province": "Punjab", "district": "Sargodha", "tehsil": "Bhalwal", "city": "Bhalwal"},
    "Kamalia": {"province": "Punjab", "district": "Toba Tek Singh", "tehsil": "Kamalia", "city": "Kamalia"},
    "Gojra": {"province": "Punjab", "district": "Toba Tek Singh", "tehsil": "Gojra", "city": "Gojra"},
    "Mian Channu": {"province": "Punjab", "district": "Khanewal", "tehsil": "Mian Channu", "city": "Mian Channu"},
    "Kabirwala": {"province": "Punjab", "district": "Khanewal", "tehsil": "Kabirwala", "city": "Kabirwala"},
    "Arifwala": {"province": "Punjab", "district": "Pakpattan", "tehsil": "Arifwala", "city": "Arifwala"},
    "Burewala": {"province": "Punjab", "district": "Vehari", "tehsil": "Burewala", "city": "Burewala"},
    "Dina": {"province": "Punjab", "district": "Jhelum", "tehsil": "Dina", "city": "Dina"},
    "Sohawa": {"province": "Punjab", "district": "Jhelum", "tehsil": "Sohawa", "city": "Sohawa"},
    "Pind Dadan Khan": {"province": "Punjab", "district": "Jhelum", "tehsil": "Pind Dadan Khan", "city": "Pind Dadan Khan"},
    # Sindh tehsils
    "Thana Bulla Khan": {"province": "Sindh", "district": "Jamshoro", "tehsil": "Thana Bulla Khan"},
    # KPK tehsils
    "Taxila": {"province": "Punjab", "district": "Rawalpindi", "tehsil": "Taxila", "city": "Taxila"},
    "Kahuta": {"province": "Punjab", "district": "Rawalpindi", "tehsil": "Kahuta", "city": "Kahuta"},
    "Gujar Khan": {"province": "Punjab", "district": "Rawalpindi", "tehsil": "Gujar Khan", "city": "Gujar Khan"},
    "Murree": {"province": "Punjab", "district": "Rawalpindi", "tehsil": "Murree", "city": "Murree"},
}

# ──────────────────────────────────────────────────────────────────────────────
# Housing societies (resolved by name; actual coords come from geocoding)
# ──────────────────────────────────────────────────────────────────────────────
PAKISTAN_SOCIETIES: dict[str, dict] = {
    "DHA": {"type": "housing_society"},
    "Bahria Town": {"type": "housing_society"},
    "Bahria Orchard": {"type": "housing_society"},
    "Bahria Enclave": {"type": "housing_society"},
    "Gulberg Greens": {"type": "housing_society"},
    "Gulberg Residencia": {"type": "housing_society"},
    "Johar Town": {"type": "housing_society"},
    "Lake City": {"type": "housing_society"},
    "Wapda Town": {"type": "housing_society"},
    "Model Town": {"type": "housing_society"},
    "Park View City": {"type": "housing_society"},
    "Valencia Town": {"type": "housing_society"},
    "Garden Town": {"type": "housing_society"},
    "Iqbal Town": {"type": "housing_society"},
    "Township": {"type": "housing_society"},
    "Askari": {"type": "housing_society"},
    "Cavalry Ground": {"type": "housing_society"},
    "Cantt View Society": {"type": "housing_society"},
    "Fazaia Housing Scheme": {"type": "housing_society"},
    "PWD Housing Scheme": {"type": "housing_society"},
    "National Police Foundation": {"type": "housing_society"},
    "Pakistan Town": {"type": "housing_society"},
    "Top City": {"type": "housing_society"},
    "Capital Smart City": {"type": "housing_society"},
}

# ──────────────────────────────────────────────────────────────────────────────
# Roman Urdu / Urdu aliases → canonical name
# ──────────────────────────────────────────────────────────────────────────────
LOCATION_ALIASES: dict[str, str] = {
    "lahore": "Lahore",
    "karaachi": "Karachi",
    "karachi": "Karachi",
    "islamabad": "Islamabad",
    "pindi": "Rawalpindi",
    "rawalpindi": "Rawalpindi",
    "faisalabad": "Faisalabad",
    "multan": "Multan",
    "sahiwal": "Sahiwal",
    "okara": "Okara",
    "sialkot": "Sialkot",
    "gujranwala": "Gujranwala",
    "gujrat": "Gujrat",
    "peshawar": "Peshawar",
    "quetta": "Quetta",
    "chichawatni": "Chichawatni",
    "depalpur": "Depalpur",
    "hyderabad": "Hyderabad",
}
