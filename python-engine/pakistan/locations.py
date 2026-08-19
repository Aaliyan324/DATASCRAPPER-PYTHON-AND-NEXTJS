"""
Pakistan location registry.

Provides:
    - PAKISTAN_LOCATIONS
    - PAKISTAN_TEHSILS
    - PAKISTAN_SOCIETIES
    - LOCATION_ALIASES
    - normalize_location()
    - get_location()

This module is designed to be imported by the rest of the
Pakistan scraper / geocoding engine.
"""

from __future__ import annotations


# ============================================================
# MAJOR CITIES / TOWNS
# ============================================================

PAKISTAN_LOCATIONS: dict[str, dict] = {

    # ========================================================
    # ISLAMABAD CAPITAL TERRITORY
    # ========================================================

    "Islamabad": {
        "province": "Islamabad Capital Territory",
        "district": "Islamabad",
        "city": "Islamabad",
    },

    "Bara Kahu": {
        "province": "Islamabad Capital Territory",
        "district": "Islamabad",
        "city": "Islamabad",
    },

    "Bhara Kahu": {
        "province": "Islamabad Capital Territory",
        "district": "Islamabad",
        "city": "Islamabad",
    },

    "Nilore": {
        "province": "Islamabad Capital Territory",
        "district": "Islamabad",
        "city": "Islamabad",
    },

    "Sihala": {
        "province": "Islamabad Capital Territory",
        "district": "Islamabad",
        "city": "Islamabad",
    },

    "Tarnol": {
        "province": "Islamabad Capital Territory",
        "district": "Islamabad",
        "city": "Islamabad",
    },


    # ========================================================
    # PUNJAB
    # ========================================================

    "Lahore": {
        "province": "Punjab",
        "district": "Lahore",
        "city": "Lahore",
    },

    "Rawalpindi": {
        "province": "Punjab",
        "district": "Rawalpindi",
        "city": "Rawalpindi",
    },

    "Faisalabad": {
        "province": "Punjab",
        "district": "Faisalabad",
        "city": "Faisalabad",
    },

    "Multan": {
        "province": "Punjab",
        "district": "Multan",
        "city": "Multan",
    },

    "Gujranwala": {
        "province": "Punjab",
        "district": "Gujranwala",
        "city": "Gujranwala",
    },

    "Sialkot": {
        "province": "Punjab",
        "district": "Sialkot",
        "city": "Sialkot",
    },

    "Gujrat": {
        "province": "Punjab",
        "district": "Gujrat",
        "city": "Gujrat",
    },

    "Sargodha": {
        "province": "Punjab",
        "district": "Sargodha",
        "city": "Sargodha",
    },

    "Bahawalpur": {
        "province": "Punjab",
        "district": "Bahawalpur",
        "city": "Bahawalpur",
    },

    "Sahiwal": {
        "province": "Punjab",
        "district": "Sahiwal",
        "city": "Sahiwal",
    },

    "Sheikhupura": {
        "province": "Punjab",
        "district": "Sheikhupura",
        "city": "Sheikhupura",
    },

    "Jhang": {
        "province": "Punjab",
        "district": "Jhang",
        "city": "Jhang",
    },

    "Rahim Yar Khan": {
        "province": "Punjab",
        "district": "Rahim Yar Khan",
        "city": "Rahim Yar Khan",
    },

    "Dera Ghazi Khan": {
        "province": "Punjab",
        "district": "Dera Ghazi Khan",
        "city": "Dera Ghazi Khan",
    },

    "Kasur": {
        "province": "Punjab",
        "district": "Kasur",
        "city": "Kasur",
    },

    "Okara": {
        "province": "Punjab",
        "district": "Okara",
        "city": "Okara",
    },

    "Chakwal": {
        "province": "Punjab",
        "district": "Chakwal",
        "city": "Chakwal",
    },

    "Jhelum": {
        "province": "Punjab",
        "district": "Jhelum",
        "city": "Jhelum",
    },

    "Attock": {
        "province": "Punjab",
        "district": "Attock",
        "city": "Attock",
    },

    "Mandi Bahauddin": {
        "province": "Punjab",
        "district": "Mandi Bahauddin",
        "city": "Mandi Bahauddin",
    },

    "Hafizabad": {
        "province": "Punjab",
        "district": "Hafizabad",
        "city": "Hafizabad",
    },

    "Nankana Sahib": {
        "province": "Punjab",
        "district": "Nankana Sahib",
        "city": "Nankana Sahib",
    },

    "Narowal": {
        "province": "Punjab",
        "district": "Narowal",
        "city": "Narowal",
    },

    "Chiniot": {
        "province": "Punjab",
        "district": "Chiniot",
        "city": "Chiniot",
    },

    "Toba Tek Singh": {
        "province": "Punjab",
        "district": "Toba Tek Singh",
        "city": "Toba Tek Singh",
    },

    "Vehari": {
        "province": "Punjab",
        "district": "Vehari",
        "city": "Vehari",
    },

    "Khanewal": {
        "province": "Punjab",
        "district": "Khanewal",
        "city": "Khanewal",
    },

    "Muzaffargarh": {
        "province": "Punjab",
        "district": "Muzaffargarh",
        "city": "Muzaffargarh",
    },

    "Layyah": {
        "province": "Punjab",
        "district": "Layyah",
        "city": "Layyah",
    },

    "Bhakkar": {
        "province": "Punjab",
        "district": "Bhakkar",
        "city": "Bhakkar",
    },

    "Mianwali": {
        "province": "Punjab",
        "district": "Mianwali",
        "city": "Mianwali",
    },

    "Khushab": {
        "province": "Punjab",
        "district": "Khushab",
        "city": "Khushab",
    },

    "Lodhran": {
        "province": "Punjab",
        "district": "Lodhran",
        "city": "Lodhran",
    },

    "Pakpattan": {
        "province": "Punjab",
        "district": "Pakpattan",
        "city": "Pakpattan",
    },

    "Bahawalnagar": {
        "province": "Punjab",
        "district": "Bahawalnagar",
        "city": "Bahawalnagar",
    },

    "Rajanpur": {
        "province": "Punjab",
        "district": "Rajanpur",
        "city": "Rajanpur",
    },

    # Punjab towns

    "Muridke": {
        "province": "Punjab",
        "district": "Sheikhupura",
        "city": "Muridke",
    },

    "Kamoke": {
        "province": "Punjab",
        "district": "Gujranwala",
        "city": "Kamoke",
    },

    "Wazirabad": {
        "province": "Punjab",
        "district": "Gujranwala",
        "city": "Wazirabad",
    },

    "Daska": {
        "province": "Punjab",
        "district": "Sialkot",
        "city": "Daska",
    },

    "Sambrial": {
        "province": "Punjab",
        "district": "Sialkot",
        "city": "Sambrial",
    },

    "Pasrur": {
        "province": "Punjab",
        "district": "Sialkot",
        "city": "Pasrur",
    },

    "Kharian": {
        "province": "Punjab",
        "district": "Gujrat",
        "city": "Kharian",
    },

    "Lalamusa": {
        "province": "Punjab",
        "district": "Gujrat",
        "city": "Lalamusa",
    },

    "Sarai Alamgir": {
        "province": "Punjab",
        "district": "Gujrat",
        "city": "Sarai Alamgir",
    },

    "Jalalpur Jattan": {
        "province": "Punjab",
        "district": "Gujrat",
        "city": "Jalalpur Jattan",
    },

    "Kunjah": {
        "province": "Punjab",
        "district": "Gujrat",
        "city": "Kunjah",
    },

    "Taxila": {
        "province": "Punjab",
        "district": "Rawalpindi",
        "city": "Taxila",
    },

    "Wah Cantt": {
        "province": "Punjab",
        "district": "Rawalpindi",
        "city": "Wah Cantt",
    },

    "Gujar Khan": {
        "province": "Punjab",
        "district": "Rawalpindi",
        "city": "Gujar Khan",
    },

    "Kahuta": {
        "province": "Punjab",
        "district": "Rawalpindi",
        "city": "Kahuta",
    },

    "Kallar Syedan": {
        "province": "Punjab",
        "district": "Rawalpindi",
        "city": "Kallar Syedan",
    },

    "Murree": {
        "province": "Punjab",
        "district": "Rawalpindi",
        "city": "Murree",
    },

    "Kotli Sattian": {
        "province": "Punjab",
        "district": "Rawalpindi",
        "city": "Kotli Sattian",
    },

    "Fateh Jang": {
        "province": "Punjab",
        "district": "Attock",
        "city": "Fateh Jang",
    },

    "Pindi Gheb": {
        "province": "Punjab",
        "district": "Attock",
        "city": "Pindi Gheb",
    },

    "Hazro": {
        "province": "Punjab",
        "district": "Attock",
        "city": "Hazro",
    },

    "Jand": {
        "province": "Punjab",
        "district": "Attock",
        "city": "Jand",
    },

    "Talagang": {
        "province": "Punjab",
        "district": "Chakwal",
        "city": "Talagang",
    },

    "Kallar Kahar": {
        "province": "Punjab",
        "district": "Chakwal",
        "city": "Kallar Kahar",
    },

    "Choa Saidan Shah": {
        "province": "Punjab",
        "district": "Chakwal",
        "city": "Choa Saidan Shah",
    },

    "Dina": {
        "province": "Punjab",
        "district": "Jhelum",
        "city": "Dina",
    },

    "Sohawa": {
        "province": "Punjab",
        "district": "Jhelum",
        "city": "Sohawa",
    },

    "Pind Dadan Khan": {
        "province": "Punjab",
        "district": "Jhelum",
        "city": "Pind Dadan Khan",
    },

    "Jaranwala": {
        "province": "Punjab",
        "district": "Faisalabad",
        "city": "Jaranwala",
    },

    "Samundri": {
        "province": "Punjab",
        "district": "Faisalabad",
        "city": "Samundri",
    },

    "Tandlianwala": {
        "province": "Punjab",
        "district": "Faisalabad",
        "city": "Tandlianwala",
    },

    "Gojra": {
        "province": "Punjab",
        "district": "Toba Tek Singh",
        "city": "Gojra",
    },

    "Kamalia": {
        "province": "Punjab",
        "district": "Toba Tek Singh",
        "city": "Kamalia",
    },

    "Arifwala": {
        "province": "Punjab",
        "district": "Pakpattan",
        "city": "Arifwala",
    },

    "Burewala": {
        "province": "Punjab",
        "district": "Vehari",
        "city": "Burewala",
    },

    "Mailsi": {
        "province": "Punjab",
        "district": "Vehari",
        "city": "Mailsi",
    },

    "Mian Channu": {
        "province": "Punjab",
        "district": "Khanewal",
        "city": "Mian Channu",
    },

    "Kabirwala": {
        "province": "Punjab",
        "district": "Khanewal",
        "city": "Kabirwala",
    },

    "Depalpur": {
        "province": "Punjab",
        "district": "Okara",
        "city": "Depalpur",
    },

    "Renala Khurd": {
        "province": "Punjab",
        "district": "Okara",
        "city": "Renala Khurd",
    },

    "Pattoki": {
        "province": "Punjab",
        "district": "Kasur",
        "city": "Pattoki",
    },

    "Chunian": {
        "province": "Punjab",
        "district": "Kasur",
        "city": "Chunian",
    },

    "Kot Radha Kishan": {
        "province": "Punjab",
        "district": "Kasur",
        "city": "Kot Radha Kishan",
    },

    "Ahmadpur East": {
        "province": "Punjab",
        "district": "Bahawalpur",
        "city": "Ahmadpur East",
    },

    "Hasilpur": {
        "province": "Punjab",
        "district": "Bahawalpur",
        "city": "Hasilpur",
    },

    "Yazman": {
        "province": "Punjab",
        "district": "Bahawalpur",
        "city": "Yazman",
    },

    "Khanpur": {
        "province": "Punjab",
        "district": "Rahim Yar Khan",
        "city": "Khanpur",
    },

    "Sadiqabad": {
        "province": "Punjab",
        "district": "Rahim Yar Khan",
        "city": "Sadiqabad",
    },

    "Liaquatpur": {
        "province": "Punjab",
        "district": "Rahim Yar Khan",
        "city": "Liaquatpur",
    },

    "Kot Addu": {
        "province": "Punjab",
        "district": "Muzaffargarh",
        "city": "Kot Addu",
    },

    "Alipur": {
        "province": "Punjab",
        "district": "Muzaffargarh",
        "city": "Alipur",
    },

    "Jatoi": {
        "province": "Punjab",
        "district": "Muzaffargarh",
        "city": "Jatoi",
    },

    "Taunsa": {
        "province": "Punjab",
        "district": "Dera Ghazi Khan",
        "city": "Taunsa",
    },

    "Kot Chutta": {
        "province": "Punjab",
        "district": "Dera Ghazi Khan",
        "city": "Kot Chutta",
    },

    "Chowk Azam": {
        "province": "Punjab",
        "district": "Layyah",
        "city": "Chowk Azam",
    },

    "Karor Lal Esan": {
        "province": "Punjab",
        "district": "Layyah",
        "city": "Karor Lal Esan",
    },


    # ========================================================
    # SINDH
    # ========================================================

    "Karachi": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "Hyderabad": {
        "province": "Sindh",
        "district": "Hyderabad",
        "city": "Hyderabad",
    },

    "Sukkur": {
        "province": "Sindh",
        "district": "Sukkur",
        "city": "Sukkur",
    },

    "Larkana": {
        "province": "Sindh",
        "district": "Larkana",
        "city": "Larkana",
    },

    "Mirpur Khas": {
        "province": "Sindh",
        "district": "Mirpur Khas",
        "city": "Mirpur Khas",
    },

    "Nawabshah": {
        "province": "Sindh",
        "district": "Shaheed Benazirabad",
        "city": "Nawabshah",
    },

    "Thatta": {
        "province": "Sindh",
        "district": "Thatta",
        "city": "Thatta",
    },

    "Badin": {
        "province": "Sindh",
        "district": "Badin",
        "city": "Badin",
    },

    "Jacobabad": {
        "province": "Sindh",
        "district": "Jacobabad",
        "city": "Jacobabad",
    },

    "Shikarpur": {
        "province": "Sindh",
        "district": "Shikarpur",
        "city": "Shikarpur",
    },

    "Kotri": {
        "province": "Sindh",
        "district": "Jamshoro",
        "city": "Kotri",
    },

    "Jamshoro": {
        "province": "Sindh",
        "district": "Jamshoro",
        "city": "Jamshoro",
    },

    "Dadu": {
        "province": "Sindh",
        "district": "Dadu",
        "city": "Dadu",
    },

    "Sehwan": {
        "province": "Sindh",
        "district": "Jamshoro",
        "city": "Sehwan",
    },

    "Tando Adam": {
        "province": "Sindh",
        "district": "Sanghar",
        "city": "Tando Adam",
    },

    "Tando Allahyar": {
        "province": "Sindh",
        "district": "Tando Allahyar",
        "city": "Tando Allahyar",
    },

    "Tando Muhammad Khan": {
        "province": "Sindh",
        "district": "Tando Muhammad Khan",
        "city": "Tando Muhammad Khan",
    },

    "Matiari": {
        "province": "Sindh",
        "district": "Matiari",
        "city": "Matiari",
    },

    "Ghotki": {
        "province": "Sindh",
        "district": "Ghotki",
        "city": "Ghotki",
    },

    "Mirpur Mathelo": {
        "province": "Sindh",
        "district": "Ghotki",
        "city": "Mirpur Mathelo",
    },

    "Daharki": {
        "province": "Sindh",
        "district": "Ghotki",
        "city": "Daharki",
    },

    "Kandhkot": {
        "province": "Sindh",
        "district": "Kashmore",
        "city": "Kandhkot",
    },

    "Kashmore": {
        "province": "Sindh",
        "district": "Kashmore",
        "city": "Kashmore",
    },

    "Kambar": {
        "province": "Sindh",
        "district": "Qambar Shahdadkot",
        "city": "Kambar",
    },

    "Shahdadkot": {
        "province": "Sindh",
        "district": "Qambar Shahdadkot",
        "city": "Shahdadkot",
    },

    "Ratodero": {
        "province": "Sindh",
        "district": "Larkana",
        "city": "Ratodero",
    },

    "Moro": {
        "province": "Sindh",
        "district": "Naushahro Feroze",
        "city": "Moro",
    },

    "Naushahro Feroze": {
        "province": "Sindh",
        "district": "Naushahro Feroze",
        "city": "Naushahro Feroze",
    },

    "Sakrand": {
        "province": "Sindh",
        "district": "Shaheed Benazirabad",
        "city": "Sakrand",
    },

    "Sanghar": {
        "province": "Sindh",
        "district": "Sanghar",
        "city": "Sanghar",
    },

    "Shahdadpur": {
        "province": "Sindh",
        "district": "Sanghar",
        "city": "Shahdadpur",
    },

    "Umerkot": {
        "province": "Sindh",
        "district": "Umerkot",
        "city": "Umerkot",
    },

    "Mithi": {
        "province": "Sindh",
        "district": "Tharparkar",
        "city": "Mithi",
    },


    # ========================================================
    # KARACHI AREAS
    # ========================================================

    "Gulshan-e-Iqbal": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "Gulistan-e-Johar": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "North Nazimabad": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "Nazimabad": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "Clifton": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "PECHS": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "Korangi": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "Malir": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "Landhi": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "Orangi Town": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "Surjani Town": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "Federal B Area": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "Saddar": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },

    "Lyari": {
        "province": "Sindh",
        "district": "Karachi",
        "city": "Karachi",
    },


    # ========================================================
    # KHYBER PAKHTUNKHWA
    # ========================================================

    "Peshawar": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Peshawar",
        "city": "Peshawar",
    },

    "Mardan": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Mardan",
        "city": "Mardan",
    },

    "Abbottabad": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Abbottabad",
        "city": "Abbottabad",
    },

    "Mansehra": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Mansehra",
        "city": "Mansehra",
    },

    "Kohat": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Kohat",
        "city": "Kohat",
    },

    "Bannu": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Bannu",
        "city": "Bannu",
    },

    "Dera Ismail Khan": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Dera Ismail Khan",
        "city": "Dera Ismail Khan",
    },

    "Nowshera": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Nowshera",
        "city": "Nowshera",
    },

    "Charsadda": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Charsadda",
        "city": "Charsadda",
    },

    "Haripur": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Haripur",
        "city": "Haripur",
    },

    "Swabi": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Swabi",
        "city": "Swabi",
    },

    "Karak": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Karak",
        "city": "Karak",
    },

    "Hangu": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Hangu",
        "city": "Hangu",
    },

    "Tank": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Tank",
        "city": "Tank",
    },

    "Battagram": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Battagram",
        "city": "Battagram",
    },

    "Chitral": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Upper Chitral",
        "city": "Chitral",
    },

    "Timergara": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Lower Dir",
        "city": "Timergara",
    },

    "Dir": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Upper Dir",
        "city": "Dir",
    },

    "Batkhela": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Malakand",
        "city": "Batkhela",
    },

    "Daggar": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Buner",
        "city": "Daggar",
    },

    "Alpuri": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Shangla",
        "city": "Alpuri",
    },

    "Dasu": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Upper Kohistan",
        "city": "Dasu",
    },

    "Mingora": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Swat",
        "city": "Mingora",
    },

    "Saidu Sharif": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Swat",
        "city": "Saidu Sharif",
    },

    "Kalam": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Swat",
        "city": "Kalam",
    },

    "Malam Jabba": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Swat",
        "city": "Malam Jabba",
    },


    # ========================================================
    # BALOCHISTAN
    # ========================================================

    "Quetta": {
        "province": "Balochistan",
        "district": "Quetta",
        "city": "Quetta",
    },

    "Gwadar": {
        "province": "Balochistan",
        "district": "Gwadar",
        "city": "Gwadar",
    },

    "Turbat": {
        "province": "Balochistan",
        "district": "Kech",
        "city": "Turbat",
    },

    "Khuzdar": {
        "province": "Balochistan",
        "district": "Khuzdar",
        "city": "Khuzdar",
    },

    "Sibi": {
        "province": "Balochistan",
        "district": "Sibi",
        "city": "Sibi",
    },

    "Chaman": {
        "province": "Balochistan",
        "district": "Qila Abdullah",
        "city": "Chaman",
    },

    "Zhob": {
        "province": "Balochistan",
        "district": "Zhob",
        "city": "Zhob",
    },

    "Loralai": {
        "province": "Balochistan",
        "district": "Loralai",
        "city": "Loralai",
    },

    "Hub": {
        "province": "Balochistan",
        "district": "Lasbela",
        "city": "Hub",
    },

    "Uthal": {
        "province": "Balochistan",
        "district": "Lasbela",
        "city": "Uthal",
    },

    "Kalat": {
        "province": "Balochistan",
        "district": "Kalat",
        "city": "Kalat",
    },

    "Mastung": {
        "province": "Balochistan",
        "district": "Mastung",
        "city": "Mastung",
    },

    "Nushki": {
        "province": "Balochistan",
        "district": "Nushki",
        "city": "Nushki",
    },

    "Kharan": {
        "province": "Balochistan",
        "district": "Kharan",
        "city": "Kharan",
    },

    "Panjgur": {
        "province": "Balochistan",
        "district": "Panjgur",
        "city": "Panjgur",
    },

    "Dera Murad Jamali": {
        "province": "Balochistan",
        "district": "Nasirabad",
        "city": "Dera Murad Jamali",
    },

    "Dera Allah Yar": {
        "province": "Balochistan",
        "district": "Jaffarabad",
        "city": "Dera Allah Yar",
    },

    "Awaran": {
        "province": "Balochistan",
        "district": "Awaran",
        "city": "Awaran",
    },


    # ========================================================
    # GILGIT-BALTISTAN
    # ========================================================

    "Gilgit": {
        "province": "Gilgit-Baltistan",
        "district": "Gilgit",
        "city": "Gilgit",
    },

    "Skardu": {
        "province": "Gilgit-Baltistan",
        "district": "Skardu",
        "city": "Skardu",
    },

    "Hunza": {
        "province": "Gilgit-Baltistan",
        "district": "Hunza",
        "city": "Karimabad",
    },

    "Karimabad": {
        "province": "Gilgit-Baltistan",
        "district": "Hunza",
        "city": "Karimabad",
    },

    "Nagar": {
        "province": "Gilgit-Baltistan",
        "district": "Nagar",
        "city": "Nagar",
    },

    "Chilas": {
        "province": "Gilgit-Baltistan",
        "district": "Diamer",
        "city": "Chilas",
    },

    "Astore": {
        "province": "Gilgit-Baltistan",
        "district": "Astore",
        "city": "Astore",
    },

    "Khaplu": {
        "province": "Gilgit-Baltistan",
        "district": "Ghanche",
        "city": "Khaplu",
    },

    "Shigar": {
        "province": "Gilgit-Baltistan",
        "district": "Shigar",
        "city": "Shigar",
    },

    "Gahkuch": {
        "province": "Gilgit-Baltistan",
        "district": "Ghizer",
        "city": "Gahkuch",
    },

    "Danyor": {
        "province": "Gilgit-Baltistan",
        "district": "Gilgit",
        "city": "Danyor",
    },

    "Juglot": {
        "province": "Gilgit-Baltistan",
        "district": "Gilgit",
        "city": "Juglot",
    },


    # ========================================================
    # AZAD JAMMU & KASHMIR
    # ========================================================

    "Muzaffarabad": {
        "province": "Azad Kashmir",
        "district": "Muzaffarabad",
        "city": "Muzaffarabad",
    },

    "Mirpur": {
        "province": "Azad Kashmir",
        "district": "Mirpur",
        "city": "Mirpur",
    },

    "Kotli": {
        "province": "Azad Kashmir",
        "district": "Kotli",
        "city": "Kotli",
    },

    "Bhimber": {
        "province": "Azad Kashmir",
        "district": "Bhimber",
        "city": "Bhimber",
    },

    "Bagh": {
        "province": "Azad Kashmir",
        "district": "Bagh",
        "city": "Bagh",
    },

    "Rawalakot": {
        "province": "Azad Kashmir",
        "district": "Poonch",
        "city": "Rawalakot",
    },

    "Pallandri": {
        "province": "Azad Kashmir",
        "district": "Sudhanoti",
        "city": "Pallandri",
    },

    "Athmuqam": {
        "province": "Azad Kashmir",
        "district": "Neelum",
        "city": "Athmuqam",
    },

    "Forward Kahuta": {
        "province": "Azad Kashmir",
        "district": "Haveli",
        "city": "Forward Kahuta",
    },

    "Leepa": {
        "province": "Azad Kashmir",
        "district": "Hattian Bala",
        "city": "Leepa",
    },

    "Dadyal": {
        "province": "Azad Kashmir",
        "district": "Mirpur",
        "city": "Dadyal",
    },

    "Chakswari": {
        "province": "Azad Kashmir",
        "district": "Mirpur",
        "city": "Chakswari",
    },

    "Sehnsa": {
        "province": "Azad Kashmir",
        "district": "Kotli",
        "city": "Sehnsa",
    },

    "Khuiratta": {
        "province": "Azad Kashmir",
        "district": "Kotli",
        "city": "Khuiratta",
    },
}


# ============================================================
# TEHSILS / TOWNS
# ============================================================

PAKISTAN_TEHSILS: dict[str, dict] = {

    # Punjab
    "Chichawatni": {
        "province": "Punjab",
        "district": "Sahiwal",
        "tehsil": "Chichawatni",
        "city": "Chichawatni",
    },

    "Depalpur": {
        "province": "Punjab",
        "district": "Okara",
        "tehsil": "Depalpur",
        "city": "Depalpur",
    },

    "Renala Khurd": {
        "province": "Punjab",
        "district": "Okara",
        "tehsil": "Renala Khurd",
        "city": "Renala Khurd",
    },

    "Pattoki": {
        "province": "Punjab",
        "district": "Kasur",
        "tehsil": "Pattoki",
        "city": "Pattoki",
    },

    "Chunian": {
        "province": "Punjab",
        "district": "Kasur",
        "tehsil": "Chunian",
        "city": "Chunian",
    },

    "Model Town": {
        "province": "Punjab",
        "district": "Lahore",
        "tehsil": "Model Town",
        "city": "Lahore",
    },

    "Shalimar": {
        "province": "Punjab",
        "district": "Lahore",
        "tehsil": "Shalimar",
        "city": "Lahore",
    },

    "Lahore Cantt": {
        "province": "Punjab",
        "district": "Lahore",
        "tehsil": "Lahore Cantt",
        "city": "Lahore",
    },

    "Sillanwali": {
        "province": "Punjab",
        "district": "Sargodha",
        "tehsil": "Sillanwali",
        "city": "Sillanwali",
    },

    "Shahpur": {
        "province": "Punjab",
        "district": "Sargodha",
        "tehsil": "Shahpur",
        "city": "Shahpur",
    },

    "Bhalwal": {
        "province": "Punjab",
        "district": "Sargodha",
        "tehsil": "Bhalwal",
        "city": "Bhalwal",
    },

    "Kamalia": {
        "province": "Punjab",
        "district": "Toba Tek Singh",
        "tehsil": "Kamalia",
        "city": "Kamalia",
    },

    "Gojra": {
        "province": "Punjab",
        "district": "Toba Tek Singh",
        "tehsil": "Gojra",
        "city": "Gojra",
    },

    "Mian Channu": {
        "province": "Punjab",
        "district": "Khanewal",
        "tehsil": "Mian Channu",
        "city": "Mian Channu",
    },

    "Kabirwala": {
        "province": "Punjab",
        "district": "Khanewal",
        "tehsil": "Kabirwala",
        "city": "Kabirwala",
    },

    "Arifwala": {
        "province": "Punjab",
        "district": "Pakpattan",
        "tehsil": "Arifwala",
        "city": "Arifwala",
    },

    "Burewala": {
        "province": "Punjab",
        "district": "Vehari",
        "tehsil": "Burewala",
        "city": "Burewala",
    },

    "Dina": {
        "province": "Punjab",
        "district": "Jhelum",
        "tehsil": "Dina",
        "city": "Dina",
    },

    "Sohawa": {
        "province": "Punjab",
        "district": "Jhelum",
        "tehsil": "Sohawa",
        "city": "Sohawa",
    },

    "Pind Dadan Khan": {
        "province": "Punjab",
        "district": "Jhelum",
        "tehsil": "Pind Dadan Khan",
        "city": "Pind Dadan Khan",
    },

    "Taxila": {
        "province": "Punjab",
        "district": "Rawalpindi",
        "tehsil": "Taxila",
        "city": "Taxila",
    },

    "Kahuta": {
        "province": "Punjab",
        "district": "Rawalpindi",
        "tehsil": "Kahuta",
        "city": "Kahuta",
    },

    "Gujar Khan": {
        "province": "Punjab",
        "district": "Rawalpindi",
        "tehsil": "Gujar Khan",
        "city": "Gujar Khan",
    },

    "Murree": {
        "province": "Punjab",
        "district": "Rawalpindi",
        "tehsil": "Murree",
        "city": "Murree",
    },

    # Sindh
    "Thana Bulla Khan": {
        "province": "Sindh",
        "district": "Jamshoro",
        "tehsil": "Thana Bulla Khan",
        "city": "Thana Bulla Khan",
    },

    "Kotri": {
        "province": "Sindh",
        "district": "Jamshoro",
        "tehsil": "Kotri",
        "city": "Kotri",
    },

    "Sehwan": {
        "province": "Sindh",
        "district": "Jamshoro",
        "tehsil": "Sehwan",
        "city": "Sehwan",
    },

    "Moro": {
        "province": "Sindh",
        "district": "Naushahro Feroze",
        "tehsil": "Moro",
        "city": "Moro",
    },

    "Sakrand": {
        "province": "Sindh",
        "district": "Shaheed Benazirabad",
        "tehsil": "Sakrand",
        "city": "Sakrand",
    },

    # KPK
    "Pabbi": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Nowshera",
        "tehsil": "Pabbi",
        "city": "Pabbi",
    },

    "Jehangira": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Nowshera",
        "tehsil": "Jehangira",
        "city": "Jehangira",
    },

    "Tangi": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Charsadda",
        "tehsil": "Tangi",
        "city": "Tangi",
    },

    "Shabqadar": {
        "province": "Khyber Pakhtunkhwa",
        "district": "Charsadda",
        "tehsil": "Shabqadar",
        "city": "Shabqadar",
    },

    # Balochistan
    "Turbat": {
        "province": "Balochistan",
        "district": "Kech",
        "tehsil": "Turbat",
        "city": "Turbat",
    },

    "Gwadar": {
        "province": "Balochistan",
        "district": "Gwadar",
        "tehsil": "Gwadar",
        "city": "Gwadar",
    },

    "Panjgur": {
        "province": "Balochistan",
        "district": "Panjgur",
        "tehsil": "Panjgur",
        "city": "Panjgur",
    },

    # GB
    "Danyor": {
        "province": "Gilgit-Baltistan",
        "district": "Gilgit",
        "tehsil": "Danyor",
        "city": "Danyor",
    },

    "Juglot": {
        "province": "Gilgit-Baltistan",
        "district": "Gilgit",
        "tehsil": "Juglot",
        "city": "Juglot",
    },

    "Khaplu": {
        "province": "Gilgit-Baltistan",
        "district": "Ghanche",
        "tehsil": "Khaplu",
        "city": "Khaplu",
    },

    "Shigar": {
        "province": "Gilgit-Baltistan",
        "district": "Shigar",
        "tehsil": "Shigar",
        "city": "Shigar",
    },

    # AJK
    "Dadyal": {
        "province": "Azad Kashmir",
        "district": "Mirpur",
        "tehsil": "Dadyal",
        "city": "Dadyal",
    },

    "Chakswari": {
        "province": "Azad Kashmir",
        "district": "Mirpur",
        "tehsil": "Chakswari",
        "city": "Chakswari",
    },

    "Sehnsa": {
        "province": "Azad Kashmir",
        "district": "Kotli",
        "tehsil": "Sehnsa",
        "city": "Sehnsa",
    },

    "Khuiratta": {
        "province": "Azad Kashmir",
        "district": "Kotli",
        "tehsil": "Khuiratta",
        "city": "Khuiratta",
    },
}


# ============================================================
# HOUSING SOCIETIES / AREAS
# ============================================================

PAKISTAN_SOCIETIES: dict[str, dict] = {

    # Islamabad / Rawalpindi
    "DHA Islamabad": {"type": "housing_society"},
    "DHA Rawalpindi": {"type": "housing_society"},
    "Bahria Town Islamabad": {"type": "housing_society"},
    "Bahria Town Rawalpindi": {"type": "housing_society"},
    "Bahria Enclave": {"type": "housing_society"},
    "Gulberg Greens": {"type": "housing_society"},
    "Gulberg Residencia": {"type": "housing_society"},
    "Park View City Islamabad": {"type": "housing_society"},
    "Capital Smart City": {"type": "housing_society"},
    "Top City-1": {"type": "housing_society"},
    "Mumtaz City": {"type": "housing_society"},
    "Faisal Town Islamabad": {"type": "housing_society"},
    "Soan Garden": {"type": "housing_society"},
    "PWD Housing Scheme": {"type": "housing_society"},
    "Pakistan Town": {"type": "housing_society"},
    "National Police Foundation": {"type": "housing_society"},
    "Media Town": {"type": "housing_society"},
    "Airport Housing Society": {"type": "housing_society"},

    # Islamabad sectors
    "F-6": {"type": "sector"},
    "F-7": {"type": "sector"},
    "F-8": {"type": "sector"},
    "F-10": {"type": "sector"},
    "F-11": {"type": "sector"},
    "E-7": {"type": "sector"},
    "E-11": {"type": "sector"},
    "D-12": {"type": "sector"},
    "G-5": {"type": "sector"},
    "G-6": {"type": "sector"},
    "G-7": {"type": "sector"},
    "G-8": {"type": "sector"},
    "G-9": {"type": "sector"},
    "G-10": {"type": "sector"},
    "G-11": {"type": "sector"},
    "G-12": {"type": "sector"},
    "G-13": {"type": "sector"},
    "G-14": {"type": "sector"},
    "I-8": {"type": "sector"},
    "I-9": {"type": "sector"},
    "I-10": {"type": "sector"},
    "I-11": {"type": "sector"},

    # Lahore
    "DHA Lahore": {"type": "housing_society"},
    "Bahria Town Lahore": {"type": "housing_society"},
    "Bahria Orchard": {"type": "housing_society"},
    "Lake City Lahore": {"type": "housing_society"},
    "Park View City Lahore": {"type": "housing_society"},
    "Valencia Town": {"type": "housing_society"},
    "Wapda Town Lahore": {"type": "housing_society"},
    "Johar Town": {"type": "housing_society"},
    "Model Town Lahore": {"type": "housing_society"},
    "Garden Town Lahore": {"type": "housing_society"},
    "Township Lahore": {"type": "housing_society"},
    "Iqbal Town Lahore": {"type": "housing_society"},
    "Fazaia Housing Scheme Lahore": {"type": "housing_society"},
    "Askari Lahore": {"type": "housing_society"},
    "Cavalry Ground": {"type": "area"},
    "Gulberg Lahore": {"type": "area"},
    "Cantt Lahore": {"type": "area"},

    # Karachi
    "DHA Karachi": {"type": "housing_society"},
    "Bahria Town Karachi": {"type": "housing_society"},
    "Gulshan-e-Maymar": {"type": "housing_society"},
    "Gulshan-e-Iqbal": {"type": "area"},
    "Gulistan-e-Johar": {"type": "area"},
    "North Nazimabad": {"type": "area"},
    "Nazimabad": {"type": "area"},
    "PECHS": {"type": "area"},
    "Clifton": {"type": "area"},
    "Scheme 33": {"type": "area"},
    "Malir": {"type": "area"},
    "Korangi": {"type": "area"},
    "Saddar Karachi": {"type": "area"},

    # Other major developments
    "DHA Multan": {"type": "housing_society"},
    "DHA Bahawalpur": {"type": "housing_society"},
    "DHA Gujranwala": {"type": "housing_society"},
    "DHA Peshawar": {"type": "housing_society"},
    "DHA Quetta": {"type": "housing_society"},
    "Citi Housing Gujranwala": {"type": "housing_society"},
    "Citi Housing Sialkot": {"type": "housing_society"},
    "Citi Housing Jhelum": {"type": "housing_society"},
    "Citi Housing Kharian": {"type": "housing_society"},
}


# ============================================================
# ROMAN URDU / COMMON SPELLING ALIASES
# ============================================================

LOCATION_ALIASES: dict[str, str] = {

    # Islamabad
    "isb": "Islamabad",
    "isl": "Islamabad",
    "isloo": "Islamabad",
    "islam abad": "Islamabad",
    "islamabd": "Islamabad",

    # Rawalpindi
    "pindi": "Rawalpindi",
    "pindi city": "Rawalpindi",
    "rwp": "Rawalpindi",
    "rawal pindi": "Rawalpindi",
    "rawalpindi city": "Rawalpindi",

    # Lahore
    "lhr": "Lahore",
    "lahore city": "Lahore",
    "lahor": "Lahore",
    "lahor city": "Lahore",

    # Karachi
    "khi": "Karachi",
    "khi city": "Karachi",
    "karaachi": "Karachi",
    "karachi city": "Karachi",
    "karachii": "Karachi",

    # Faisalabad
    "fsd": "Faisalabad",
    "faislabad": "Faisalabad",
    "faisalabad city": "Faisalabad",
    "fsl": "Faisalabad",

    # Multan
    "mtn": "Multan",
    "multan city": "Multan",

    # Gujranwala
    "gujranwala city": "Gujranwala",
    "gujranwla": "Gujranwala",
    "grw": "Gujranwala",

    # Sialkot
    "skt": "Sialkot",
    "sialkot city": "Sialkot",
    "sialkote": "Sialkot",

    # Gujrat
    "gujrat city": "Gujrat",
    "gujraat": "Gujrat",

    # Sargodha
    "sargodha city": "Sargodha",
    "sargoda": "Sargodha",

    # Peshawar
    "psh": "Peshawar",
    "peshawar city": "Peshawar",
    "peshawer": "Peshawar",

    # Quetta
    "quetta city": "Quetta",
    "kwetta": "Quetta",

    # Hyderabad
    "hyderabad city": "Hyderabad",
    "hyd": "Hyderabad",
    "hyderbad": "Hyderabad",

    # Sukkur
    "sukkur city": "Sukkur",
    "sukkur": "Sukkur",

    # Dera Ghazi Khan
    "dgk": "Dera Ghazi Khan",
    "dg khan": "Dera Ghazi Khan",
    "dera ghazi khan": "Dera Ghazi Khan",
    "dera ghazi": "Dera Ghazi Khan",

    # Dera Ismail Khan
    "dik": "Dera Ismail Khan",
    "di khan": "Dera Ismail Khan",
    "d i khan": "Dera Ismail Khan",
    "dera ismail khan": "Dera Ismail Khan",

    # Wah
    "wah": "Wah Cantt",
    "wah cant": "Wah Cantt",
    "wah cantonment": "Wah Cantt",
    "wah cantt": "Wah Cantt",

    # Murree
    "muree": "Murree",
    "muri": "Murree",
    "murree city": "Murree",

    # Gujranwala region
    "kamoke city": "Kamoke",
    "wazirabad city": "Wazirabad",

    # Sialkot region
    "daska city": "Daska",
    "sambrial city": "Sambrial",

    # Rawalpindi region
    "gujar khan": "Gujar Khan",
    "gujarkhan": "Gujar Khan",
    "taxila city": "Taxila",

    # Swat
    "swat": "Mingora",
    "mingora city": "Mingora",
    "mingora": "Mingora",

    # Hunza
    "hunza valley": "Hunza",
    "hunza": "Hunza",
    "karimabad hunza": "Karimabad",

    # AJK
    "ajk": "Muzaffarabad",
    "muzzaffarabad": "Muzaffarabad",
    "muzaffar abad": "Muzaffarabad",
    "mirpur ajk": "Mirpur",
    "rawalakot city": "Rawalakot",

    # General common spellings
    "bahawalpur city": "Bahawalpur",
    "sahiwal city": "Sahiwal",
    "okara city": "Okara",
    "jhelum city": "Jhelum",
    "chakwal city": "Chakwal",
    "attock city": "Attock",
    "mardan city": "Mardan",
    "swabi city": "Swabi",
    "mansehra city": "Mansehra",
    "abbottabad city": "Abbottabad",
    "bannu city": "Bannu",
    "kohat city": "Kohat",
    "nowshera city": "Nowshera",
    "gwadar city": "Gwadar",
    "turbat city": "Turbat",
    "khuzdar city": "Khuzdar",
    "chaman city": "Chaman",
    "zhob city": "Zhob",
    "gilgit city": "Gilgit",
    "skardu city": "Skardu",
    "astore city": "Astore",
}


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_location(location: str) -> str:
    """
    Normalize a user-provided location.

    Examples:

        pindi       -> Rawalpindi
        isb         -> Islamabad
        lhr         -> Lahore
        khi         -> Karachi
        dgk         -> Dera Ghazi Khan
        dik         -> Dera Ismail Khan
        wah         -> Wah Cantt
        muree       -> Murree
    """

    if not location:
        return location

    location = " ".join(location.strip().split())
    lowered = location.casefold()

    # Alias lookup
    if lowered in LOCATION_ALIASES:
        return LOCATION_ALIASES[lowered]

    # Canonical locations
    for name in PAKISTAN_LOCATIONS:
        if lowered == name.casefold():
            return name

    # Tehsils
    for name in PAKISTAN_TEHSILS:
        if lowered == name.casefold():
            return name

    # Societies / areas
    for name in PAKISTAN_SOCIETIES:
        if lowered == name.casefold():
            return name

    return location


# ============================================================
# LOCATION LOOKUP
# ============================================================

def get_location(location: str):
    """
    Search all Pakistan location registries.

    Returns:
        dict | None
    """

    canonical = normalize_location(location)

    if canonical in PAKISTAN_LOCATIONS:
        return PAKISTAN_LOCATIONS[canonical]

    if canonical in PAKISTAN_TEHSILS:
        return PAKISTAN_TEHSILS[canonical]

    if canonical in PAKISTAN_SOCIETIES:
        return PAKISTAN_SOCIETIES[canonical]

    return None


# ============================================================
# SEARCH LOCATIONS
# ============================================================

def search_locations(query: str) -> list[dict]:
    """
    Search locations by partial name.

    Example:

        search_locations("lah")
        search_locations("pindi")
        search_locations("gulberg")
    """

    if not query:
        return []

    query = query.strip().casefold()

    results = []

    for name, data in PAKISTAN_LOCATIONS.items():
        if query in name.casefold():
            results.append({
                "name": name,
                **data,
            })

    for name, data in PAKISTAN_TEHSILS.items():
        if query in name.casefold():
            results.append({
                "name": name,
                **data,
            })

    for name, data in PAKISTAN_SOCIETIES.items():
        if query in name.casefold():
            results.append({
                "name": name,
                **data,
            })

    return results


# ============================================================
# GET ALL LOCATIONS
# ============================================================

def get_all_locations() -> list[str]:
    """
    Return every registered location name.
    """

    names = set()

    names.update(PAKISTAN_LOCATIONS.keys())
    names.update(PAKISTAN_TEHSILS.keys())
    names.update(PAKISTAN_SOCIETIES.keys())

    return sorted(names)


# ============================================================
# GET LOCATIONS BY PROVINCE
# ============================================================

def get_locations_by_province(province: str) -> list[dict]:
    """
    Return registered cities/towns for a province.
    """

    province = province.strip().casefold()

    results = []

    for name, data in PAKISTAN_LOCATIONS.items():

        if data.get("province", "").casefold() == province:

            results.append({
                "name": name,
                **data,
            })

    return results


# ============================================================
# VALIDATION
# ============================================================

def is_pakistan_location(location: str) -> bool:
    """
    Check whether a location exists in the registry.
    """

    return get_location(location) is not None


# ============================================================
# DEBUG / TEST
# ============================================================

if __name__ == "__main__":

    print("=" * 60)
    print("PAKISTAN LOCATION REGISTRY")
    print("=" * 60)

    print(
        "Cities/Towns:",
        len(PAKISTAN_LOCATIONS)
    )

    print(
        "Tehsils:",
        len(PAKISTAN_TEHSILS)
    )

    print(
        "Societies/Areas:",
        len(PAKISTAN_SOCIETIES)
    )

    print(
        "Aliases:",
        len(LOCATION_ALIASES)
    )

    print("\nTESTS")
    print("-" * 60)

    tests = [
        "pindi",
        "isb",
        "lhr",
        "khi",
        "fsd",
        "mtn",
        "dgk",
        "dik",
        "wah",
        "muree",
        "swat",
        "hunza",
        "ajk",
        "daska",
        "gulshan-e-iqbal",
        "DHA Lahore",
    ]

    for test in tests:

        result = get_location(test)

        print(f"{test:25} -> {result}")

    print("\nSTATUS")
    print("-" * 60)
    print("Pakistan location registry loaded successfully.")