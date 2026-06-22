// CarsAuto — Complete World Car Makes & Models
// Generated for CarsAuto marketplace (Iraq, Kurdistan, UAE markets)

export interface CarModel {
  name: string;
  years?: [number, number]; // [from, to] — to=0 means still in production
}

export interface CarMake {
  name: string;
  country: string;
  logo?: string; // brand slug for icon lookup
  models: string[];
}

export const CAR_MAKES: CarMake[] = [
  // ─── JAPANESE ───────────────────────────────────────────
  {
    name: "Toyota",
    country: "Japan",
    logo: "toyota",
    models: [
      "Camry", "Corolla", "Land Cruiser", "Land Cruiser Prado",
      "Hilux", "RAV4", "Yaris", "Fortuner", "Innova", "Rush",
      "Avanza", "Vios", "Altis", "Aurion", "Sequoia", "Tundra",
      "Tacoma", "4Runner", "FJ Cruiser", "Highlander", "Kluger",
      "Venza", "C-HR", "Crown", "Avalon", "Celica", "Supra",
      "86", "GR86", "GR Yaris", "GR Corolla", "Prius", "Prius+",
      "bZ4X", "Sienna", "Alphard", "Vellfire", "Hiace", "Dyna",
      "Coaster", "Century", "Cressida", "Carina", "Starlet",
      "Echo", "Etios", "Wigo", "Agya", "Calya", "Veloz",
    ],
  },
  {
    name: "Honda",
    country: "Japan",
    logo: "honda",
    models: [
      "Civic", "Accord", "CR-V", "HR-V", "Pilot", "Passport",
      "Ridgeline", "Odyssey", "Fit", "Jazz", "City", "BR-V",
      "WR-V", "ZR-V", "Freed", "Mobilio", "Brio", "Amaze",
      "Legend", "Insight", "Clarity", "e", "Prologue",
      "Stream", "Jade", "Spike", "Element", "Crossroad",
      "S2000", "NSX", "Integra", "Prelude", "Del Sol",
    ],
  },
  {
    name: "Nissan",
    country: "Japan",
    logo: "nissan",
    models: [
      "Patrol", "Navara", "X-Trail", "Juke", "Qashqai",
      "Murano", "Pathfinder", "Frontier", "Titan", "Armada",
      "Altima", "Maxima", "Sentra", "Versa", "Sunny",
      "Tiida", "Teana", "Sylphy", "Kicks", "Terra",
      "Rogue", "Rogue Sport", "Ariya", "Leaf", "Note",
      "Micra", "March", "Cube", "GT-R", "370Z", "350Z",
      "Skyline", "Bluebird", "Cedric", "Gloria", "Stagea",
      "Elgrand", "Serena", "Livina", "Grand Livina",
    ],
  },
  {
    name: "Mazda",
    country: "Japan",
    logo: "mazda",
    models: [
      "Mazda2", "Mazda3", "Mazda6", "CX-3", "CX-30",
      "CX-5", "CX-50", "CX-60", "CX-70", "CX-80",
      "CX-90", "MX-5 Miata", "MX-30", "RX-7", "RX-8",
      "BT-50", "Tribute", "MPV", "Premacy", "Biante",
    ],
  },
  {
    name: "Subaru",
    country: "Japan",
    logo: "subaru",
    models: [
      "Outback", "Forester", "Impreza", "Legacy", "XV",
      "Crosstrek", "Ascent", "BRZ", "WRX", "WRX STI",
      "Levorg", "Exiga", "Tribeca", "Baja",
    ],
  },
  {
    name: "Mitsubishi",
    country: "Japan",
    logo: "mitsubishi",
    models: [
      "Outlander", "Eclipse Cross", "ASX", "Pajero",
      "Pajero Sport", "L200", "Triton", "Galant", "Lancer",
      "Lancer Evolution", "Colt", "Mirage", "Attrage",
      "Xpander", "Delica", "Grandis", "Sigma", "Starion",
      "3000GT", "Montero", "Raider",
    ],
  },
  {
    name: "Suzuki",
    country: "Japan",
    logo: "suzuki",
    models: [
      "Swift", "Vitara", "S-Cross", "Jimny", "Ignis",
      "Baleno", "Celerio", "Alto", "Wagon R", "Ertiga",
      "XL7", "Grand Vitara", "Kizashi", "SX4", "Ciaz",
      "Solio", "Landy", "Every", "Carry",
    ],
  },
  {
    name: "Lexus",
    country: "Japan",
    logo: "lexus",
    models: [
      "IS", "ES", "GS", "LS", "RC", "LC", "UX",
      "NX", "RX", "GX", "LX", "TX", "RZ",
      "CT", "HS", "SC", "LFA",
    ],
  },
  {
    name: "Infiniti",
    country: "Japan",
    logo: "infiniti",
    models: [
      "Q30", "Q50", "Q60", "Q70", "QX30", "QX50",
      "QX55", "QX60", "QX70", "QX80", "G37", "G35",
      "FX35", "FX45", "EX35", "JX35", "M37", "M56",
    ],
  },
  {
    name: "Acura",
    country: "Japan",
    logo: "acura",
    models: [
      "ILX", "TLX", "RLX", "MDX", "RDX", "ZDX",
      "NSX", "RSX", "TSX", "CSX", "Integra", "Legend",
    ],
  },
  {
    name: "Daihatsu",
    country: "Japan",
    logo: "daihatsu",
    models: [
      "Terios", "Rocky", "Sirion", "Charade", "Cuore",
      "Move", "Tanto", "Mira", "Boon", "Materia",
      "Gran Max", "Luxio",
    ],
  },
  {
    name: "Isuzu",
    country: "Japan",
    logo: "isuzu",
    models: [
      "D-Max", "MU-X", "Trooper", "Rodeo", "Axiom",
      "Ascender", "Amigo", "VehiCROSS",
    ],
  },

  // ─── KOREAN ─────────────────────────────────────────────
  {
    name: "Hyundai",
    country: "South Korea",
    logo: "hyundai",
    models: [
      "Tucson", "Santa Fe", "Elantra", "Sonata", "Accent",
      "i10", "i20", "i30", "i40", "Creta", "Venue",
      "Kona", "Ioniq", "Ioniq 5", "Ioniq 6", "Ioniq 9",
      "Palisade", "Nexo", "Staria", "Starex", "H-1",
      "Genesis", "Azera", "Grandeur", "Equus", "Veracruz",
      "Santa Cruz", "Bayon", "Casper",
    ],
  },
  {
    name: "Kia",
    country: "South Korea",
    logo: "kia",
    models: [
      "Sportage", "Sorento", "Telluride", "Carnival",
      "Stinger", "K5", "K8", "K9", "Optima", "Cerato",
      "Rio", "Picanto", "Seltos", "Sonet", "Niro",
      "EV6", "EV9", "EV3", "Soul", "Stonic",
      "Cadenza", "Quoris", "Carens", "Proceed",
    ],
  },
  {
    name: "Genesis",
    country: "South Korea",
    logo: "genesis",
    models: [
      "G70", "G80", "G90", "GV70", "GV80", "GV60",
      "Electrified G80", "Electrified GV70",
    ],
  },
  {
    name: "SsangYong",
    country: "South Korea",
    logo: "ssangyong",
    models: [
      "Rexton", "Korando", "Tivoli", "Musso",
      "Actyon", "Rodius", "Kyron", "Chairman",
    ],
  },
  {
    name: "Daewoo",
    country: "South Korea",
    logo: "daewoo",
    models: [
      "Lanos", "Nubira", "Leganza", "Matiz", "Kalos",
      "Lacetti", "Evanda", "Magnus", "Espero",
    ],
  },

  // ─── GERMAN ─────────────────────────────────────────────
  {
    name: "BMW",
    country: "Germany",
    logo: "bmw",
    models: [
      "1 Series", "2 Series", "3 Series", "4 Series",
      "5 Series", "6 Series", "7 Series", "8 Series",
      "X1", "X2", "X3", "X4", "X5", "X6", "X7", "XM",
      "Z3", "Z4", "i3", "i4", "i5", "i7", "iX", "iX1", "iX3",
      "M2", "M3", "M4", "M5", "M6", "M8",
      "M240i", "M340i", "M440i", "M550i",
    ],
  },
  {
    name: "Mercedes-Benz",
    country: "Germany",
    logo: "mercedes-benz",
    models: [
      "A-Class", "B-Class", "C-Class", "E-Class",
      "S-Class", "CLA", "CLS", "G-Class", "GLA",
      "GLB", "GLC", "GLE", "GLS", "EQA", "EQB",
      "EQC", "EQE", "EQS", "AMG GT", "SL", "SLC",
      "V-Class", "Sprinter", "Vito",
      "C 63 AMG", "E 63 AMG", "G 63 AMG", "GLE 63 AMG",
    ],
  },
  {
    name: "Audi",
    country: "Germany",
    logo: "audi",
    models: [
      "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8",
      "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8",
      "TT", "TTS", "TTRS", "R8",
      "e-tron", "e-tron GT", "Q4 e-tron", "Q8 e-tron",
      "S3", "S4", "S5", "S6", "S7", "S8",
      "RS3", "RS4", "RS5", "RS6", "RS7",
      "RS Q3", "RS Q8", "SQ5", "SQ7", "SQ8",
    ],
  },
  {
    name: "Volkswagen",
    country: "Germany",
    logo: "volkswagen",
    models: [
      "Golf", "Polo", "Passat", "Tiguan", "Touareg",
      "T-Cross", "T-Roc", "Taigo", "Tayron", "ID.3",
      "ID.4", "ID.5", "ID.6", "ID.7", "ID. Buzz",
      "Jetta", "Scirocco", "Arteon", "Phaeton",
      "Beetle", "Up", "Caddy", "Multivan", "Caravelle",
      "Touran", "Sharan", "Amarok",
    ],
  },
  {
    name: "Porsche",
    country: "Germany",
    logo: "porsche",
    models: [
      "911", "Cayenne", "Macan", "Panamera",
      "Taycan", "718 Boxster", "718 Cayman",
      "912", "914", "928", "944", "968",
    ],
  },
  {
    name: "Opel",
    country: "Germany",
    logo: "opel",
    models: [
      "Astra", "Corsa", "Mokka", "Crossland", "Grandland",
      "Insignia", "Zafira", "Meriva", "Vectra",
      "Antara", "Frontera", "Omega",
    ],
  },

  // ─── AMERICAN ───────────────────────────────────────────
  {
    name: "Ford",
    country: "USA",
    logo: "ford",
    models: [
      "F-150", "F-250", "F-350", "Ranger", "Maverick",
      "Explorer", "Expedition", "Edge", "Escape",
      "EcoSport", "Bronco", "Bronco Sport", "Puma",
      "Mustang", "Mustang Mach-E", "Focus", "Fusion",
      "Mondeo", "Fiesta", "Ka", "Galaxy", "S-Max",
      "Transit", "Transit Custom", "Transit Connect",
      "E-Transit", "Tourneo",
    ],
  },
  {
    name: "Chevrolet",
    country: "USA",
    logo: "chevrolet",
    models: [
      "Silverado", "Colorado", "Tahoe", "Suburban",
      "Traverse", "Equinox", "Trax", "Trailblazer",
      "Blazer", "Camaro", "Corvette", "Malibu",
      "Impala", "Sonic", "Spark", "Volt", "Bolt EV",
      "Blazer EV", "Equinox EV", "Captiva", "Orlando",
    ],
  },
  {
    name: "Dodge",
    country: "USA",
    logo: "dodge",
    models: [
      "Charger", "Challenger", "Durango", "Journey",
      "Grand Caravan", "Dakota", "Ram 1500",
      "Viper", "Neon", "Caliber", "Avenger",
    ],
  },
  {
    name: "Jeep",
    country: "USA",
    logo: "jeep",
    models: [
      "Wrangler", "Grand Cherokee", "Cherokee",
      "Compass", "Renegade", "Gladiator",
      "Commander", "Patriot", "Liberty",
      "Grand Wagoneer", "Wagoneer",
    ],
  },
  {
    name: "Cadillac",
    country: "USA",
    logo: "cadillac",
    models: [
      "Escalade", "XT4", "XT5", "XT6", "CT4", "CT5",
      "Lyriq", "Celestiq", "CTS", "ATS", "SRX",
      "Escalade ESV", "DTS", "STS",
    ],
  },
  {
    name: "GMC",
    country: "USA",
    logo: "gmc",
    models: [
      "Sierra", "Canyon", "Yukon", "Yukon XL",
      "Terrain", "Acadia", "Envoy", "Jimmy",
      "Hummer EV", "Hummer EV SUV",
    ],
  },
  {
    name: "Lincoln",
    country: "USA",
    logo: "lincoln",
    models: [
      "Navigator", "Aviator", "Corsair", "Nautilus",
      "Continental", "MKZ", "MKX", "MKC", "MKT",
    ],
  },
  {
    name: "Tesla",
    country: "USA",
    logo: "tesla",
    models: [
      "Model S", "Model 3", "Model X", "Model Y",
      "Cybertruck", "Roadster", "Semi",
    ],
  },
  {
    name: "RAM",
    country: "USA",
    logo: "ram",
    models: [
      "1500", "2500", "3500", "ProMaster",
      "ProMaster City", "Dakota",
    ],
  },
  {
    name: "Chrysler",
    country: "USA",
    logo: "chrysler",
    models: [
      "300", "Pacifica", "Voyager", "Aspen",
      "Sebring", "PT Cruiser", "Crossfire",
    ],
  },
  {
    name: "Buick",
    country: "USA",
    logo: "buick",
    models: [
      "Enclave", "Encore", "Encore GX", "Envision",
      "Envista", "LaCrosse", "Verano", "Regal", "Lucerne",
    ],
  },

  // ─── BRITISH ────────────────────────────────────────────
  {
    name: "Land Rover",
    country: "United Kingdom",
    logo: "land-rover",
    models: [
      "Range Rover", "Range Rover Sport",
      "Range Rover Velar", "Range Rover Evoque",
      "Discovery", "Discovery Sport",
      "Defender", "Freelander",
    ],
  },
  {
    name: "Jaguar",
    country: "United Kingdom",
    logo: "jaguar",
    models: [
      "XE", "XF", "XJ", "F-Type", "E-Pace",
      "F-Pace", "I-Pace", "XK", "S-Type", "X-Type",
    ],
  },
  {
    name: "Bentley",
    country: "United Kingdom",
    logo: "bentley",
    models: [
      "Continental GT", "Continental GTC",
      "Flying Spur", "Bentayga", "Mulsanne",
      "Arnage", "Azure",
    ],
  },
  {
    name: "Rolls-Royce",
    country: "United Kingdom",
    logo: "rolls-royce",
    models: [
      "Phantom", "Ghost", "Wraith", "Dawn",
      "Cullinan", "Spectre", "Silver Shadow",
      "Silver Seraph", "Park Ward",
    ],
  },
  {
    name: "MINI",
    country: "United Kingdom",
    logo: "mini",
    models: [
      "Cooper", "Cooper S", "John Cooper Works",
      "Clubman", "Countryman", "Paceman",
      "Coupe", "Roadster", "Cabrio", "Electric",
    ],
  },
  {
    name: "Aston Martin",
    country: "United Kingdom",
    logo: "aston-martin",
    models: [
      "DB11", "DB12", "DBS", "Vantage",
      "Rapide", "Vanquish", "DBX",
      "DB9", "DB7", "V8 Vantage",
    ],
  },

  // ─── ITALIAN ────────────────────────────────────────────
  {
    name: "Ferrari",
    country: "Italy",
    logo: "ferrari",
    models: [
      "488", "F8 Tributo", "SF90 Stradale", "Roma",
      "Portofino", "812 Superfast", "GTC4Lusso",
      "Purosangue", "LaFerrari", "458", "California",
      "F430", "599", "612", "456", "F355", "348",
    ],
  },
  {
    name: "Lamborghini",
    country: "Italy",
    logo: "lamborghini",
    models: [
      "Urus", "Huracan", "Aventador", "Revuelto",
      "Sterrato", "Gallardo", "Murcielago",
      "Diablo", "Countach", "Espada",
    ],
  },
  {
    name: "Maserati",
    country: "Italy",
    logo: "maserati",
    models: [
      "Ghibli", "Quattroporte", "Levante",
      "GranTurismo", "GranCabrio", "Grecale",
      "MC20", "3200 GT",
    ],
  },
  {
    name: "Alfa Romeo",
    country: "Italy",
    logo: "alfa-romeo",
    models: [
      "Giulia", "Stelvio", "Tonale", "Giulietta",
      "MiTo", "147", "156", "159", "166", "Spider",
      "GTV", "Brera", "4C",
    ],
  },
  {
    name: "Fiat",
    country: "Italy",
    logo: "fiat",
    models: [
      "500", "500X", "500L", "Panda", "Tipo",
      "Bravo", "Punto", "Stilo", "Doblo",
      "Freemont", "Fullback", "Sedici",
    ],
  },

  // ─── FRENCH ─────────────────────────────────────────────
  {
    name: "Peugeot",
    country: "France",
    logo: "peugeot",
    models: [
      "208", "308", "408", "508", "2008",
      "3008", "5008", "Rifter", "Traveller",
      "107", "207", "307", "207", "407",
      "Partner", "Expert", "Boxer",
    ],
  },
  {
    name: "Renault",
    country: "France",
    logo: "renault",
    models: [
      "Clio", "Megane", "Laguna", "Talisman",
      "Koleos", "Duster", "Captur", "Kadjar",
      "Arkana", "Scenic", "Espace", "Zoe",
      "Twingo", "Sandero", "Logan", "Dokker",
    ],
  },
  {
    name: "Citroën",
    country: "France",
    logo: "citroen",
    models: [
      "C1", "C2", "C3", "C4", "C5",
      "C3 Aircross", "C4 Cactus", "C5 Aircross",
      "Berlingo", "Jumpy", "Dispatch", "SpaceTourer",
      "DS3", "DS4", "DS5",
    ],
  },
  {
    name: "DS Automobiles",
    country: "France",
    logo: "ds",
    models: [
      "DS3 Crossback", "DS4", "DS7 Crossback",
      "DS9", "DS3", "DS5",
    ],
  },

  // ─── SWEDISH ────────────────────────────────────────────
  {
    name: "Volvo",
    country: "Sweden",
    logo: "volvo",
    models: [
      "XC40", "XC60", "XC90", "C40",
      "S60", "S90", "V60", "V90",
      "EX30", "EX40", "EX90", "EC40",
      "850", "940", "960", "S40", "S70",
      "V40", "V50", "V70", "C70",
    ],
  },

  // ─── CHINESE ────────────────────────────────────────────
  {
    name: "BYD",
    country: "China",
    logo: "byd",
    models: [
      "Atto 3", "Seal", "Dolphin", "Han",
      "Tang", "Song Plus", "Song Pro",
      "Yuan Plus", "Seagull", "Sea Lion",
      "Destroyer 05", "Frigate 07",
    ],
  },
  {
    name: "Geely",
    country: "China",
    logo: "geely",
    models: [
      "Coolray", "Azkarra", "Okavango",
      "Emgrand", "Atlas", "Tugella",
      "Preface", "Vision", "Boyue",
    ],
  },
  {
    name: "Chery",
    country: "China",
    logo: "chery",
    models: [
      "Tiggo 4", "Tiggo 7", "Tiggo 8",
      "Omoda 5", "Omoda C5", "Arrizo 5",
      "Arrizo 6", "QQ",
    ],
  },
  {
    name: "Haval",
    country: "China",
    logo: "haval",
    models: [
      "H2", "H4", "H6", "H7", "H9",
      "Jolion", "Big Dog", "Dargo",
      "F7", "F7x", "M6",
    ],
  },
  {
    name: "MG",
    country: "China",
    logo: "mg",
    models: [
      "MG3", "MG4", "MG5", "MG6",
      "ZS", "HS", "RX5", "VS",
      "EZS", "Marvel R", "MG One",
    ],
  },
  {
    name: "GAC",
    country: "China",
    logo: "gac",
    models: [
      "GS3", "GS4", "GS5", "GS8",
      "GA4", "GA6", "GA8", "Aion S",
      "Aion Y", "Aion V", "Empow",
    ],
  },
  {
    name: "BAIC",
    country: "China",
    logo: "baic",
    models: [
      "BJ40", "BJ60", "BJ80",
      "X35", "X55", "X75",
      "EU5", "EC5", "EX5",
    ],
  },
  {
    name: "Changan",
    country: "China",
    logo: "changan",
    models: [
      "CS35 Plus", "CS55 Plus", "CS75 Plus",
      "CS85", "CS95", "Uni-T", "Uni-K",
      "Uni-V", "Eado", "Lamore",
    ],
  },
  {
    name: "JAC",
    country: "China",
    logo: "jac",
    models: [
      "S2", "S3", "S4", "S5", "S7",
      "iEV6E", "iEV7S", "Refine",
    ],
  },
  {
    name: "Dongfeng",
    country: "China",
    logo: "dongfeng",
    models: [
      "AX4", "AX7", "SX5", "SX6",
      "Fengshen", "Fengon",
    ],
  },

  // ─── SPANISH ────────────────────────────────────────────
  {
    name: "SEAT",
    country: "Spain",
    logo: "seat",
    models: [
      "Ibiza", "Leon", "Arona", "Ateca",
      "Tarraco", "Toledo", "Alhambra",
      "Mii", "Exeo",
    ],
  },

  // ─── CZECH ──────────────────────────────────────────────
  {
    name: "Škoda",
    country: "Czech Republic",
    logo: "skoda",
    models: [
      "Octavia", "Superb", "Karoq", "Kodiaq",
      "Fabia", "Scala", "Kamiq", "Enyaq",
      "Citigo", "Rapid", "Roomster",
    ],
  },

  // ─── ROMANIAN ───────────────────────────────────────────
  {
    name: "Dacia",
    country: "Romania",
    logo: "dacia",
    models: [
      "Sandero", "Logan", "Duster",
      "Jogger", "Spring", "Dokker",
      "Lodgy", "Bigster",
    ],
  },

  // ─── IRANIAN ────────────────────────────────────────────
  {
    name: "Iran Khodro",
    country: "Iran",
    logo: "iran-khodro",
    models: [
      "Peugeot 206", "Peugeot 207i", "Peugeot 405",
      "Peugeot 206SD", "Samand", "Soren",
      "Dena", "Runna", "Tara",
    ],
  },
  {
    name: "SAIPA",
    country: "Iran",
    logo: "saipa",
    models: [
      "Pride", "Tiba", "Quick", "Saina",
      "Shahin", "Changan CS35",
    ],
  },

  // ─── OTHER ──────────────────────────────────────────────
  {
    name: "Rivian",
    country: "USA",
    logo: "rivian",
    models: ["R1T", "R1S", "R2", "R3"],
  },
  {
    name: "Lucid",
    country: "USA",
    logo: "lucid",
    models: ["Air", "Gravity"],
  },
  {
    name: "Polestar",
    country: "Sweden",
    logo: "polestar",
    models: ["Polestar 1", "Polestar 2", "Polestar 3", "Polestar 4"],
  },
  {
    name: "Lynk & Co",
    country: "China",
    logo: "lynk-co",
    models: ["01", "02", "03", "05", "06", "09"],
  },
  {
    name: "Great Wall",
    country: "China",
    logo: "great-wall",
    models: ["Poer", "Cannon", "Pao", "Tank 300", "Tank 500"],
  },
];

// ─── Helper functions ────────────────────────────────────

/** Get all make names sorted A-Z */
export const getAllMakeNames = (): string[] =>
  CAR_MAKES.map((m) => m.name).sort((a, b) => a.localeCompare(b));

/** Get models for a specific make */
export const getModelsByMake = (makeName: string): string[] =>
  CAR_MAKES.find((m) => m.name === makeName)?.models ?? [];

/** Get makes grouped by country */
export const getMakesByCountry = (): Record<string, CarMake[]> =>
  CAR_MAKES.reduce(
    (acc, make) => {
      acc[make.country] = [...(acc[make.country] ?? []), make];
      return acc;
    },
    {} as Record<string, CarMake[]>
  );

/** Get logo slug for a make name */
export const getLogoSlug = (makeName: string): string | undefined =>
  CAR_MAKES.find((m) => m.name === makeName)?.logo;

export default CAR_MAKES;
