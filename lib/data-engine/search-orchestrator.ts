import { SearchPlan, PlaceRecord, SearchStatistics } from "./types";
import { parseQueryWithGemini } from "./ai/query-understanding";
import { resolveLocation } from "./location-resolver";
import { buildSearchQueries } from "./query-expander";
import { expandCategoryWithAI } from "./category-expander";
import { generateGeographicGrid, buildGridQueries, needsGeographicGrid } from "./geographic-grid";
import { textSearch } from "./google-places";
import { deduplicate } from "./deduplicator";
import { filterAndRank, calculateQualityScore } from "./ranking";
import { classifyCompleteness } from "./normalizer";
import { updateSearchJob, saveBusinesses } from "../db";

// ─────────────────────────────────────────────────────────────────
// Geographic zone databases (sub-areas for major Pakistani cities)
// Each zone produces multiple query variants, giving 60+ hits/zone
// ─────────────────────────────────────────────────────────────────
const CITY_ZONES: Record<string, string[]> = {
  lahore: [
    "Gulberg", "Gulberg II", "Gulberg III",
    "DHA Lahore", "DHA Phase 1 Lahore", "DHA Phase 2 Lahore",
    "DHA Phase 3 Lahore", "DHA Phase 4 Lahore", "DHA Phase 5 Lahore",
    "DHA Phase 6 Lahore", "DHA Phase 7 Lahore", "DHA Phase 8 Lahore",
    "DHA Raya Lahore",
    "Johar Town", "Johar Town Phase 1", "Johar Town Phase 2",
    "Model Town", "Model Town Extension", "Garden Town",
    "Faisal Town", "Township Lahore", "Wapda Town Lahore",
    "Bahria Town Lahore", "Bahria Orchard Lahore",
    "Lahore Cantt", "Askari 1 Lahore", "Askari 2 Lahore",
    "Askari 9 Lahore", "Askari 10 Lahore", "Askari 11 Lahore",
    "Iqbal Town", "Allama Iqbal Town", "Samanabad",
    "Shadman", "Muslim Town", "Sabzazar", "Green Town",
    "Valencia Town", "Lake City Lahore", "Paragon City Lahore",
    "Eden City Lahore", "Park View City Lahore",
    "LDA Avenue Lahore", "Pine Avenue Lahore",
    "Harbanspura", "Ichhra", "Mozang", "Anarkali",
    "Shalimar Town", "Baghbanpura", "Misri Shah",
    "Kot Lakhpat", "Kahna", "Youhanabad",
    "Bhatta Chowk", "Cavalry Ground", "DHA Raya",
    "MM Alam Road", "Liberty Market", "Main Boulevard Gulberg",
    "Ferozepur Road", "Raiwind Road", "Canal Road Lahore",
    "Jail Road Lahore", "Mall Road Lahore", "Bedian Road",
    "Ring Road Lahore", "GT Road Lahore", "Multan Road Lahore",
    "Thokar Niaz Baig", "Barkat Market",
  ],

  karachi: [
    "Clifton", "Clifton Block 1", "Clifton Block 2", "Clifton Block 4",
    "Clifton Block 5", "Clifton Block 8", "Clifton Block 9",
    "DHA Karachi", "DHA Phase 1 Karachi", "DHA Phase 2 Karachi",
    "DHA Phase 4 Karachi", "DHA Phase 5 Karachi", "DHA Phase 6 Karachi",
    "DHA Phase 7 Karachi", "DHA Phase 8 Karachi",
    "Gulshan-e-Iqbal", "Gulshan Block 1", "Gulshan Block 2",
    "Gulshan Block 4", "Gulshan Block 7", "Gulshan Block 10",
    "Gulistan-e-Johar", "Johar Block 1", "Johar Block 5",
    "Johar Block 13", "Johar Block 14",
    "North Nazimabad", "Nazimabad", "Nazimabad Block 1",
    "Nazimabad Block 2", "Nazimabad Block 4", "Nazimabad Block 5",
    "PECHS", "PECHS Block 1", "PECHS Block 2", "PECHS Block 6",
    "Saddar Karachi", "Scheme 33", "Malir", "Malir Cantt",
    "Korangi", "Korangi Industrial Area", "Surjani Town",
    "Orangi Town", "Bahria Town Karachi", "Bahria Town Precinct 1",
    "Bahria Town Precinct 10", "Bahadurabad", "Tariq Road",
    "Shahrah-e-Faisal", "Landhi", "Landhi Industrial Area",
    "Defence View Society", "Keamari", "Lyari", "Baldia Town",
    "Federal B Area", "Liaquatabad", "Gulberg Karachi",
    "New Karachi", "Buffer Zone Karachi", "North Karachi",
    "Safoora Goth", "Model Colony Karachi", "Shah Faisal Colony",
    "Gulshan-e-Maymar", "Surjani Town", "Manghopir",
    "Bin Qasim", "Port Qasim", "Karachi Cantt",
    "Bahadurabad", "PECHS", "Manzoor Colony",
    "University Road Karachi", "University Road Gulshan",
    "MA Jinnah Road", "I.I. Chundrigar Road",
    "Burns Road", "Tariq Road", "Boat Basin",
    "Sea View Karachi", "Khayaban-e-Shahbaz",
    "Khayaban-e-Ittehad", "Khayaban-e-Bukhari",
  ],

  rawalpindi: [
    "Saddar Rawalpindi", "Satellite Town Rawalpindi",
    "Bahria Town Rawalpindi", "Bahria Town Phase 1",
    "Bahria Town Phase 2", "Bahria Town Phase 4",
    "Bahria Town Phase 7", "Bahria Town Phase 8",
    "DHA Rawalpindi", "DHA Phase 1 Rawalpindi",
    "DHA Phase 2 Rawalpindi", "DHA Phase 3 Rawalpindi",
    "Peshawar Road Rawalpindi", "Murree Road Rawalpindi",
    "Adiala Road Rawalpindi", "Westridge", "Westridge 1",
    "Westridge 2", "Westridge 3",
    "Lalazar Rawalpindi", "Committee Chowk",
    "Chaklala Scheme 1", "Chaklala Scheme 2", "Chaklala Scheme 3",
    "Airport Housing Society", "Askari 14 Rawalpindi",
    "6th Road Rawalpindi", "Raja Bazaar", "Trunk Bazaar",
    "Banni Chowk", "Liaquat Bagh", "Sadiqabad Rawalpindi",
    "Commercial Market Rawalpindi", "Tench Bhata",
    "Dhamial Road", "Koral Chowk", "Gulrez Housing Scheme",
    "Media Town Rawalpindi", "PWD Rawalpindi",
    "Soan Garden Rawalpindi", "Islamabad Highway Rawalpindi",
    "GT Road Rawalpindi", "Lehtrar Road", "Kahuta Road",
    "Chakri Road", "Swan Camp", "Morgah",
  ],

  islamabad: [
    "Blue Area Islamabad",
    "F-5 Islamabad", "F-6 Islamabad", "F-6/1 Islamabad",
    "F-6/2 Islamabad", "F-6/3 Islamabad", "F-6/4 Islamabad",
    "F-7 Islamabad", "F-7/1 Islamabad", "F-7/2 Islamabad",
    "F-7/3 Islamabad", "F-7/4 Islamabad",
    "F-8 Islamabad", "F-8/1 Islamabad", "F-8/2 Islamabad",
    "F-8/3 Islamabad", "F-8/4 Islamabad",
    "F-10 Islamabad", "F-10/1 Islamabad", "F-10/2 Islamabad",
    "F-10/3 Islamabad", "F-10/4 Islamabad",
    "F-11 Islamabad", "F-11/1 Islamabad", "F-11/2 Islamabad",
    "F-11/3 Islamabad", "F-11/4 Islamabad",
    "G-5 Islamabad", "G-6 Islamabad", "G-7 Islamabad",
    "G-8 Islamabad", "G-9 Islamabad", "G-10 Islamabad",
    "G-11 Islamabad", "G-12 Islamabad",
    "I-8 Islamabad", "I-9 Islamabad", "I-10 Islamabad",
    "I-11 Islamabad", "I-12 Islamabad",
    "E-7 Islamabad", "E-8 Islamabad", "E-9 Islamabad",
    "E-11 Islamabad",
    "D-12 Islamabad", "DHA Islamabad",
    "Gulberg Greens Islamabad", "Gulberg Residencia Islamabad",
    "Bahria Town Islamabad", "B-17 Islamabad",
    "Park View City Islamabad", "Top City Islamabad",
    "Mumtaz City Islamabad", "E-16 Islamabad",
    "Diplomatic Enclave Islamabad", "CDA Sectors Islamabad",
    "PWD Islamabad", "PWD Colony Islamabad",
    "Srinagar Highway Islamabad", "Islamabad Expressway",
    "Kashmir Highway Islamabad", "Margalla Road",
    "Zero Point Islamabad", "Faizabad Islamabad",
    "Blue Area", "Jinnah Avenue", "Constitution Avenue",
    "I-14 Islamabad", "I-15 Islamabad", "I-16 Islamabad",
  ],

  faisalabad: [
    "Samanabad Faisalabad", "Peoples Colony Faisalabad",
    "Peoples Colony No 1", "Peoples Colony No 2",
    "Kohinoor City Faisalabad", "Dijkot Road Faisalabad",
    "Jaranwala Road Faisalabad", "Sargodha Road Faisalabad",
    "Satiana Road Faisalabad", "D Ground Faisalabad",
    "Ghulam Muhammad Abad", "Gulberg Faisalabad",
    "Canal Road Faisalabad", "Millat Road Faisalabad",
    "Susan Road Faisalabad", "Batala Colony Faisalabad",
    "Madina Town Faisalabad", "Civil Lines Faisalabad",
    "Jinnah Colony Faisalabad", "Raza Abad Faisalabad",
    "Khurrianwala", "Samundri Road Faisalabad",
    "Sheikhupura Road Faisalabad", "Narwala Road Faisalabad",
    "Amin Town Faisalabad", "Wapda City Faisalabad",
    "Canal Gardens Faisalabad", "FDA City Faisalabad",
  ],

  peshawar: [
    "Hayatabad Peshawar", "Hayatabad Phase 1", "Hayatabad Phase 2",
    "Hayatabad Phase 3", "Hayatabad Phase 4", "Hayatabad Phase 5",
    "Hayatabad Phase 6", "Hayatabad Phase 7",
    "University Road Peshawar", "Saddar Peshawar",
    "Peshawar Cantt", "Khyber Bazaar Peshawar",
    "Shami Road Peshawar", "Ring Road Peshawar",
    "Gulbahar Peshawar", "Dalazak Road Peshawar",
    "GT Road Peshawar", "Warsak Road Peshawar",
    "Board Bazaar Peshawar", "Hashtnagri",
    "Firdous Peshawar", "Tehkal Peshawar",
    "Regi Model Town", "Regi Lalma",
    "Jamrud Road Peshawar", "Kohat Road Peshawar",
    "Charsadda Road Peshawar", "Northern Bypass Peshawar",
    "Faqirabad Peshawar", "Nauthia",
  ],

  multan: [
    "Cantonment Multan", "Gulgasht Colony Multan",
    "Bosan Road Multan", "Shah Rukn-e-Alam",
    "Mumtazabad Multan", "Wapda Town Multan",
    "Hussain Agahi Multan", "Vehari Road Multan",
    "Chungi No 6 Multan", "Chungi No 9 Multan",
    "New Multan", "Model Town Multan",
    "Khanewal Road Multan", "MDA Chowk Multan",
    "Nishtar Road Multan", "Mumtazabad Colony",
    "Shah Jamal Multan", "Suraj Miani Multan",
    "Cantt Bazaar Multan", "Bosan Town",
    "Askari Multan", "Northern Bypass Multan",
    "Industrial Estate Multan", "Makhdoom Rashid",
  ],

  gujranwala: [
    "Model Town Gujranwala", "Satellite Town Gujranwala",
    "DC Road Gujranwala", "Peoples Colony Gujranwala",
    "Wapda Town Gujranwala", "Cantt Gujranwala",
    "GT Road Gujranwala", "Gulshan Colony Gujranwala",
    "Rehman Pura Gujranwala", "Sialkot Road Gujranwala",
    "Civil Lines Gujranwala", "Garden Town Gujranwala",
    "Master City Gujranwala", "Citi Housing Gujranwala",
    "Model Town Extension", "Nowshera Road Gujranwala",
    "Pasrur Road Gujranwala", "Sheikhupura Road Gujranwala",
    "Wazirabad Road Gujranwala", "Gondlanwala Road",
    "Eminabad", "Kamoke", "Nowshera Virkan",
  ],

  sialkot: [
    "Cantt Sialkot", "Saddar Sialkot", "Model Town Sialkot",
    "Paris Road Sialkot", "Shahabpura Sialkot",
    "Gulshan Colony Sialkot", "Kutchery Road Sialkot",
    "Iqbal Road Sialkot", "Cantonment Sialkot",
    "Ugoki Road Sialkot", "Daska Road Sialkot",
    "Wazirabad Road Sialkot", "Pasrur Road Sialkot",
    "Defence Road Sialkot", "Airport Road Sialkot",
    "Small Industrial Estate Sialkot", "Sambrial",
    "Daska", "Pasrur",
  ],

  quetta: [
    "Cantonment Quetta", "Sariab Road Quetta",
    "Jinnah Road Quetta", "Double Road Quetta",
    "Samungli Road Quetta", "Quarry Road Quetta",
    "Satellite Town Quetta", "Airport Road Quetta",
    "Brewery Road Quetta", "Prince Road Quetta",
    "Mecleod Road Quetta", "Chaman Housing Scheme",
    "Spinney Road Quetta", "Zarghoon Road Quetta",
    "Arbab Karam Khan Road", "Kasi Road Quetta",
    "Kuchlak", "Hazara Town Quetta",
  ],

  hyderabad: [
    "Latifabad Hyderabad", "Latifabad Unit 1", "Latifabad Unit 2",
    "Latifabad Unit 3", "Latifabad Unit 4", "Latifabad Unit 5",
    "Latifabad Unit 6", "Latifabad Unit 7", "Latifabad Unit 8",
    "Latifabad Unit 9", "Latifabad Unit 10", "Latifabad Unit 11",
    "Qasimabad Hyderabad", "Saddar Hyderabad",
    "Autobahn Road Hyderabad", "Hirabad Hyderabad",
    "Phuleli Canal Hyderabad", "Market Tower Hyderabad",
    "Station Road Hyderabad", "Citizen Colony Hyderabad",
    "Wadhu Wah Road Hyderabad", "Hali Road Hyderabad",
    "Paretabad Hyderabad", "Gulistan-e-Sajjad Hyderabad",
    "Nasim Nagar Hyderabad", "Kohsar Hyderabad",
    "Tando Jam", "Kotri",
  ],

  abbottabad: [
    "Abbottabad City", "Jinnahabad Abbottabad",
    "Kaghan Road Abbottabad", "Mandian Abbottabad",
    "Mirpur Road Abbottabad", "Supply Abbottabad",
    "Nawanshehr Abbottabad", "Salhad Abbottabad",
    "PMA Kakul", "Kakul Road Abbottabad",
    "Jhangi Abbottabad", "Thandiani Road Abbottabad",
    "Shimla Hill Abbottabad", "Mansehra Road Abbottabad",
  ],

  bahawalpur: [
    "Bahawalpur City", "Model Town Bahawalpur",
    "Model Town A Bahawalpur", "Model Town B Bahawalpur",
    "Satellite Town Bahawalpur", "Fareed Gate Bahawalpur",
    "Airport Road Bahawalpur", "Circular Road Bahawalpur",
    "Cantt Bahawalpur", "DHA Bahawalpur",
    "Baghdad-ul-Jadeed Bahawalpur", "Dubai Chowk Bahawalpur",
    "Yazman Road Bahawalpur", "Hasilpur Road Bahawalpur",
    "Lodhran Road Bahawalpur",
  ],

  sargodha: [
    "Sargodha City", "University Road Sargodha",
    "Satellite Town Sargodha", "Chak No 1 Sargodha",
    "Military Road Sargodha", "Cantt Sargodha",
    "Model Town Sargodha", "Faisalabad Road Sargodha",
    "Lahore Road Sargodha", "Bhalwal Road Sargodha",
    "Club Road Sargodha", "Fatima Jinnah Road Sargodha",
    "Khushab Road Sargodha", "Khayam Chowk Sargodha",
    "Civil Lines Sargodha", "New Satellite Town Sargodha",
  ],

  // ─────────────────────────────────────────────
  // ADDITIONAL MAJOR CITIES
  // ─────────────────────────────────────────────

  islamabad_adjacent: [
    "Taxila", "Wah Cantt", "Khanpur", "Kahuta",
    "Murree", "Kallar Syedan", "Gujar Khan",
  ],

  sheikhupura: [
    "Sheikhupura City", "Civil Lines Sheikhupura",
    "Jinnah Park Sheikhupura", "Lahore Road Sheikhupura",
    "Gujranwala Road Sheikhupura", "Sargodha Road Sheikhupura",
    "Ferozewala", "Muridke", "Sharaqpur", "Safdarabad",
  ],

  kasur: [
    "Kasur City", "Kot Radha Kishan", "Pattoki",
    "Chunian", "Raiwind Road Kasur", "Ferozepur Road Kasur",
    "Kot Radha Kishan Road", "Kasur Cantt",
  ],

  gujrat: [
    "Gujrat City", "Model Town Gujrat", "Satellite Town Gujrat",
    "GT Road Gujrat", "Jalalpur Jattan", "Kharian",
    "Sarai Alamgir", "Lalamusa", "Dinga",
    "Gujrat Cantt", "Bhimbher Road Gujrat",
  ],

  jhelum: [
    "Jhelum City", "Cantt Jhelum", "Model Town Jhelum",
    "Kala Gujran", "Civil Lines Jhelum", "GT Road Jhelum",
    "Dina", "Sohawa", "Pind Dadan Khan",
  ],

  chakwal: [
    "Chakwal City", "Talagang", "Kallar Kahar",
    "Choa Saidan Shah", "Balkassar", "Bhoun",
    "Dhudial", "Miani", "Mulhal Mughlan",
  ],

  mianwali: [
    "Mianwali City", "Isa Khel", "Piplan",
    "Kalabagh", "Daud Khel", "Kamar Mushani",
    "Mianwali Cantt", "Bannu Road Mianwali",
  ],

  khushab: [
    "Khushab City", "Jauharabad", "Naushera",
    "Quaidabad", "Hadali", "Adhi Kot",
    "Mitha Tiwana", "Khushab Cantt",
  ],

  attock: [
    "Attock City", "Attock Cantt", "Hassan Abdal",
    "Hazro", "Fateh Jang", "Jand", "Pindi Gheb",
    "Kamra", "Kamra Cantt", "Lawrencepur",
  ],

  dera_ghazi_khan: [
    "Dera Ghazi Khan City", "Model Town DG Khan",
    "Dera Ghazi Khan Cantt", "College Road DG Khan",
    "Jampur", "Taunsa Sharif", "Kot Chutta",
    "Sakhi Sarwar", "Multan Road DG Khan",
  ],

  muzaffargarh: [
    "Muzaffargarh City", "Alipur", "Jatoi",
    "Kot Addu", "Chowk Sarwar Shaheed",
    "Khan Garh", "Rangpur", "Muzaffargarh Cantt",
  ],

  vehari: [
    "Vehari City", "Burewala", "Mailsi",
    "Vehari Cantt", "College Road Vehari",
    "Multan Road Vehari", "Luddan",
  ],

  lodhran: [
    "Lodhran City", "Dunyapur", "Kahror Pacca",
    "Lodhran Cantt", "Multan Road Lodhran",
    "Bahawalpur Road Lodhran",
  ],

  pakpattan: [
    "Pakpattan City", "Arifwala", "Haveli Lakha",
    "Malka Hans", "Pakpattan Bypass", "Sahiwal Road Pakpattan",
  ],

  okara: [
    "Okara City", "Okara Cantt", "Depalpur",
    "Renala Khurd", "Hujra Shah Muqeem",
    "Basirpur", "Haveli Lakha", "Okara Bypass",
    "GT Road Okara", "Lahore Road Okara",
    "Faisalabad Road Okara", "Depalpur Road Okara",
  ],

  sahiwal: [
    "Sahiwal City", "Sahiwal Cantt", "Sahiwal Bypass",
    "Faridia Park Sahiwal", "Jinnah Road Sahiwal",
    "GT Road Sahiwal", "Lahore Road Sahiwal",
    "Faisalabad Road Sahiwal", "Pakpattan Road Sahiwal",
    "Chichawatni", "Harappa", "Noor Shah",
  ],

  jhang: [
    "Jhang City", "Jhang Sadar", "Chiniot Road Jhang",
    "Canal Road Jhang", "Satellite Town Jhang",
    "Shorkot", "Ahmedpur Sial", "18-Hazari",
    "Shorkot Cantt", "Raza Town Jhang",
  ],

  toba_tek_singh: [
    "Toba Tek Singh City", "Gojra", "Kamalia",
    "Pir Mahal", "Rajana", "Chichawatni Road Toba",
    "Faisalabad Road Toba", "Jhang Road Toba",
  ],

  chiniot: [
    "Chiniot City", "Chenab Nagar", "Lalian",
    "Bhawana", "Chiniot Bypass", "Jhang Road Chiniot",
    "Faisalabad Road Chiniot", "Sargodha Road Chiniot",
  ],

  // ─────────────────────────────────────────────
  // SINDH
  // ─────────────────────────────────────────────

  sukkur: [
    "Sukkur City", "Rohri", "New Sukkur",
    "Airport Road Sukkur", "Military Road Sukkur",
    "Minara Road Sukkur", "Barrages Road Sukkur",
    "Shahi Bazaar Sukkur", "Lab-e-Mehran",
    "Pano Aqil", "Saleh Pat", "Sukkur Bypass",
  ],

  larkana: [
    "Larkana City", "Garhi Khuda Bakhsh",
    "Garhi Yasin", "Ratodero", "Dokri",
    "Naudero", "Bakrani", "Larkana Bypass",
    "Station Road Larkana", "VIP Road Larkana",
  ],

  nawabshah: [
    "Nawabshah City", "Shaheed Benazirabad",
    "Sakrand", "Daur", "Qazi Ahmed",
    "Nawabshah Bypass", "Airport Road Nawabshah",
    "Civil Lines Nawabshah",
  ],

  mirpurkhas: [
    "Mirpur Khas City", "Digri", "Kot Ghulam Muhammad",
    "Jhudo", "Tando Jan Muhammad", "Mirpur Khas Bypass",
    "Station Road Mirpur Khas", "Umerkot Road",
  ],

  jacobabad: [
    "Jacobabad City", "Thul", "Garhi Hassan",
    "Jacobabad Bypass", "Station Road Jacobabad",
    "Kandhkot Road Jacobabad",
  ],

  khairpur: [
    "Khairpur City", "Kot Diji", "Gambat",
    "Kingri", "Sobho Dero", "Pir Jo Goth",
    "Ranipur", "Khairpur Bypass",
  ],

  badin: [
    "Badin City", "Tando Bago", "Matli",
    "Talhar", "Golarchi", "Badin Bypass",
    "Station Road Badin",
  ],

  thatta: [
    "Thatta City", "Makli", "Mirpur Sakro",
    "Jati", "Sujawal", "Gharo",
    "Thatta Bypass", "National Highway Thatta",
  ],

  // ─────────────────────────────────────────────
  // KHYBER PAKHTUNKHWA
  // ─────────────────────────────────────────────

  mardan: [
    "Mardan City", "Cantt Mardan", "GT Road Mardan",
    "Sheikh Maltoon Town", "Hot i Mardan",
    "Takht-i-Bahi", "Katlang", "Rustam",
    "Par Hoti", "Nowshera Road Mardan",
    "Charsadda Road Mardan", "Ring Road Mardan",
  ],

  mingora: [
    "Mingora City", "Saidu Sharif", "Fizagat",
    "GT Road Mingora", "Green Chowk Mingora",
    "Nishat Chowk Mingora", "Mingora Bypass",
    "Malam Jabba Road", "Kanju", "Kabal",
    "Matta", "Barikot",
  ],

  nowshera: [
    "Nowshera City", "Nowshera Cantt", "Pabbi",
    "Risalpur", "Jehangira", "Akora Khattak",
    "Amangarh", "GT Road Nowshera", "Nowshera Bypass",
  ],

  kohat: [
    "Kohat City", "Kohat Cantt", "KDA Kohat",
    "Jangalkhel", "Ustarzai", "Lachi",
    "Hangu Road Kohat", "Rawalpindi Road Kohat",
    "Bannu Road Kohat",
  ],

  mansehra: [
    "Mansehra City", "Mansehra Cantt", "Baffa",
    "Balakot", "Oghi", "Shinkiari",
    "Karakoram Highway Mansehra", "Abbottabad Road Mansehra",
    "Kaghan Road Mansehra",
  ],

  swabi: [
    "Swabi City", "Topi", "Zaida",
    "Ghulam Ishaq Khan Institute", "Kalu Khan",
    "Lahor", "Tordher", "Swabi Bypass",
  ],

  // ─────────────────────────────────────────────
  // BALOCHISTAN
  // ─────────────────────────────────────────────

  gwadar: [
    "Gwadar City", "New Gwadar", "Gwadar Port",
    "Marine Drive Gwadar", "Jiwani", "Pasni",
    "Ormara", "Surbandar", "Koh-e-Batil",
    "West Bay Gwadar", "East Bay Gwadar",
  ],

  hub: [
    "Hub City", "Hub Industrial Estate",
    "Sakran", "Dureji", "Winder",
    "Lasbela", "Hub Bypass", "Karachi-Hub Road",
  ],

  // ─────────────────────────────────────────────
  // AJK / GILGIT-BALTISTAN
  // ─────────────────────────────────────────────

  mirpur: [
    "Mirpur AJK City", "Allama Iqbal Road Mirpur",
    "New Mirpur City", "Sector F Mirpur",
    "Sector D Mirpur", "Islamgarh", "Dadyal",
    "Chakswari", "Jatlan", "Mirpur Bypass",
    "Mangla", "Mangla Cantt",
  ],

  muzaffarabad: [
    "Muzaffarabad City", "Chattar Muzaffarabad",
    "Domel", "Upper Chattar", "Lower Chattar",
    "Ambore", "Chehla", "Patika",
    "Garhi Dupatta", "Muzaffarabad Bypass",
  ],

  gilgit: [
    "Gilgit City", "Jutial Gilgit", "Danyore",
    "Nomal", "Konodas", "Sher Qila",
    "Gilgit Airport Road", "River View Road Gilgit",
    "Karakoram Highway Gilgit",
  ],

  skardu: [
    "Skardu City", "New Bazaar Skardu",
    "Sadpara Road Skardu", "Hussainabad",
    "Kachura", "Shigar", "Khaplu",
    "Skardu Airport Road", "Deosai Road",
  ],
};


// Medium cities — expanded coverage
const MEDIUM_CITY_ZONES: Record<string, string[]> = {
  rahim_yar_khan: [
    "Rahim Yar Khan City",
    "Sadiqabad",
    "Khanpur",
    "Liaquatpur",
    "Zahir Pir",
    "Rahim Yar Khan Cantt",
    "Airport Road Rahim Yar Khan",
    "Shahi Road Rahim Yar Khan",
    "Abu Dhabi Road RYK",
    "National Highway RYK",
  ],

  jhelum: [
    "Jhelum City",
    "Dina",
    "Sohawa",
    "Pind Dadan Khan",
    "Khewra",
    "Jhelum Cantt",
  ],

  sukkur: [
    "Sukkur City",
    "Rohri",
    "Pano Aqil",
    "Saleh Pat",
    "New Sukkur",
    "Sukkur Cantt",
    "Airport Road Sukkur",
  ],

  larkana: [
    "Larkana City",
    "Ratodero",
    "Naudero",
    "Dokri",
    "Bakrani",
    "Garhi Yasin",
  ],

  mingora: [
    "Mingora City",
    "Saidu Sharif",
    "Kanju",
    "Kabal",
    "Matta",
    "Barikot",
    "Malam Jabba",
  ],

  mardan: [
    "Mardan City",
    "Mardan Cantt",
    "Sheikh Maltoon Town",
    "Takht-i-Bahi",
    "Katlang",
    "Rustam",
    "Par Hoti",
  ],

  mirpur: [
    "Mirpur AJK City",
    "New Mirpur",
    "Dadyal",
    "Chakswari",
    "Islamgarh",
    "Jatlan",
    "Mangla",
  ],

  muzaffarabad: [
    "Muzaffarabad City",
    "Chattar",
    "Domel",
    "Garhi Dupatta",
    "Patika",
    "Chehla",
  ],

  dera_ghazi_khan: [
    "Dera Ghazi Khan City",
    "Jampur",
    "Taunsa Sharif",
    "Kot Chutta",
    "Sakhi Sarwar",
  ],

  vehari: [
    "Vehari City",
    "Burewala",
    "Mailsi",
    "Luddan",
    "Vehari Cantt",
  ],

  pakpattan: [
    "Pakpattan City",
    "Arifwala",
    "Haveli Lakha",
    "Malka Hans",
  ],

  chiniot: [
    "Chiniot City",
    "Chenab Nagar",
    "Lalian",
    "Bhawana",
  ],

  toba_tek_singh: [
    "Toba Tek Singh City",
    "Gojra",
    "Kamalia",
    "Pir Mahal",
    "Rajana",
  ],

  sheikhupura: [
    "Sheikhupura City",
    "Muridke",
    "Ferozewala",
    "Sharaqpur",
    "Safdarabad",
  ],

  kasur: [
    "Kasur City",
    "Pattoki",
    "Chunian",
    "Kot Radha Kishan",
    "Hujra Shah Muqeem",
  ],

  gujrat: [
    "Gujrat City",
    "Kharian",
    "Lalamusa",
    "Jalalpur Jattan",
    "Sarai Alamgir",
    "Dinga",
  ],

  attock: [
    "Attock City",
    "Hassan Abdal",
    "Kamra",
    "Fateh Jang",
    "Hazro",
    "Jand",
    "Pindi Gheb",
  ],

  chakwal: [
    "Chakwal City",
    "Talagang",
    "Kallar Kahar",
    "Choa Saidan Shah",
    "Dhudial",
  ],

  khushab: [
    "Khushab City",
    "Jauharabad",
    "Quaidabad",
    "Naushera",
    "Hadali",
  ],

  mianwali: [
    "Mianwali City",
    "Isa Khel",
    "Piplan",
    "Kalabagh",
    "Daud Khel",
  ],

  muzaffargarh: [
    "Muzaffargarh City",
    "Kot Addu",
    "Alipur",
    "Jatoi",
    "Chowk Sarwar Shaheed",
  ],

  lodhran: [
    "Lodhran City",
    "Dunyapur",
    "Kahror Pacca",
  ],

  gwadar: [
    "Gwadar City",
    "Jiwani",
    "Pasni",
    "Ormara",
    "Surbandar",
  ],

  hub: [
    "Hub City",
    "Winder",
    "Sakran",
    "Hub Industrial Estate",
  ],

  mansehra: [
    "Mansehra City",
    "Balakot",
    "Baffa",
    "Oghi",
    "Shinkiari",
  ],

  swabi: [
    "Swabi City",
    "Topi",
    "Zaida",
    "Kalu Khan",
    "Lahor",
  ],

  nowshera: [
    "Nowshera City",
    "Nowshera Cantt",
    "Pabbi",
    "Risalpur",
    "Akora Khattak",
    "Jehangira",
  ],

  kohat: [
    "Kohat City",
    "Kohat Cantt",
    "KDA Kohat",
    "Lachi",
    "Hangu",
  ],
};

// ─────────────────────────────────────────────────────────────────
// Concurrency runner
// ─────────────────────────────────────────────────────────────────

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const curIndex = index++;
      results[curIndex] = await fn(items[curIndex]);
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

// ─────────────────────────────────────────────────────────────────
// Generate multi-phrasing query variants for a zone
// Each zone gets several differently-worded queries to maximise
// the number of unique place IDs returned by the API.
// ─────────────────────────────────────────────────────────────────

function buildZoneQueryVariants(category: string, zone: string, parentCity: string): string[] {
  const country = "Pakistan";
  const categoryPlural = category.endsWith("s") ? category : `${category}s`;
  const variants = [
    `${category} in ${zone}, ${parentCity}, ${country}`,
    `${categoryPlural} near ${zone} ${parentCity}`,
    `best ${category} ${zone} ${parentCity}`,
    `${category} near ${zone}`,
  ];
  return variants;
}

// ─────────────────────────────────────────────────────────────────
// Progress helper
// ─────────────────────────────────────────────────────────────────

async function updateJobProgress(
  jobId: string,
  plan: SearchPlan,
  status: any,
  progress: number,
  stage: string,
  detail: string,
  recordsFound = 0
) {
  try {
    await updateSearchJob(jobId, {
      status,
      progress,
      currentStage: stage,
      recordsFound,
      parsedQuery: JSON.stringify({ query: plan, progress: { stage, detail } }),
    });
  } catch (err) {
    console.error("Failed to update job progress:", err);
  }
}

// ─────────────────────────────────────────────────────────────────
// Raw-place → lightweight dedup key (used during scraping to avoid
// re-running full dedup on the growing array every iteration)
// ─────────────────────────────────────────────────────────────────

function placeKey(raw: any): string {
  return raw.id || [raw.displayName?.text, raw.formattedAddress].join("|");
}

// ─────────────────────────────────────────────────────────────────
// Main workflow
// ─────────────────────────────────────────────────────────────────

export async function runSearchWorkflow(
  jobId: string,
  command: string,
  limit: number
): Promise<void> {
  const startedAt = new Date();
  let searchPlan: SearchPlan | null = null;

  try {
    // ── 1. PARSING ──────────────────────────────────────────────
    await updateSearchJob(jobId, { status: "PARSING", startedAt });
    console.log(`[Job ${jobId}] Parsing: "${command}"`);

    searchPlan = await parseQueryWithGemini(command);

    // Honour explicit count from query, fall back to caller limit, then default
    if (!searchPlan.requested_result_count) {
      searchPlan.requested_result_count = limit || 250;
    }

    await updateJobProgress(jobId, searchPlan, "PARSING", 15,
      "Understanding request", "Query parameters extracted");

    // ── 2. LOCATION RESOLUTION ───────────────────────────────────
    console.log(`[Job ${jobId}] Resolving location…`);
    await updateJobProgress(jobId, searchPlan, "PARSING", 25,
      "Resolving location", `Target: ${searchPlan.location.city || "Pakistan"}`);

    const resolvedLocation = await resolveLocation(searchPlan.location);
    searchPlan.location = resolvedLocation;

    // ── 3. QUERY PLANNING ────────────────────────────────────────
    const targetResults = searchPlan.requested_result_count || 250;
    const cityKey = (resolvedLocation.city || "").toLowerCase().replace(/\s+/g, "_");
    const cityKeySpace = (resolvedLocation.city || "").toLowerCase();

    // ── 3a. Category expansion (multi-pass search) ────────────────
    await updateJobProgress(jobId, searchPlan, "PARSING", 28,
      "Expanding search categories", `Finding variations of "${searchPlan.category}"`);
    const categoryVariations = await expandCategoryWithAI(searchPlan.category);
    console.log(`[Job ${jobId}] Category expanded to ${categoryVariations.length} variations: ${categoryVariations.join(", ")}`);

    const allQueries: string[] = [];
    let searchZonesCount = 0;

    // Always try zone-partitioned queries first for any known city
    const zones =
      CITY_ZONES[cityKeySpace] ||
      CITY_ZONES[cityKey] ||
      MEDIUM_CITY_ZONES[cityKeySpace] ||
      MEDIUM_CITY_ZONES[cityKey] ||
      [];

    if (zones.length > 0) {
      searchZonesCount = zones.length;
      console.log(`[Job ${jobId}] Zone partitioning: ${zones.length} zones for ${resolvedLocation.city}`);

      // For each zone generate N variants; limit total zones based on target
      const maxZones = targetResults <= 50 ? 6
        : targetResults <= 100 ? 12
          : targetResults <= 200 ? 20
            : zones.length;

      for (const zone of zones.slice(0, maxZones)) {
        const variants = buildZoneQueryVariants(searchPlan.category, zone, resolvedLocation.city || "");
        allQueries.push(...variants);
      }

      // Add category variation queries at city level for broader coverage
      const city = resolvedLocation.city || resolvedLocation.district || "Pakistan";
      for (const catVar of categoryVariations.slice(1, 4)) {
        allQueries.push(`${catVar} in ${city}, Pakistan`);
      }

      // Also add 2-3 broad city-level sweeps as a second pass to catch stragglers
      const cat = searchPlan.category;
      allQueries.push(
        `${cat} in ${city}, Pakistan`,
        `${cat}s near ${city} Pakistan`,
        `best ${cat} ${city}`,
      );

    } else {
      // Unknown city / rural / micro-locality
      console.log(`[Job ${jobId}] No zone map found; using geographic grid + query expander`);

      // Generate geographic grid if we have coordinates
      if (needsGeographicGrid(resolvedLocation, false)) {
        const gridCells = generateGeographicGrid(resolvedLocation, targetResults);
        searchZonesCount = gridCells.length;
        const gridQueries = buildGridQueries(
          searchPlan.category,
          gridCells,
          resolvedLocation.city || resolvedLocation.district || "Pakistan"
        );
        allQueries.push(...gridQueries);
        console.log(`[Job ${jobId}] Geographic grid: ${gridCells.length} cells generated`);
      }

      // Also use expander variants
      const baseQueries = buildSearchQueries(searchPlan, 12);
      allQueries.push(...baseQueries);

      // Add category variation queries
      for (const catVar of categoryVariations.slice(1, 3)) {
        const loc = resolvedLocation.city || resolvedLocation.district || "Pakistan";
        allQueries.push(`${catVar} in ${loc}, Pakistan`);
      }
    }

    // Deduplicate query strings case-insensitively
    const seenQueryStrs = new Set<string>();
    const uniqueQueries: string[] = [];
    for (const q of allQueries) {
      const lq = q.toLowerCase().trim();
      if (!seenQueryStrs.has(lq)) { seenQueryStrs.add(lq); uniqueQueries.push(q); }
    }

    console.log(`[Job ${jobId}] ${uniqueQueries.length} search queries planned`);

    // ── 4. SCRAPING ──────────────────────────────────────────────
    await updateJobProgress(jobId, searchPlan, "SCRAPING", 35,
      "Searching Google Places",
      `${uniqueQueries.length} queries across ${searchZonesCount || 1} area(s)`);

    const rawPlaces: any[] = [];
    // Fast dedup tracker using place IDs during scraping
    const seenPlaceKeys = new Set<string>();

    // Budget: pages needed = target * 5 raw headroom / 20 results per page
    const maxApiPages = Math.min(Math.ceil((targetResults * 5) / 20), 400);
    let apiPagesUsed = 0;
    let queriesRun = 0;

    // Concurrency: 5 parallel queries
    const CONCURRENCY = 5;

    // We split into batches; between batches we check if target is reached
    const batchSize = CONCURRENCY * 4; // 16 queries/batch
    const totalBatches = Math.ceil(uniqueQueries.length / batchSize);

    // Adaptive termination: track new unique places per batch
    let consecutiveLowYieldBatches = 0;
    const LOW_YIELD_THRESHOLD = 0.02; // 2% new results = diminishing returns
    const MAX_LOW_YIELD_BATCHES = 3; // Stop after 3 consecutive low-yield batches

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      // Early exit: target headroom reached
      if (seenPlaceKeys.size >= targetResults * 5) {
        console.log(`[Job ${jobId}] Raw headroom reached (${seenPlaceKeys.size} unique). Stopping.`);
        break;
      }
      // Early exit: API budget exhausted
      if (apiPagesUsed >= maxApiPages) {
        console.log(`[Job ${jobId}] API page budget exhausted (${apiPagesUsed}).`);
        break;
      }
      // Early exit: diminishing returns
      if (consecutiveLowYieldBatches >= MAX_LOW_YIELD_BATCHES) {
        console.log(`[Job ${jobId}] Diminishing returns detected (${consecutiveLowYieldBatches} low-yield batches). Stopping.`);
        break;
      }

      const batchStartCount = seenPlaceKeys.size;
      const batchQueries = uniqueQueries.slice(batchIdx * batchSize, (batchIdx + 1) * batchSize);
      const progressPct = Math.min(35 + Math.floor((batchIdx / totalBatches) * 50), 84);

      await updateJobProgress(
        jobId, searchPlan!, "SCRAPING", progressPct,
        "Searching Google Places",
        `Batch ${batchIdx + 1}/${totalBatches} | Unique places so far: ${seenPlaceKeys.size}`,
        seenPlaceKeys.size
      );

      await runWithConcurrency(batchQueries, CONCURRENCY, async (queryStr) => {
        if (seenPlaceKeys.size >= targetResults * 5 || apiPagesUsed >= maxApiPages) return;

        queriesRun++;
        console.log(`[Job ${jobId}] Q${queriesRun}: "${queryStr}"`);

        try {
          const results = await textSearch(queryStr, searchPlan!);

          apiPagesUsed += Math.max(1, Math.ceil(results.length / 20));

          for (const r of results) {
            const key = placeKey(r);
            if (!seenPlaceKeys.has(key)) {
              seenPlaceKeys.add(key);
              rawPlaces.push(r);
            }
          }
        } catch (e) {
          console.error(`[Job ${jobId}] Error on query "${queryStr}":`, e);
        }
      });

      // Adaptive termination: check if this batch yielded enough new results
      const batchNewCount = seenPlaceKeys.size - batchStartCount;
      const yieldRatio = batchStartCount > 0 ? batchNewCount / batchStartCount : 1.0;
      if (yieldRatio < LOW_YIELD_THRESHOLD && batchIdx > 0) {
        consecutiveLowYieldBatches++;
        console.log(`[Job ${jobId}] Low yield batch (${batchNewCount} new, ${Math.round(yieldRatio * 100)}% yield) [${consecutiveLowYieldBatches}/${MAX_LOW_YIELD_BATCHES}]`);
      } else {
        consecutiveLowYieldBatches = 0;
      }
    }

    console.log(`[Job ${jobId}] Scraping done. Raw unique: ${rawPlaces.length}. API pages used: ${apiPagesUsed}`);

    // ── 5. NORMALISE ─────────────────────────────────────────────
    await updateJobProgress(jobId, searchPlan, "SCRAPING", 86,
      "Normalizing & deduplicating",
      `${rawPlaces.length} raw records → running full deduplication…`);

    const normalized: PlaceRecord[] = rawPlaces.map((raw) => {
      const display = raw.displayName || {};
      const loc = raw.location || {};
      const address = raw.formattedAddress || null;

      let area: string | null = null;
      if (address) {
        const parts = address.split(",").map((p: string) => p.trim()).filter(Boolean);
        if (parts.length >= 3) area = parts[parts.length - 3];
      }

      return {
        place_id: raw.id,
        business_name: display.text || "Unknown",
        category: searchPlan!.category,
        address,
        area,
        city: resolvedLocation.city,
        district: resolvedLocation.district,
        province: resolvedLocation.province,
        country: "Pakistan",
        phone: raw.nationalPhoneNumber || raw.internationalPhoneNumber || null,
        website: raw.websiteUri || null,
        google_maps_url: raw.googleMapsUri || null,
        latitude: loc.latitude ?? null,
        longitude: loc.longitude ?? null,
        rating: raw.rating ?? null,
        review_count: raw.userRatingCount ?? null,
        business_status: raw.businessStatus ?? null,
        source: "Google Places API (New)",
        retrieved_at: raw._retrieved_at,
      } as PlaceRecord;
    });

    // Full multi-field deduplication (catches same business, different place IDs)
    const unique = deduplicate(normalized);
    const duplicatesRemoved = normalized.length - unique.length;

    // Classify data completeness for each record
    for (const record of unique) {
      record.data_completeness = classifyCompleteness(record);
    }

    // Geo-rank (filter out-of-area, sort by proximity + quality)
    // Name-only records (no coords) are kept but sorted to the end
    let ranked = unique;
    if (resolvedLocation.latitude || resolvedLocation.city) {
      ranked = filterAndRank(unique, searchPlan);
    }

    // Slice to requested count
    const final = ranked.slice(0, targetResults);

    // Compute search statistics
    const fullResults = final.filter(r => r.data_completeness === "FULL").length;
    const partialResults = final.filter(r => r.data_completeness === "PARTIAL").length;
    const nameOnlyResults = final.filter(r => r.data_completeness === "NAME_ONLY").length;

    const searchStats: SearchStatistics = {
      resultsFound: final.length,
      fullResults,
      partialResults,
      nameOnlyResults,
      searchZones: searchZonesCount,
      queriesExecuted: queriesRun,
      duplicatesRemoved,
      apiRequestsMade: apiPagesUsed,
      searchStatus: final.length >= targetResults ? "COMPLETED" : "LIMIT_REACHED",
    };

    console.log(`[Job ${jobId}] After dedup+rank: ${unique.length} unique → delivering ${final.length}`);
    console.log(`[Job ${jobId}] Completeness: FULL=${fullResults}, PARTIAL=${partialResults}, NAME_ONLY=${nameOnlyResults}`);

    // ── 6. SAVE ──────────────────────────────────────────────────
    const businessesToSave = final.map((r) => ({
      name: r.business_name || "Unknown",
      category: r.category || searchPlan!.category || "Business",
      address: r.address || null,
      area: r.area || null,
      city: r.city || resolvedLocation.city || null,
      country: r.country || "Pakistan",
      phone: r.phone || null,
      email: null,
      website: r.website || null,
      rating: r.rating || null,
      reviewCount: r.review_count || null,
      price: null,
      openingHours: null,
      description: null,
      source: r.source || "Google Places API (New)",
      sourceUrl: r.google_maps_url || null,
      latitude: r.latitude || null,
      longitude: r.longitude || null,
      placeId: r.place_id || null,
      dataCompleteness: r.data_completeness || null,
      googleMapsUrl: r.google_maps_url || null,
      internationalPhone: r.phone || null,
      businessStatus: r.business_status || null,
      additionalData: {
        google_maps_url: r.google_maps_url || null,
        business_status: r.business_status || null,
        review_count: r.review_count || null,
        qualityScore: calculateQualityScore(r),
        distance_km: r.distance_km || null,
        data_completeness: r.data_completeness || "PARTIAL",
      } as Record<string, unknown>,
    }));

    await saveBusinesses(jobId, businessesToSave);

    await updateSearchJob(jobId, {
      status: "COMPLETED",
      completedAt: new Date(),
      progress: 100,
      currentStage: "Completed",
      totalResults: businessesToSave.length,
      recordsFound: businessesToSave.length,
      parsedQuery: JSON.stringify({
        query: searchPlan,
        statistics: searchStats,
        progress: {
          stage: "Preparing results",
          detail: `Discovered ${businessesToSave.length} businesses (${fullResults} full, ${partialResults} partial, ${nameOnlyResults} name-only). ${duplicatesRemoved} duplicates removed across ${queriesRun} queries.`,
        },
      }),
    });

    console.log(`[Job ${jobId}] Done ✓ — ${businessesToSave.length} records saved.`);

  } catch (error: any) {
    console.error(`[Job ${jobId}] Fatal error:`, error);
    await updateSearchJob(jobId, {
      status: "ERROR",
      error: error.message || "An unexpected error occurred",
      completedAt: new Date(),
      progress: 0,
      currentStage: "Failed",
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// textSearchCapped — wraps textSearch but honours a page cap so we
// don't over-fetch near the API budget ceiling
// ─────────────────────────────────────────────────────────────────

async function textSearchCapped(
  query: string,
  plan: SearchPlan,
  maxPages: number
): Promise<any[]> {
  // Import the real textSearch and temporarily cap its page loop
  const { textSearch } = await import("./google-places");

  // We dynamically set a reduced pageSize-cap by monkey-patching isn't ideal;
  // instead we pass a plan copy with a hint the fetcher can use.
  // For simplicity we call textSearch directly — it already supports 3-page max
  // internally, so we just cap our result slice here.
  const results = await textSearch(query, plan);
  return results.slice(0, maxPages * 20);
}
