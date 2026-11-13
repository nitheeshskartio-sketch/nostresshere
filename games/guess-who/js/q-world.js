/* ============ GUESS WHO? — Countries of the World & World Culture ============
   Country questions are generated from world-data.js; culture lists are hand-written. */
(function () {
  "use strict";
  const add = GW.add, W = window.GW_WORLD;

  /* ---------- helpers ---------- */
  const words = (s) => " " + GW.norm(s) + " ";
  // true when a clue would give the answer away: the full name, a long alias, or a distinctive word of the name appears in it
  const GENERIC = new Set(["republic", "south", "north", "east", "west", "central", "democratic", "united", "saint", "islands", "island", "kingdom", "states", "federated", "grenadines", "city", "the", "and", "new", "great"]);
  function leaks(clue, names) {
    const c = words(clue);
    for (const n of names) {
      if (!n) continue;
      const nn = GW.norm(n);
      if (nn.length >= 4 && c.includes(" " + nn + " ")) return true;
      for (const t of nn.split(" ")) if (t.length >= 4 && !GENERIC.has(t) && (c.includes(" " + t + " ") || c.includes(" " + t + "s "))) return true;
    }
    return false;
  }
  const clean = (list, names) => list.filter((c) => c && !leaks(c, names));
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const C = [];   // flattened country records
  for (const cont of W.CONTINENTS) for (const r of W.ROWS[cont.id]) {
    const [name, aliases, region, capital, capAliases, cur, code, lang, nb, lm, food, flag, diff] = r;
    C.push({ cont, name, aliases, region, capital, capAliases, cur, code, lang, nb, lm, food, flag, diff });
  }
  const names = (c) => [c.name].concat(c.aliases ? c.aliases.split("|") : []);
  const T = {
    loc: (c) => "It is " + c.region,
    nb: (c) => (c.nb ? "It shares land borders with " + c.nb : ""),
    island: (c) => (c.nb ? "" : "It has no land borders with any other country"),
    food: (c) => (c.food ? "Famous dishes from here include " + c.food : ""),
    lm: (c) => (c.lm ? "It is home to " + c.lm : ""),
    lang: (c) => (c.lang ? "People here mainly speak " + c.lang : ""),
    cur: (c) => (c.cur ? "Its currency is the " + c.cur + (c.code ? " (" + c.code + ")" : "") : ""),
    flag: (c) => (c.flag ? "Its flag: " + c.flag : ""),
    cap: (c) => (c.capital ? "Its capital city is " + c.capital : "")
  };
  const info = (c) => `${c.name} is in ${c.cont.name}${c.capital ? "; its capital is " + c.capital : ""}${c.cur ? " and its currency is the " + c.cur : ""}.`;
  const build = (c, keys) => clean(keys.map((k) => T[k](c)), names(c));

  /* =================== COUNTRIES OF THE WORLD =================== */
  // by continent: a mix of every kind of clue, vague → revealing
  for (const cont of W.CONTINENTS) {
    add("countries", cont.id, cont.name, cont.icon, C.filter((c) => c.cont === cont).map((c) =>
      [c.name, c.aliases, c.diff, info(c), build(c, ["loc", "island", "nb", "food", "lm", "lang", "cur", "flag", "cap"])]));
  }
  // themed question types: the first clue is the one the question is about
  const BY = [
    ["bycapital", "From Its Capital", "🏛️", "cap", 0, (c) => c.capital],
    ["byflag", "From Its Flag", "🚩", "flag", 1, (c) => c.flag],
    ["bycurrency", "From Its Currency", "💱", "cur", 1, (c) => c.cur],
    ["bylandmark", "From Its Landmark", "🗿", "lm", 0, (c) => c.lm],
    ["byfood", "From Its Food", "🍲", "food", 0, (c) => c.food],
    ["byneighbours", "From Its Neighbours", "🧭", "nb", 1, (c) => c.nb]
  ];
  for (const [id, label, icon, key, harder, has] of BY) {
    const helpers = ["loc", "lang", "food", "lm", "cur"].filter((k) => k !== key);
    const rows = [];
    for (const c of C) {
      if (!has(c)) continue;
      const first = build(c, [key]);
      if (!first.length) continue;
      const extra = build(c, helpers).slice(0, 2);
      rows.push([c.name, c.aliases, Math.min(4, c.diff + harder), info(c), first.concat(extra)]);
    }
    add("countries", id, label, icon, rows, { shared: true });
  }

  // from famous people born there
  add("countries", "bypeople", "From Famous People", "👥", [
    ["India", "bharat", 1, "India — home of Gandhi, Tendulkar and Shah Rukh Khan.", "Mathematician Srinivasa Ramanujan was born here|Mahatma Gandhi led its independence movement|Cricketer Sachin Tendulkar and actor Shah Rukh Khan are from here"],
    ["United States", "usa|us|america|united states of america", 1, "USA — Lincoln, Armstrong, Beyoncé.", "Inventor Thomas Edison was born here|Neil Armstrong, the first person on the Moon, came from here|Abraham Lincoln and Martin Luther King Jr. are national heroes"],
    ["United Kingdom", "uk|britain|great britain|england", 1, "UK — Shakespeare, Newton, the Beatles.", "Isaac Newton and Charles Darwin were born here|William Shakespeare wrote his plays here|The Beatles and Adele are from here"],
    ["France", "", 1, "France — Napoleon, Marie Curie (by citizenship), Mbappé.", "Painter Claude Monet and writer Victor Hugo were born here|Emperor Napoleon Bonaparte ruled it|Footballer Kylian Mbappé plays for its national team"],
    ["Germany", "deutschland", 1, "Germany — Einstein, Beethoven, Bach.", "Composers Bach and Beethoven were born here|Albert Einstein was born in its city of Ulm|Carmakers Karl Benz and Gottlieb Daimler worked here"],
    ["Italy", "italia", 1, "Italy — Leonardo, Galileo, Marco Polo.", "Explorer Marco Polo came from Venice, in this country|Galileo Galilei and Leonardo da Vinci were born here|The Renaissance painter Michelangelo painted its Sistine Chapel"],
    ["Brazil", "brasil", 1, "Brazil — Pelé, Ronaldinho, Neymar.", "Formula 1 legend Ayrton Senna came from here|Supermodel Gisele Bündchen was born here|Football legends Pelé, Ronaldinho and Neymar are from here"],
    ["Argentina", "", 1, "Argentina — Messi, Maradona, Pope Francis.", "Revolutionary Che Guevara was born here|Pope Francis was born in its capital|Footballers Lionel Messi and Diego Maradona are from here"],
    ["Portugal", "", 2, "Portugal — Ronaldo, Vasco da Gama.", "Explorer Vasco da Gama sailed from here to India|Football manager José Mourinho was born here|Cristiano Ronaldo is its most famous footballer"],
    ["Spain", "espana", 1, "Spain — Picasso, Nadal, Cervantes.", "Painters Pablo Picasso and Salvador Dalí were born here|Writer Miguel de Cervantes wrote Don Quixote here|Tennis great Rafael Nadal is from here"],
    ["Japan", "nippon", 1, "Japan — Miyazaki, Ohtani, Kurosawa.", "Film director Akira Kurosawa was born here|Animator Hayao Miyazaki founded Studio Ghibli here|Baseball star Shohei Ohtani is from here"],
    ["China", "prc", 1, "China — Confucius, Jackie Chan (Hong Kong), Yao Ming.", "The philosopher Confucius taught here|Basketball star Yao Ming was born in Shanghai|Its founding leader was Mao Zedong"],
    ["South Africa", "rsa", 2, "South Africa — Mandela, Charlize Theron, Elon Musk (born).", "Actor Charlize Theron was born here|Elon Musk was born in Pretoria|Nelson Mandela became its first Black president"],
    ["Jamaica", "", 2, "Jamaica — Bob Marley and Usain Bolt.", "Dancehall stars Shaggy and Sean Paul are from here|Reggae legend Bob Marley was born here|Sprinter Usain Bolt is from here"],
    ["Barbados", "", 3, "Barbados — Rihanna and cricketer Garfield Sobers.", "Cricket great Sir Garfield Sobers was born here|It named a pop star its national hero in 2021|Rihanna was born here"],
    ["Pakistan", "", 2, "Pakistan — Malala, Imran Khan, Nusrat Fateh Ali Khan.", "Qawwali singer Nusrat Fateh Ali Khan was born here|Cricketer-turned-politician Imran Khan led it|Nobel Peace Prize winner Malala Yousafzai was born here"],
    ["Australia", "oz", 1, "Australia — Hugh Jackman, Bradman, Steve Irwin.", "Cricket legend Sir Don Bradman played for it|'Crocodile Hunter' Steve Irwin came from here|Actors Hugh Jackman, Chris Hemsworth and Margot Robbie are from here"],
    ["Canada", "", 1, "Canada — Gretzky, Keanu Reeves (raised), Drake.", "Ice hockey legend Wayne Gretzky was born here|Actors Ryan Reynolds and Ryan Gosling were born here|Singers Justin Bieber, Drake and Celine Dion are from here"],
    ["Russia", "", 1, "Russia — Tolstoy, Gagarin, Tchaikovsky.", "Composer Pyotr Tchaikovsky was born here|Writers Leo Tolstoy and Fyodor Dostoevsky wrote here|Yuri Gagarin, the first human in space, was from here"],
    ["Austria", "osterreich", 2, "Austria — Mozart, Schwarzenegger, Freud.", "Psychoanalyst Sigmund Freud worked in its capital|Arnold Schwarzenegger was born here|Wolfgang Amadeus Mozart was born in Salzburg"],
    ["Poland", "polska", 2, "Poland — Copernicus, Marie Curie, Chopin.", "Composer Frédéric Chopin was born here|Astronomer Nicolaus Copernicus was born here|Marie Curie (born Maria Skłodowska) grew up in Warsaw"],
    ["Netherlands", "holland", 2, "Netherlands — Van Gogh, Anne Frank (lived), Max Verstappen.", "Painters Rembrandt and Vincent van Gogh were born here|Anne Frank hid from the Nazis in Amsterdam|F1 champion Max Verstappen races for it"],
    ["Egypt", "", 2, "Egypt — Cleopatra, Mohamed Salah.", "Tutankhamun ruled it as a boy pharaoh|Queen Cleopatra was its last active ruler of the Ptolemaic line|Footballer Mohamed Salah is from here"],
    ["Mexico", "", 2, "Mexico — Frida Kahlo, Guillermo del Toro.", "Film-maker Guillermo del Toro was born here|Actor Salma Hayek is from here|Painter Frida Kahlo lived in its capital"],
    ["Sweden", "sverige", 2, "Sweden — Nobel, ABBA, Greta Thunberg.", "Alfred Nobel, founder of the Nobel Prizes, was born here|Climate activist Greta Thunberg is from here|Pop group ABBA came from here"],
    ["Norway", "norge", 3, "Norway — Amundsen, Munch, Haaland.", "Painter Edvard Munch made 'The Scream' here|Roald Amundsen, first to the South Pole, came from here|Footballer Erling Haaland plays for its national team"],
    ["South Korea", "korea", 2, "South Korea — BTS, Son Heung-min, Bong Joon-ho.", "Director Bong Joon-ho made 'Parasite' here|Footballer Son Heung-min captains its team|K-pop groups BTS and BLACKPINK are from here"],
    ["Nigeria", "", 3, "Nigeria — Chinua Achebe, Burna Boy, Wole Soyinka.", "Wole Soyinka, Africa's first Nobel literature winner, was born here|Novelist Chinua Achebe wrote 'Things Fall Apart'|Afrobeats stars Burna Boy and Wizkid are from here"],
    ["Kenya", "", 3, "Kenya — Wangari Maathai, Eliud Kipchoge.", "Environmentalist Wangari Maathai won the Nobel Peace Prize|Barack Obama's father came from here|Marathon great Eliud Kipchoge runs for it"],
    ["Ireland", "eire", 2, "Ireland — Joyce, Bono, Conor McGregor.", "Writers James Joyce and Oscar Wilde were born here|U2 singer Bono is from here|Fighter Conor McGregor is from Dublin"],
    ["Colombia", "", 2, "Colombia — García Márquez, Shakira.", "Novelist Gabriel García Márquez was born here|Footballer James Rodríguez plays for it|Singer Shakira was born in Barranquilla"],
    ["Sri Lanka", "ceylon", 3, "Sri Lanka — Muralitharan, Jacqueline Fernandez.", "The world's first female prime minister, Sirimavo Bandaranaike, led it|Actress Jacqueline Fernandez was born here|Spin bowler Muttiah Muralitharan took 800 Test wickets for it"],
    ["New Zealand", "nz", 2, "New Zealand — Edmund Hillary, Peter Jackson, Lorde.", "Edmund Hillary, who climbed Everest in 1953, came from here|Director Peter Jackson filmed 'The Lord of the Rings' here|Singer Lorde was born here"],
    ["Greece", "hellas", 2, "Greece — Socrates, Plato, Giannis Antetokounmpo.", "Philosophers Socrates, Plato and Aristotle lived here|The first modern Olympics were held here in 1896|NBA star Giannis Antetokounmpo plays for its team"],
    ["Belgium", "", 3, "Belgium — Hergé (Tintin), Audrey Hepburn (born).", "Actress Audrey Hepburn was born in Brussels|Cyclist Eddy Merckx came from here|Hergé, creator of Tintin, was from here"],
    ["Switzerland", "", 3, "Switzerland — Federer, Le Corbusier.", "Psychiatrist Carl Jung was born here|The architect Le Corbusier was born here|Tennis legend Roger Federer is from Basel"],
    ["Cuba", "", 3, "Cuba — Fidel Castro, Celia Cruz.", "Revolutionary leader Fidel Castro ruled it|Salsa queen Celia Cruz was born here|Singer Camila Cabello was born in Havana"]
  ], { shared: true });

  /* =================== WORLD CULTURE =================== */
  // capital cities (generated) — skipped where the capital shares the country's name
  const capRows = [];
  for (const c of C) {
    if (!c.capital) continue;
    const a = GW.compact(c.capital), b = GW.compact(c.name);
    if (a.includes(b) || b.includes(a)) continue;
    const capNames = [c.capital].concat(c.capAliases ? c.capAliases.split("|") : []);
    const clues = clean([
      "The capital of " + c.region,
      c.lm ? "Its country is home to " + c.lm : "",
      c.lang ? "Its people mainly speak " + c.lang : "",
      c.cur ? "Its country's currency is the " + c.cur : "",
      "It is the capital of " + c.name
    ], capNames);
    capRows.push([c.capital, c.capAliases, c.diff, `${c.capital} is the capital of ${c.name}.`, clues]);
  }
  add("culture", "capitals", "Capital Cities", "🏙️", capRows, { ask: "Guess the Capital City!" });

  add("culture", "currencies", "Currencies", "💰", [
    ["Euro", "eur", 1, "The euro (€) is shared by most European Union countries.", "It was introduced as cash in 2002|Its symbol is a C with two lines through it|It is managed by a central bank in Frankfurt|More than 20 European Union countries use it|Its code is EUR"],
    ["US dollar", "usd|american dollar|united states dollar|greenback|dollar", 1, "The US dollar is the world's main reserve currency.", "It is the world's main reserve currency|Its nickname is the 'greenback'|Ecuador and El Salvador use it too|Its banknotes show presidents like Washington and Lincoln|Its code is USD"],
    ["Pound sterling", "gbp|british pound|pound|sterling|quid", 1, "The pound sterling is the oldest currency still in use.", "It is the oldest currency still in continuous use|Slang for one unit is a 'quid'|One unit is 100 pence|Its banknotes carry the monarch's portrait|Its code is GBP"],
    ["Japanese yen", "yen|jpy", 1, "The yen (¥) is Japan's currency.", "Its 5 and 50 coins have holes in the middle|There is no smaller unit in everyday use|Its symbol is ¥|It is used in Tokyo|Its code is JPY"],
    ["Chinese yuan", "yuan|renminbi|rmb|cny", 1, "The renminbi, counted in yuan, is China's currency.", "Its official name means 'the people's currency'|Its banknotes show Mao Zedong|One unit is divided into 10 jiao|It is used in Beijing and Shanghai|Its code is CNY"],
    ["Indian rupee", "inr|rupee", 1, "The Indian rupee (₹) got its own symbol in 2010.", "Its symbol was chosen in a design competition in 2010|One unit is divided into 100 paise|Its banknotes show Mahatma Gandhi|Its symbol is ₹|Its code is INR"],
    ["Swiss franc", "chf", 2, "The Swiss franc is famous as a safe-haven currency.", "It is seen as one of the safest currencies in the world|Liechtenstein uses it too|Its code comes from the Latin name 'Confoederatio Helvetica'|It is used in Zurich and Geneva|Its code is CHF"],
    ["Russian ruble", "ruble|rouble|rub|russian rouble", 2, "The ruble (₽) is Russia's currency.", "It is one of the oldest currencies in Europe|One unit is 100 kopecks|Its symbol ₽ was adopted in 2013|It is used in Moscow|Its code is RUB"],
    ["South Korean won", "won|krw|korean won", 2, "The won (₩) is South Korea's currency.", "Its symbol is a W with two lines through it|Its 50,000 note shows the artist Shin Saimdang|Its northern neighbour has a currency with the same name|It is used in Seoul|Its code is KRW"],
    ["Brazilian real", "real|brl|reais", 2, "The real (R$) was introduced in 1994.", "It was introduced in 1994 to stop runaway inflation|Its plural is 'reais'|Its banknotes show animals like the jaguar and the golden lion tamarin|It is used in Rio de Janeiro and São Paulo|Its code is BRL"],
    ["Mexican peso", "mxn", 2, "The Mexican peso is the most traded currency in Latin America.", "It is the most traded currency in Latin America|The $ sign was first used for this family of currencies|Its banknotes show Frida Kahlo and Diego Rivera (on an older note)|It is used in Cancún and Guadalajara|Its code is MXN"],
    ["South African rand", "rand|zar", 2, "The rand is named after the Witwatersrand gold ridge.", "It is named after a ridge where gold was found|Its notes show Nelson Mandela and the 'Big Five' animals|A famous gold coin shares part of its name|It is used in Johannesburg and Cape Town|Its code is ZAR"],
    ["Australian dollar", "aud|aussie dollar", 2, "Australia pioneered polymer banknotes.", "Its country pioneered plastic (polymer) banknotes in 1988|Kiribati, Nauru and Tuvalu use it too|Its coins show the kangaroo and the platypus|It is used in Sydney and Melbourne|Its code is AUD"],
    ["Canadian dollar", "cad|loonie", 2, "The Canadian dollar's coin is nicknamed the loonie.", "Its one-unit coin is nicknamed the 'loonie' after a bird|Its two-unit coin is the 'toonie'|Its notes have a maple leaf|It is used in Toronto and Vancouver|Its code is CAD"],
    ["Turkish lira", "lira|try", 2, "The Turkish lira (₺) dropped six zeros in 2005.", "Six zeros were removed from it in 2005|Its symbol ₺ looks like an anchor|Its banknotes show Atatürk|It is used in Istanbul|Its code is TRY"],
    ["Thai baht", "baht|thb", 2, "The baht (฿) is Thailand's currency.", "Its symbol is a B with a line through it|One unit is 100 satang|Its notes show the king|It is used in Bangkok and Phuket|Its code is THB"],
    ["Indonesian rupiah", "rupiah|idr", 2, "The rupiah is Indonesia's currency.", "Its banknotes go up to 100,000|Its abbreviation is Rp|Its name comes from the Sanskrit word for silver|It is used in Jakarta and Bali|Its code is IDR"],
    ["Saudi riyal", "sar", 3, "The Saudi riyal is pegged to the US dollar.", "It is pegged to the US dollar at 3.75|One unit is 100 halalas|Its notes show the kings of its country|It is used in Riyadh and Mecca|Its code is SAR"],
    ["UAE dirham", "dirham|aed|emirati dirham", 2, "The dirham is the currency of the United Arab Emirates.", "It has been pegged to the US dollar since 1997|One unit is 100 fils|Its notes show falcons and oryx|It is used in Dubai and Abu Dhabi|Its code is AED"],
    ["Bangladeshi taka", "taka|bdt", 2, "The taka (৳) is Bangladesh's currency.", "Its name simply means 'money' in Bengali|One unit is 100 poisha|Its symbol is ৳|It is used in Dhaka|Its code is BDT"],
    ["Pakistani rupee", "pkr", 2, "The Pakistani rupee is Pakistan's currency.", "Its notes show Muhammad Ali Jinnah|It replaced the currency of British India in 1948|It is used in Karachi and Lahore|Its code is PKR"],
    ["Sri Lankan rupee", "lkr", 3, "The Sri Lankan rupee is Sri Lanka's currency.", "Its notes show birds, butterflies and dancers|Its island was called Ceylon when it was introduced|It is used in Colombo and Kandy|Its code is LKR"],
    ["Nepalese rupee", "npr|nepali rupee", 3, "The Nepalese rupee is Nepal's currency.", "Its notes show Mount Everest|It is pegged to its big neighbour's currency|It is used in Kathmandu|Its code is NPR"],
    ["Vietnamese dong", "dong|vnd", 2, "The dong (₫) is Vietnam's currency.", "Its largest note is 500,000|Its notes are made of polymer and show Ho Chi Minh|Its symbol is ₫|It is used in Hanoi and Ho Chi Minh City|Its code is VND"],
    ["Philippine peso", "php|piso", 2, "The Philippine peso (₱) is the Philippines' currency.", "In the local language it is called 'piso'|Its symbol is a P with two lines|One unit is 100 sentimo|It is used in Manila and Cebu|Its code is PHP"],
    ["Malaysian ringgit", "ringgit|myr", 2, "The ringgit's name means 'jagged'.", "Its name means 'jagged', after the edges of old Spanish silver coins|Its abbreviation is RM|One unit is 100 sen|It is used in Kuala Lumpur|Its code is MYR"],
    ["Singapore dollar", "sgd", 2, "The Singapore dollar is the city-state's currency.", "Brunei's currency is exchangeable with it one-to-one|Its notes show the country's first president, Yusof Ishak|It is used around Marina Bay|Its code is SGD"],
    ["Egyptian pound", "egp", 2, "The Egyptian pound is Egypt's currency.", "One unit is 100 piastres|Its notes show mosques and pharaonic temples|It is used in Cairo and Alexandria|Its code is EGP"],
    ["Nigerian naira", "naira|ngn", 2, "The naira (₦) replaced the pound in 1973.", "It replaced the pound in 1973|Its symbol is an N with two lines|One unit is 100 kobo|It is used in Lagos and Abuja|Its code is NGN"],
    ["Kenyan shilling", "kes", 3, "The Kenyan shilling is Kenya's currency.", "Its abbreviation is KSh|Its newer notes show the Big Five animals|It is used in Nairobi and Mombasa|Its code is KES"],
    ["Ghanaian cedi", "cedi|ghs", 3, "The cedi's name comes from the cowry shell.", "Its name comes from the Akan word for cowry shell|One unit is 100 pesewas|It is used in Accra and Kumasi|Its code is GHS"],
    ["Moroccan dirham", "mad", 3, "The Moroccan dirham is Morocco's currency.", "One unit is 100 santimat|Its notes show the king|It is used in Marrakech and Casablanca|Its code is MAD"],
    ["Ethiopian birr", "birr|etb", 3, "The birr is Ethiopia's currency.", "Its name means 'silver' in Amharic|One unit is 100 santim|It is used in Addis Ababa|Its code is ETB"],
    ["Israeli new shekel", "shekel|ils|new shekel|israeli shekel", 2, "The shekel (₪) is Israel's currency.", "Its name comes from an ancient unit of weight|One unit is 100 agorot|Its symbol is ₪|It is used in Tel Aviv|Its code is ILS"],
    ["Polish złoty", "zloty|pln|polish zloty", 2, "The złoty's name means 'golden'.", "Its name means 'golden'|One unit is 100 groszy|It is used in Warsaw and Kraków|Its code is PLN"],
    ["Swedish krona", "sek", 2, "The Swedish krona means 'crown'.", "Its name means 'crown'|Its notes show Astrid Lindgren and Greta Garbo|It is used in Stockholm|Its code is SEK"],
    ["Norwegian krone", "nok", 3, "The Norwegian krone is Norway's currency.", "Its name means 'crown'|Its newer notes show the sea and waves|It is used in Oslo and Bergen|Its code is NOK"],
    ["Danish krone", "dkk", 3, "The Danish krone is pegged to the euro.", "Its name means 'crown'|It is pegged closely to the euro|The Faroe Islands and Greenland use it|It is used in Copenhagen|Its code is DKK"],
    ["Icelandic króna", "kronur|isk|icelandic krona", 3, "The Icelandic króna is Iceland's currency.", "Its coins show sea creatures like cod and dolphins|Its name means 'crown'|It is used in Reykjavík|Its code is ISK"],
    ["Czech koruna", "koruna|czk", 3, "The Czech koruna is Czechia's currency.", "Its name means 'crown'|It is used in Prague and Brno|Its code is CZK"],
    ["Hungarian forint", "forint|huf", 3, "The forint is named after the gold florin of Florence.", "It is named after the gold florin coin of Florence|It was introduced in 1946 after record hyperinflation|It is used in Budapest|Its code is HUF"],
    ["Romanian leu", "ron", 3, "The leu's name means 'lion'.", "Its name means 'lion'|Its plural is 'lei'|It is used in Bucharest|Its code is RON"],
    ["Ukrainian hryvnia", "hryvnia|uah", 3, "The hryvnia (₴) is Ukraine's currency.", "It is named after a medieval silver bar|Its symbol is ₴|It is used in Kyiv and Lviv|Its code is UAH"],
    ["Argentine peso", "ars", 3, "The Argentine peso is Argentina's currency.", "It has been hit by high inflation many times|Its newer notes show native animals|It is used in Buenos Aires|Its code is ARS"],
    ["Chilean peso", "clp", 3, "The Chilean peso is Chile's currency.", "Its notes are made of polymer|It has no coins below 10 in common use|It is used in Santiago|Its code is CLP"],
    ["Colombian peso", "cop", 3, "The Colombian peso is Colombia's currency.", "Its notes show writer Gabriel García Márquez|It is used in Bogotá and Medellín|Its code is COP"],
    ["Peruvian sol", "sol|pen|nuevo sol", 3, "The sol's name means 'sun'.", "Its name means 'sun', after the Inca sun god|Its abbreviation is S/|It is used in Lima and Cusco|Its code is PEN"],
    ["Venezuelan bolívar", "bolivar|ves", 3, "The bolívar is named after Simón Bolívar.", "It is named after a South American liberator|Zeros have been removed from it several times|It is used in Caracas|Its code is VES"],
    ["New Zealand dollar", "nzd|kiwi", 2, "The New Zealand dollar is nicknamed the kiwi.", "Its nickname comes from the bird on its one-unit coin|Its notes show Sir Edmund Hillary|It is used in Auckland|Its code is NZD"],
    ["Kuwaiti dinar", "kwd", 3, "The Kuwaiti dinar is the world's highest-valued currency unit.", "It is the highest-valued currency unit in the world|One unit is 1,000 fils|It is used in a small Gulf country|Its code is KWD"],
    ["CFA franc", "cfa|west african cfa franc|central african cfa franc|xof|xaf", 3, "Two CFA francs are used by 14 African countries.", "Two versions of it are used by 14 countries|It is pegged to the euro|It is used in Senegal, Côte d'Ivoire and Cameroon|Its codes are XOF and XAF"],
    ["East Caribbean dollar", "xcd", 4, "The East Caribbean dollar is shared by eight Caribbean members of one central bank.", "It is shared by eight island states and territories|It is pegged to the American currency|It is used in Saint Lucia and Grenada|Its code is XCD"],
    ["Bhutanese ngultrum", "ngultrum|btn", 4, "The ngultrum is pegged to the Indian rupee.", "It is pegged one-to-one to the Indian rupee|One unit is 100 chhertum|It is used in Thimphu|Its code is BTN"],
    ["Maldivian rufiyaa", "rufiyaa|mvr", 4, "The rufiyaa is the Maldives' currency.", "One unit is 100 laari|Its notes show sea turtles and dhoni boats|It is used in Malé|Its code is MVR"],
    ["Mongolian tögrög", "togrog|tugrik|mnt|tugrug", 4, "The tögrög is Mongolia's currency.", "Its notes show Genghis Khan|Its symbol is ₮|It is used in Ulaanbaatar|Its code is MNT"],
    ["Botswana pula", "pula|bwp", 4, "Pula means 'rain' in Setswana.", "Its name means 'rain', which is precious in a dry country|One unit is 100 thebe|It is used in Gaborone|Its code is BWP"],
    ["Afghan afghani", "afghani|afn", 4, "The afghani is Afghanistan's currency.", "Its name is the same as the people of its country|It is used in Kabul|Its code is AFN"],
    ["Kazakhstani tenge", "tenge|kzt", 4, "The tenge is Kazakhstan's currency.", "It was introduced in 1993|Its symbol ₸ looks like a T with a bar on top|It is used in Almaty and Astana|Its code is KZT"],
    ["Papua New Guinean kina", "kina|pgk", 4, "The kina is named after a pearl shell.", "It is named after a pearl shell once used as money|One unit is 100 toea|It is used in Port Moresby|Its code is PGK"],
    ["Guatemalan quetzal", "quetzal|gtq", 4, "The quetzal is named after the national bird.", "It is named after a colourful national bird|Mayan people once used the bird's feathers as money|It is used in Guatemala City|Its code is GTQ"],
    ["Costa Rican colón", "colon|crc", 4, "The colón is named after Christopher Columbus.", "It is named after Christopher Columbus|Its notes show animals like sloths and sharks|It is used in San José|Its code is CRC"],
    ["Paraguayan guaraní", "guarani|pyg", 4, "The guaraní is named after the Guaraní people.", "It is named after an indigenous people|It has had no coins below 50 for decades|It is used in Asunción|Its code is PYG"]
  ], { ask: "Guess the Currency!" });

  add("culture", "landmarks", "Famous Landmarks", "🗼", [
    ["Eiffel Tower", "eiffel|la tour eiffel|tour eiffel", 1, "The Eiffel Tower in Paris, built for the 1889 World's Fair.", "It was built for the 1889 World's Fair|It was meant to stand for only 20 years|It is made of wrought iron and is about 330 metres tall|It stands on the Champ de Mars|It is the most famous symbol of Paris"],
    ["Taj Mahal", "taj", 1, "The Taj Mahal in Agra, built by Shah Jahan for Mumtaz Mahal.", "It is a white marble tomb|A Mughal emperor built it in memory of his wife|It took about 20 years to build, finishing around 1653|It stands on the bank of the Yamuna river|It is in Agra, India"],
    ["Great Wall of China", "great wall|the great wall", 1, "The Great Wall, a series of fortifications across northern China.", "It was built and rebuilt over about 2,000 years|It was built to keep out northern invaders|Its total length is more than 20,000 km|Most of what tourists see today was built by the Ming dynasty|It snakes across the north of its country"],
    ["Statue of Liberty", "lady liberty|liberty enlightening the world", 1, "The Statue of Liberty, a gift from France to the USA.", "It was a gift from France in 1886|Gustave Eiffel designed its inner frame|It is made of copper that turned green|It holds a torch and a tablet|It stands in New York Harbor"],
    ["Colosseum", "coliseum|flavian amphitheatre|colosseo", 1, "The Colosseum in Rome, an ancient amphitheatre.", "It was finished in 80 AD|It could hold around 50,000 people|Gladiators fought here|It is an oval amphitheatre|It is in the centre of Rome"],
    ["Leaning Tower of Pisa", "tower of pisa|leaning tower|pisa tower", 1, "The tilted bell tower of Pisa Cathedral.", "It is a bell tower|It started to tilt while it was still being built in the 1170s|Engineers stopped it from tilting further in 2001|Tourists love pretending to hold it up|It is in Tuscany, Italy"],
    ["Big Ben", "elizabeth tower|the great bell", 1, "Big Ben is the great bell in the Elizabeth Tower at Westminster.", "Its name officially belongs to a giant bell|The tower was renamed in 2012 for a queen's jubilee|It is part of the Palace of Westminster|Its clock faces are 7 metres across|It is in London"],
    ["Stonehenge", "", 1, "Stonehenge, a prehistoric stone circle in Wiltshire, England.", "It was built about 5,000 years ago|Some of its stones came from Wales, over 200 km away|The sun rises in line with it on the summer solstice|It is a ring of standing stones|It is in Wiltshire, England"],
    ["Sydney Opera House", "opera house", 1, "The Sydney Opera House, opened in 1973.", "Its Danish architect Jørn Utzon won a design competition|It opened in 1973|Its roof looks like sails or shells|It sits on Bennelong Point|It sits on a harbour in Australia"],
    ["Christ the Redeemer", "cristo redentor|christ statue", 1, "Christ the Redeemer, the statue above Rio de Janeiro.", "It was finished in 1931|It is made of reinforced concrete and soapstone|Its arms stretch about 28 metres|It stands on Corcovado mountain|It looks over Rio de Janeiro"],
    ["Machu Picchu", "machupicchu", 1, "Machu Picchu, a 15th-century Inca citadel in Peru.", "It was built in the 15th century|The outside world learned of it in 1911|It sits on a mountain ridge 2,430 metres high|It was built by the Inca|It is in Peru, near Cusco"],
    ["Pyramids of Giza", "great pyramid|great pyramid of giza|giza pyramids|pyramids", 1, "The Giza pyramids, tombs of the pharaohs Khufu, Khafre and Menkaure.", "They are the only Ancient Wonder still standing|The biggest was built for the pharaoh Khufu|The biggest was the tallest structure on Earth for nearly 4,000 years|A great sphinx guards them|They are near Cairo"],
    ["Great Sphinx", "sphinx|great sphinx of giza|sphinx of giza", 2, "The Great Sphinx of Giza.", "It has the body of a lion and the head of a human|It was carved from one huge piece of limestone|Its nose is missing|It sits beside the pyramids|It is in Giza, Egypt"],
    ["Petra", "rose city", 2, "Petra, the rock-cut city of the Nabataeans in Jordan.", "It was built by the Nabataeans|Its buildings are carved straight into rock|It is called the 'Rose City' because of its pink stone|Its Treasury appeared in an Indiana Jones film|It is in Jordan"],
    ["Angkor Wat", "angkor", 2, "Angkor Wat, the largest religious monument in the world.", "It is the largest religious monument in the world|It was built in the 12th century, first as a Hindu temple|It appears on its country's flag|It is surrounded by a wide moat|It is near Siem Reap, Cambodia"],
    ["Burj Khalifa", "burj dubai", 1, "The Burj Khalifa in Dubai, the world's tallest building.", "It opened in 2010|It is about 828 metres tall|Tom Cruise climbed its outside in a Mission: Impossible film|It is the tallest building in the world|It is in Dubai"],
    ["Mount Rushmore", "rushmore", 2, "Mount Rushmore, carved with four US presidents.", "It took 14 years to carve|Each face is about 18 metres tall|It shows Washington, Jefferson, Roosevelt and Lincoln|It is carved into a granite mountain|It is in South Dakota"],
    ["Golden Gate Bridge", "golden gate", 1, "The Golden Gate Bridge in San Francisco.", "It opened in 1937|It was the longest suspension bridge in the world at the time|Its colour is called 'International Orange'|It is often hidden in fog|It is in San Francisco"],
    ["Sagrada Família", "sagrada familia|la sagrada familia", 2, "Antoni Gaudí's basilica in Barcelona, under construction since 1882.", "Work on it began in 1882 and it is still being built|Its architect died in 1926 after being hit by a tram|Its architect was Antoni Gaudí|It is a huge basilica with tall spires|It is in Barcelona"],
    ["Parthenon", "acropolis|the acropolis", 2, "The Parthenon, a temple to Athena on the Acropolis.", "It was finished in 438 BC|It was dedicated to the goddess Athena|It is a marble temple with many columns|It sits on a rocky hill called the Acropolis|It is in Athens"],
    ["Neuschwanstein Castle", "neuschwanstein", 2, "Neuschwanstein, the fairy-tale castle of King Ludwig II.", "It was built for a king nicknamed 'the fairy-tale king'|It inspired the castle in Disney's 'Sleeping Beauty'|It sits on a hill in the Alps|Ludwig II of Bavaria built it|It is in southern Germany"],
    ["Brandenburg Gate", "brandenburger tor", 2, "The Brandenburg Gate in Berlin.", "It was built in the 1790s|It has a chariot pulled by four horses on top|It became a symbol of the reunification of a divided country|It stood next to the Berlin Wall|It is in Berlin"],
    ["Kremlin", "moscow kremlin", 2, "The Kremlin, the fortified seat of the Russian government.", "Its name means 'fortress inside a city'|It has red brick walls and 20 towers|It is the official home of the president|It stands beside Red Square|It is in Moscow"],
    ["Saint Basil's Cathedral", "st basils cathedral|st basil's|saint basils", 2, "St Basil's Cathedral on Red Square, Moscow.", "It was built in the 1550s for Ivan the Terrible|Its domes look like colourful onions|It is now a museum|It stands on Red Square|It is in Moscow"],
    ["Tower Bridge", "", 1, "Tower Bridge in London, opened in 1894.", "It opened in 1894|Its middle sections lift up to let ships through|It is often mistaken for 'London Bridge'|It crosses the River Thames|It stands next to the castle that holds the Crown Jewels"],
    ["Hagia Sophia", "aya sofya|ayasofya|haghia sophia", 2, "Hagia Sophia in Istanbul, built in 537 AD.", "It was finished in 537 AD|It has been a cathedral, a mosque and a museum|Its giant dome seems to float|It is a mosque again since 2020|It is in Istanbul"],
    ["Chichén Itzá", "chichen itza|el castillo", 2, "Chichén Itzá, a Mayan city in Mexico.", "It was a great Mayan city|Its main pyramid is called El Castillo|At the equinox a shadow 'snake' slides down its steps|It is one of the New Seven Wonders|It is on the Yucatán Peninsula, Mexico"],
    ["Moai", "easter island statues|easter island heads|moai statues", 2, "The Moai, giant stone heads on Easter Island.", "There are almost 1,000 of them|They were carved by the Rapa Nui people|Most of them have bodies buried underground|They are giant stone heads|They are on Easter Island, Chile"],
    ["Alhambra", "the alhambra", 3, "The Alhambra, a Moorish palace and fortress in Granada.", "Its name means 'the red one'|Moorish rulers built it|It is famous for its Court of the Lions|It is a palace and fortress|It is in Granada, Spain"],
    ["Louvre", "louvre museum|musee du louvre", 1, "The Louvre in Paris, the world's most-visited museum.", "It was once a royal palace|It is the most-visited museum in the world|It has a glass pyramid entrance|It holds the Mona Lisa|It is in Paris"],
    ["Mont-Saint-Michel", "mont saint michel", 3, "Mont-Saint-Michel, an island abbey in Normandy.", "It is an abbey on a rocky island|High tides used to cut it off from the land|It is in Normandy|It is in France"],
    ["Palace of Versailles", "versailles|chateau de versailles", 2, "The Palace of Versailles, home of Louis XIV.", "It has a famous Hall of Mirrors|A treaty ending World War I was signed here|Louis XIV, the Sun King, lived here|It is just outside Paris"],
    ["Tower of London", "", 2, "The Tower of London, a castle that holds the Crown Jewels.", "It was founded by William the Conqueror|It has been a prison, a zoo and a treasury|Ravens are kept here by legend|It holds the Crown Jewels|It is on the Thames in England's capital"],
    ["Buckingham Palace", "buckingham", 1, "Buckingham Palace, the London home of the British monarch.", "It has 775 rooms|Its guards wear red tunics and bearskin hats|The Changing of the Guard happens here|It is the London home of the British monarch"],
    ["Forbidden City", "palace museum|zijin cheng", 2, "The Forbidden City, the imperial palace in Beijing.", "It was home to 24 emperors|Ordinary people could not enter for 500 years|It has about 9,000 rooms|It is now the Palace Museum|It is in Beijing"],
    ["Terracotta Army", "terracotta warriors", 2, "The Terracotta Army of the first Qin emperor.", "Farmers found it while digging a well in 1974|It has over 8,000 life-sized figures|Each soldier has a different face|It guards the tomb of China's first emperor|It is near Xi'an"],
    ["Potala Palace", "potala", 3, "The Potala Palace in Lhasa, once home of the Dalai Lama.", "It sits 3,700 metres above sea level|It has red and white walls|It was the winter home of the Dalai Lama|It is in Lhasa, Tibet"],
    ["Gateway of India", "", 1, "The Gateway of India in Mumbai, built in 1924.", "It was built to welcome King George V|It was finished in 1924|It is a basalt arch facing the sea|It stands opposite the Taj Mahal Palace hotel|It is in Mumbai"],
    ["Qutub Minar", "qutb minar|qutab minar", 2, "Qutub Minar, a 73-metre minaret in Delhi.", "It is a 73-metre minaret|Work on it began around 1199|It is made of red sandstone and marble|An iron pillar that doesn't rust stands nearby|It is in Delhi"],
    ["Charminar", "char minar", 2, "Charminar, the 1591 monument with four minarets in Hyderabad.", "It was built in 1591|Its name means 'four minarets'|It is surrounded by bangle and pearl markets|It is the symbol of Hyderabad"],
    ["Golden Temple", "harmandir sahib|darbar sahib", 1, "The Golden Temple (Harmandir Sahib) in Amritsar.", "Its kitchen feeds up to 100,000 people a day for free|It is the holiest shrine in Sikhism|It is covered in gold|It stands in a sacred pool|It is in Amritsar"],
    ["Mysore Palace", "amba vilas palace|mysuru palace", 2, "Mysore Palace, home of the Wadiyar kings.", "It was home to the Wadiyar dynasty|It is lit up by nearly 100,000 bulbs on Sundays and festivals|It is the centre of the Dasara festival|It is in Karnataka"],
    ["Hawa Mahal", "palace of winds|palace of the winds", 2, "Hawa Mahal, the 'Palace of Winds' in Jaipur.", "Its name means 'Palace of Winds'|It has 953 small windows|Royal women watched street festivals from it unseen|It is made of pink sandstone|It is in Jaipur"],
    ["India Gate", "", 1, "India Gate, the war memorial in New Delhi.", "It is a war memorial for soldiers of World War I|It is 42 metres tall|It was designed by Edwin Lutyens|It stands at the end of Kartavya Path|It is in New Delhi"],
    ["Meenakshi Temple", "meenakshi amman temple|madurai meenakshi temple", 2, "The Meenakshi Amman Temple in Madurai.", "It has 14 colourful gopurams (gateway towers)|Its towers are covered in thousands of painted figures|It is dedicated to a form of the goddess Parvati|It is in Madurai, Tamil Nadu"],
    ["Statue of Unity", "", 2, "The Statue of Unity, the world's tallest statue, of Sardar Patel.", "It is the tallest statue in the world at 182 metres|It opened in 2018|It shows the 'Iron Man of India', Sardar Vallabhbhai Patel|It is in Gujarat"],
    ["Konark Sun Temple", "konark|sun temple", 3, "The 13th-century Sun Temple at Konark.", "It was built in the 13th century|It is shaped like a giant chariot with 24 stone wheels|It is dedicated to the sun god Surya|It appears on the Indian 10-rupee note|It is in Odisha"],
    ["Sigiriya", "lion rock", 3, "Sigiriya, the 'Lion Rock' fortress in Sri Lanka.", "It is a palace built on top of a 180-metre rock|Its entrance was through a giant lion's paws|Its walls have ancient paintings of women|It is in Sri Lanka"],
    ["Borobudur", "", 3, "Borobudur, the world's largest Buddhist temple, in Java.", "It is the largest Buddhist temple in the world|It was built in the 9th century|It has 72 bell-shaped stupas|It is on the island of Java, Indonesia"],
    ["Petronas Towers", "petronas twin towers|twin towers", 2, "The Petronas Twin Towers in Kuala Lumpur.", "They were the tallest buildings in the world from 1998 to 2004|A sky bridge links them|They are named after an oil company|They are in Kuala Lumpur"],
    ["Marina Bay Sands", "", 2, "Marina Bay Sands in Singapore.", "Its three towers are topped by a giant 'ship'|Its rooftop has a famous infinity pool|It opened in 2010|It is in Singapore"],
    ["Shwedagon Pagoda", "shwedagon", 3, "The Shwedagon Pagoda in Yangon.", "It is covered in gold plates|Its tip has thousands of diamonds|It is the most sacred Buddhist pagoda in its country|It is in Yangon, Myanmar"],
    ["Fushimi Inari Shrine", "fushimi inari|fushimi inari taisha", 3, "Fushimi Inari, the shrine of thousands of orange torii gates.", "It has thousands of bright orange torii gates|It honours the fox-messenger god of rice|Its paths go up a whole mountain|It is in Kyoto, Japan"],
    ["Kinkaku-ji", "golden pavilion|kinkakuji", 3, "Kinkaku-ji, the Golden Pavilion in Kyoto.", "Its top two floors are covered in gold leaf|It was burned by a monk in 1950 and rebuilt|It is reflected in a mirror pond|It is in Kyoto"],
    ["Empire State Building", "empire state", 1, "The Empire State Building in New York City.", "It was finished in 1931 in just over a year|It was the tallest building in the world for nearly 40 years|King Kong climbed it in a classic film|It is in Manhattan, New York"],
    ["Hollywood Sign", "hollywood", 2, "The Hollywood Sign in Los Angeles.", "It was built in 1923 to advertise houses|It originally read 'Hollywoodland'|Each letter is about 14 metres tall|It is in the hills of Los Angeles"],
    ["CN Tower", "", 2, "The CN Tower in Toronto.", "It was the world's tallest free-standing structure for 32 years|It has a glass floor and an EdgeWalk|It is 553 metres tall|It is in Toronto"],
    ["Atomium", "", 3, "The Atomium in Brussels, built for Expo 58.", "It was built for the 1958 World's Fair|It looks like an iron crystal magnified 165 billion times|It has nine giant spheres|It is in Brussels"],
    ["Trevi Fountain", "fontana di trevi|trevi", 2, "The Trevi Fountain in Rome.", "It was finished in 1762|About 3,000 euros in coins are thrown into it every day|Throwing a coin is said to bring you back to the city|It is in Rome"],
    ["St. Peter's Basilica", "st peters basilica|saint peters basilica|st peter's", 2, "St Peter's Basilica in Vatican City.", "Michelangelo designed its great dome|It is one of the largest churches in the world|It is said to be built over the tomb of Saint Peter|It is in Vatican City"],
    ["Arc de Triomphe", "arc de triomphe de l'etoile", 2, "The Arc de Triomphe in Paris.", "Napoleon ordered it in 1806|It honours those who fought for France|The Tomb of the Unknown Soldier lies beneath it|It stands at the top of the Champs-Élysées"],
    ["Sheikh Zayed Grand Mosque", "sheikh zayed mosque", 3, "The Sheikh Zayed Grand Mosque in Abu Dhabi.", "It has 82 white domes|It has one of the largest hand-knotted carpets in the world|It can hold more than 40,000 worshippers|It is in Abu Dhabi"],
    ["Abu Simbel", "abu simbel temples", 3, "The Abu Simbel temples of Ramesses II.", "It has four giant seated statues of a pharaoh|It was moved in the 1960s to escape a dam's lake|It was built by Ramesses II|It is in southern Egypt"],
    ["Himeji Castle", "white heron castle|himeji", 3, "Himeji Castle, the 'White Heron Castle'.", "It is called the 'White Heron Castle'|It survived wars, earthquakes and bombing|It has a maze of paths to confuse attackers|It is in Hyogo, Japan"],
    ["Gyeongbokgung", "gyeongbokgung palace|gyeongbok palace", 3, "Gyeongbokgung, the main royal palace of the Joseon dynasty.", "It was the main palace of the Joseon dynasty|It was first built in 1395|Visitors wearing hanbok get in free|It is in Seoul"],
    ["Lotus Temple", "", 2, "The Lotus Temple in Delhi, a Baháʼí House of Worship.", "It is shaped like a flower with 27 marble petals|It is a Baháʼí House of Worship open to all faiths|It opened in 1986|It is in Delhi"],
    ["Victoria Memorial", "", 3, "The Victoria Memorial in Kolkata.", "It is built of white Makrana marble|It honours a British queen|It was finished in 1921|It is in Kolkata"]
  ], { ask: "Guess the Landmark!" });

  add("culture", "foods", "Traditional Foods", "🍜", [
    ["Sushi", "", 1, "Sushi — vinegared rice with fish, from Japan.", "It is made with vinegared rice|It is often topped or rolled with raw fish|It is served with wasabi and pickled ginger|Nigiri and maki are types of it|It comes from Japan"],
    ["Pizza", "", 1, "Pizza — from Naples, Italy.", "It is baked very hot, often in a wood-fired oven|The Margherita version honours a queen|It was born in Naples|It is a flat bread topped with tomato and cheese"],
    ["Paella", "", 1, "Paella — a rice dish from Valencia, Spain.", "It is cooked in a wide, shallow pan|Its crispy bottom layer is called socarrat|It is coloured yellow with saffron|It comes from Valencia, Spain"],
    ["Tacos", "taco", 1, "Tacos — folded tortillas from Mexico.", "Al pastor is a popular kind|They are eaten with your hands|They are folded tortillas with a filling|They come from Mexico"],
    ["Croissant", "croissants", 1, "The croissant, a flaky French pastry.", "It is made with many thin layers of butter and dough|Its shape is like a crescent moon|It is a breakfast pastry|It is most associated with France"],
    ["Biryani", "biriyani", 1, "Biryani — layered spiced rice with meat, from South Asia.", "It is cooked in layers|Hyderabadi and Lucknowi are famous kinds|It is rice cooked with spices and meat|It is popular across India and Pakistan"],
    ["Masala Dosa", "dosa", 1, "Masala dosa — a crispy fermented crepe from South India.", "It is made from fermented rice and lentil batter|It is filled with spiced potato|It is served with sambar and chutney|It is a South Indian breakfast"],
    ["Kimchi", "", 1, "Kimchi — fermented vegetables from Korea.", "It is fermented|It is usually made with napa cabbage and chilli|Families make big batches in late autumn|It comes from Korea"],
    ["Ramen", "", 1, "Ramen — Japanese noodle soup.", "Its broth can be shoyu, miso, salt or tonkotsu|It is often topped with a soft-boiled egg|It is a noodle soup|It is hugely popular in Japan"],
    ["Pho", "pho bo", 2, "Pho — Vietnamese beef or chicken noodle soup.", "It is a noodle soup with clear broth|It is served with fresh herbs, lime and bean sprouts|It uses flat rice noodles|It comes from Vietnam"],
    ["Pad Thai", "phad thai", 1, "Pad thai — stir-fried rice noodles from Thailand.", "It is a stir-fried noodle dish|It is flavoured with tamarind and fish sauce|It is topped with crushed peanuts and lime|It is from Thailand"],
    ["Fish and Chips", "fish n chips|fish & chips", 1, "Fish and chips — Britain's classic takeaway.", "It was traditionally wrapped in newspaper|It is often served with mushy peas|It is battered fish with fried potatoes|It is a British classic"],
    ["Poutine", "", 2, "Poutine — fries with cheese curds and gravy, from Quebec.", "It comes from Quebec|It uses squeaky cheese curds|It is fries covered in gravy|It is a Canadian favourite"],
    ["Feijoada", "", 3, "Feijoada — Brazil's black bean and pork stew.", "It is a stew of black beans and pork|It is traditionally eaten on Wednesdays or Saturdays|It is served with rice and orange slices|It is a national dish of Brazil"],
    ["Ceviche", "cebiche|seviche", 2, "Ceviche — raw fish cured in lime juice, from Peru.", "The fish is 'cooked' by citrus juice instead of heat|It is made with raw fish and lime juice|It is served with sweet potato and corn|It is a national dish of Peru"],
    ["Goulash", "gulyas|gulyás", 2, "Goulash — Hungarian paprika stew.", "Herdsmen first cooked it in kettles|It is a stew of beef and vegetables|It is flavoured with paprika|It comes from Hungary"],
    ["Moussaka", "", 2, "Moussaka — layered aubergine and meat bake from Greece.", "It is a baked layered dish|It uses aubergine and minced meat|It has a creamy béchamel top|It is famous in Greece"],
    ["Borscht", "borsch|borshch", 2, "Borscht — beetroot soup from Eastern Europe.", "It is often served with sour cream|It is bright red|It is a beetroot soup|It is especially linked to Ukraine"],
    ["Pierogi", "pierogies|perogies", 2, "Pierogi — Polish filled dumplings.", "They are filled dumplings|Popular fillings are potato and cheese|They can be boiled then fried with onions|They are a Polish favourite"],
    ["Falafel", "", 1, "Falafel — fried balls of chickpeas or fava beans.", "It is a vegetarian street food|It is often stuffed into pita bread|It is made from ground chickpeas or fava beans|It is fried into balls"],
    ["Hummus", "houmous|humus", 1, "Hummus — chickpea and tahini dip from the Middle East.", "It is a dip|It is made with chickpeas, tahini, lemon and garlic|It is eaten with pita bread|It is popular across the Middle East"],
    ["Shawarma", "shwarma|shawurma", 1, "Shawarma — meat roasted on a vertical spit.", "Its meat is roasted on a turning vertical spit|It is shaved off in thin slices|It is wrapped in flatbread with garlic sauce|It comes from the Middle East"],
    ["Baklava", "", 2, "Baklava — layered filo pastry with nuts and syrup.", "It is made with many layers of filo pastry|It is filled with chopped nuts|It is soaked in syrup or honey|It is famous in Turkey and Greece"],
    ["Jollof Rice", "jollof", 2, "Jollof rice — West African tomato rice.", "Ghana and Nigeria playfully argue about who makes it best|It is cooked in a tomato and pepper sauce|It is a one-pot rice dish|It is a West African favourite"],
    ["Injera", "", 3, "Injera — Ethiopian sourdough flatbread.", "It is a spongy, sour flatbread|It is made from a tiny grain called teff|It is used as a plate and a spoon|It comes from Ethiopia and Eritrea"],
    ["Couscous", "kuskus", 2, "Couscous — North African steamed semolina.", "It is made from tiny balls of semolina|It is steamed, traditionally in a couscoussier|It is served with stew and vegetables|It is a North African staple"],
    ["Tagine", "tajine", 2, "Tagine — a slow-cooked Moroccan stew and its clay pot.", "It is named after the clay pot it is cooked in|The pot has a cone-shaped lid|It often mixes meat with dried fruit|It is a Moroccan dish"],
    ["Koshari", "kushari|koshary", 3, "Koshari — Egypt's rice, lentil and pasta dish.", "It mixes rice, lentils and pasta|It is topped with tomato sauce and crispy onions|It is a popular street food in Cairo|It is a national dish of Egypt"],
    ["Bobotie", "", 4, "Bobotie — South Africa's spiced mince bake.", "It is spiced minced meat baked with an egg topping|It often contains raisins|It is served with yellow rice|It is a South African dish"],
    ["Nasi Goreng", "", 2, "Nasi goreng — Indonesian fried rice.", "Its name means 'fried rice'|It is flavoured with sweet soy sauce (kecap manis)|It is often topped with a fried egg|It is a national dish of Indonesia"],
    ["Rendang", "beef rendang", 3, "Rendang — slow-cooked spicy beef from Indonesia.", "It is slow-cooked for hours until almost dry|It is made with coconut milk and spices|It comes from the Minangkabau people|It is from Indonesia"],
    ["Adobo", "chicken adobo|pork adobo", 3, "Adobo — the Philippines' vinegar and soy stew.", "It is cooked in vinegar, soy sauce and garlic|It is usually chicken or pork|It is often called a national dish of the Philippines"],
    ["Dim Sum", "dimsum", 2, "Dim sum — small Cantonese dishes served with tea.", "Its name means 'touch the heart'|It is served in bamboo steamers|Har gow and siu mai are kinds of it|It is a Cantonese tradition"],
    ["Peking Duck", "beijing duck|peking roast duck", 2, "Peking duck — roasted duck from Beijing.", "Its skin is the most prized part|It is eaten wrapped in thin pancakes with spring onion|It is a roasted bird with crispy skin|It comes from Beijing"],
    ["Tom Yum", "tom yum goong|tom yam", 2, "Tom yum — hot and sour Thai soup.", "It is a hot and sour soup|It uses lemongrass, galangal and lime leaves|It often has prawns|It comes from Thailand"],
    ["Bibimbap", "", 2, "Bibimbap — Korean mixed rice.", "Its name means 'mixed rice'|It is topped with vegetables, egg and chilli paste|It can be served in a sizzling stone bowl|It comes from Korea"],
    ["Tempura", "", 2, "Tempura — Japanese battered and fried seafood or vegetables.", "It was introduced by Portuguese traders in the 1500s|It uses a very light, crispy batter|It is usually prawns or vegetables|It is a Japanese dish"],
    ["Fondue", "cheese fondue", 2, "Fondue — Swiss melted cheese pot.", "It is shared from a communal pot|Bread is dipped in it on long forks|It is melted cheese, often with wine|It comes from Switzerland"],
    ["Wiener Schnitzel", "schnitzel", 2, "Wiener schnitzel — breaded veal cutlet from Vienna.", "It is a thin breaded cutlet|It is traditionally made with veal|It is served with a lemon slice|It comes from Vienna, Austria"],
    ["Haggis", "", 3, "Haggis — Scotland's savoury pudding.", "It is a savoury pudding of sheep's offal, oats and spices|It is traditionally cooked in a sheep's stomach|It is eaten on Burns Night|It is a Scottish dish"],
    ["Pavlova", "pav", 3, "Pavlova — meringue dessert named after a ballerina.", "It is named after a Russian ballerina|It is a meringue with a soft centre|It is topped with cream and fruit|Australia and New Zealand both claim it"],
    ["Churros", "churro", 2, "Churros — fried dough sticks from Spain.", "They are long sticks of fried dough|They are dusted with sugar|They are dipped in thick hot chocolate|They are Spanish"],
    ["Tiramisu", "", 2, "Tiramisu — Italian coffee dessert.", "Its name means 'pick me up'|It is made with coffee-soaked ladyfingers|It has layers of mascarpone cream|It is an Italian dessert"],
    ["Risotto", "", 2, "Risotto — creamy Italian rice.", "It is made by slowly adding broth to rice|Arborio is a rice used for it|Saffron gives the Milan version its colour|It is an Italian rice dish"],
    ["Pastel de Nata", "pasteis de nata|portuguese custard tart|custard tart", 3, "Pastel de nata — Portuguese custard tart.", "It was first made by monks in Belém|It has a flaky pastry shell|It is a custard tart with a burnt top|It comes from Portugal"],
    ["Empanada", "empanadas", 2, "Empanadas — stuffed pastries from Spain and Latin America.", "Its name comes from a word meaning 'to wrap in bread'|It is a stuffed pastry folded into a half-moon|It can be baked or fried|It is popular in Argentina and across Latin America"],
    ["Arepa", "arepas", 3, "Arepas — corn cakes from Venezuela and Colombia.", "It is a round cake made from corn flour|It is split open and stuffed|It is eaten at any meal|It comes from Venezuela and Colombia"],
    ["Butter Chicken", "murgh makhani", 1, "Butter chicken — creamy tomato chicken curry from Delhi.", "It was created in a Delhi restaurant in the 1950s|It is tandoori meat in a creamy tomato gravy|It is often eaten with naan|It is an Indian curry"],
    ["Idli", "idly", 1, "Idli — steamed rice cakes from South India.", "It is steamed, not fried|It is made from fermented rice and urad dal batter|It is round and white and fluffy|It is eaten with sambar and chutney"],
    ["Appam", "palappam", 2, "Appam — lacy rice pancake from Kerala.", "It has soft spongy centre and lacy crisp edges|It is made from fermented rice batter and coconut|It is often eaten with stew|It is a Kerala favourite"],
    ["Puttu", "", 3, "Puttu — steamed rice and coconut cylinders from Kerala.", "It is steamed in a cylinder|It has layers of ground rice and grated coconut|It is often eaten with kadala (black chickpea) curry|It is a Kerala breakfast"],
    ["Vada Pav", "vada pao", 2, "Vada pav — Mumbai's potato fritter burger.", "It is called the 'Bombay burger'|It is a spicy potato fritter in a bread bun|It is served with chutney and fried chilli|It is Mumbai's favourite street food"],
    ["Pani Puri", "golgappa|puchka|gol gappa", 1, "Pani puri — crisp shells filled with spicy water.", "It is a hollow crisp ball|It is filled with spicy tangy water and potato|It is called golgappa or puchka in some places|It is an Indian street snack"],
    ["Chole Bhature", "chole bhatura", 2, "Chole bhature — chickpea curry with fried bread.", "It is a spicy chickpea curry|It comes with large puffy fried bread|It is popular in Punjab and Delhi|It is a North Indian dish"],
    ["Momo", "momos", 2, "Momos — Himalayan steamed dumplings.", "They are steamed dumplings|They are served with spicy tomato chutney|They are popular in Tibet and Nepal|They are a Himalayan dish"],
    ["Gulab Jamun", "", 1, "Gulab jamun — syrup-soaked milk balls.", "It is a fried ball made from milk solids|It is soaked in rose-scented sugar syrup|It is a favourite festival sweet|It is popular in India"],
    ["Rasgulla", "rosogolla|rasagola", 2, "Rasgulla — spongy cheese balls in syrup.", "It is a spongy white ball in syrup|It is made from chhena (fresh cheese)|West Bengal and Odisha both claim it|It is an Indian sweet"],
    ["Samosa", "samosas", 1, "Samosa — fried pastry with a spicy filling.", "It is triangle-shaped|It is fried until crispy|It is usually filled with spiced potato and peas|It is a South Asian snack"],
    ["Khachapuri", "", 4, "Khachapuri — Georgia's cheese bread.", "It is a boat-shaped bread|It is filled with melted cheese|One version has an egg and butter on top|It is from Georgia"],
    ["Pelmeni", "", 3, "Pelmeni — Russian meat dumplings.", "They are small meat dumplings|They are traditionally frozen outside in winter|They are served with sour cream|They are Russian"],
    ["Poke", "poke bowl", 3, "Poke — Hawaiian diced raw fish.", "Its name means 'to cut into pieces'|It is diced raw fish, usually tuna|It is often served over rice|It comes from Hawaii"],
    ["Mole", "mole poblano", 3, "Mole — Mexico's rich sauce with chillies and chocolate.", "It is a thick sauce with many ingredients|Some kinds contain chocolate|Puebla and Oaxaca are famous for it|It is a Mexican sauce"],
    ["Guacamole", "guac", 1, "Guacamole — Mexican avocado dip.", "Its name comes from Aztec words for 'avocado sauce'|It is made from mashed avocado, lime and onion|It is eaten with tortilla chips|It comes from Mexico"],
    ["Lasagna", "lasagne", 1, "Lasagna — layered pasta bake.", "It is made with flat sheets of pasta|It has layers of meat sauce and béchamel|It is baked in the oven|It is Italian"],
    ["Crêpe", "crepe|crepes", 2, "Crêpes — thin French pancakes.", "It is very thin|It can be sweet or savoury|It is a speciality of Brittany|It is a French pancake"],
    ["Ratatouille", "", 2, "Ratatouille — Provençal vegetable stew.", "It is a vegetable stew|It uses aubergine, courgette, peppers and tomato|A Pixar film about a rat chef is named after it|It comes from Provence, France"]
  ], { ask: "Guess the Food!" });

  add("culture", "animals", "National Animals", "🐾", [
    ["Bengal tiger", "royal bengal tiger|tiger|bengal", 1, "The Bengal tiger is the national animal of India and Bangladesh.", "It is a big cat|It is a strong swimmer|It lives in the Sundarbans mangroves|It has orange fur with black stripes|It is the national animal of India and Bangladesh"],
    ["Bald eagle", "american eagle", 1, "The bald eagle is the national bird of the USA.", "Despite its name, its head is covered in white feathers|It builds the biggest nests of any North American bird|It appears on the Great Seal of its country|It is the national bird of the United States"],
    ["Kangaroo", "red kangaroo", 1, "The kangaroo is a national symbol of Australia.", "It is a marsupial|It cannot easily walk backwards|It carries its baby in a pouch|It appears on Australia's coat of arms"],
    ["Kiwi", "kiwi bird", 1, "The kiwi is New Zealand's national bird.", "It is a bird that cannot fly|It lays one of the largest eggs for its body size|It has nostrils at the end of its long beak|New Zealanders are nicknamed after it"],
    ["Giant panda", "panda", 1, "The giant panda is a national symbol of China.", "It is a bear|It spends up to 14 hours a day eating|It eats mostly bamboo|It is black and white|It is a national treasure of China"],
    ["Beaver", "north american beaver", 2, "The beaver is Canada's national animal.", "It is a large rodent|It builds dams across streams|It has a flat, paddle-like tail|Its fur trade helped build Canada|It is Canada's national animal"],
    ["Gallic rooster", "rooster|cockerel|gallic cock|coq gaulois", 2, "The Gallic rooster is an unofficial national symbol of France.", "It is a farm bird|Its name is a pun on the Latin word for the Gauls|It appears on French sports jerseys|It is a symbol of France"],
    ["Takin", "", 4, "The takin is Bhutan's national animal.", "It looks like a mix of a goat and a cow|It lives in the eastern Himalayas|A legend says a saint created it from bones|It is the national animal of Bhutan"],
    ["Markhor", "", 4, "The markhor is Pakistan's national animal.", "It is a wild goat|Its long horns twist like corkscrews|It lives in the mountains of Central Asia|It is the national animal of Pakistan"],
    ["Arabian oryx", "oryx", 3, "The Arabian oryx is the national animal of Oman, Qatar and Jordan.", "It is an antelope|It once went extinct in the wild|Its long straight horns may have inspired unicorn myths|It is a national animal of Oman, Qatar and Jordan"],
    ["Komodo dragon", "komodo", 2, "The Komodo dragon is Indonesia's national animal.", "It is the largest lizard in the world|It has a venomous bite|It lives on only a few islands|It is the national animal of Indonesia"],
    ["Malayan tiger", "", 3, "The Malayan tiger is Malaysia's national animal.", "It is a big cat|It lives only on a Southeast Asian peninsula|It is critically endangered|It appears on Malaysia's coat of arms"],
    ["Asian elephant", "elephant|thai elephant", 2, "The elephant is Thailand's national animal.", "It is the largest land animal in Asia|White ones were sacred to kings|It once appeared on Siam's flag|It is the national animal of Thailand"],
    ["Green pheasant", "japanese pheasant", 4, "The green pheasant is Japan's national bird.", "It is a bird with a long tail|The male has a red face patch|It appears in the folk tale of Momotarō|It is the national bird of Japan"],
    ["Brown bear", "bear", 2, "The brown bear is Finland's national animal and a symbol of Russia.", "It is one of the largest land predators|It hibernates in winter|It is a symbol of Russia|It is Finland's national animal"],
    ["Springbok", "", 2, "The springbok is South Africa's national animal.", "It is an antelope|It leaps straight up in a move called 'pronking'|Its country's rugby team is named after it|It is South Africa's national animal"],
    ["African fish eagle", "fish eagle", 3, "The African fish eagle is the national bird of Zambia, Zimbabwe, Namibia and South Sudan.", "It has a loud, famous call|It swoops to catch fish from lakes|It has a white head and chestnut body|It is on Zambia's flag"],
    ["Grey crowned crane", "crowned crane|crested crane", 3, "The grey crowned crane is Uganda's national bird.", "It has a golden crest of feathers|It dances to attract a mate|It appears in the middle of a national flag|It is Uganda's national bird"],
    ["Okapi", "", 3, "The okapi is the national animal of the DR Congo.", "It has zebra-like stripes on its legs|Its closest relative is the giraffe|It lives only in one rainforest|It is the national animal of the DR Congo"],
    ["Ring-tailed lemur", "lemur", 2, "The ring-tailed lemur is a symbol of Madagascar.", "It is a primate|It has a black-and-white striped tail|King Julien in the film 'Madagascar' is one|It lives only on one island"],
    ["Resplendent quetzal", "quetzal", 3, "The quetzal is Guatemala's national bird and currency name.", "It is a bird with very long green tail feathers|The Maya and Aztecs prized its feathers|A currency is named after it|It is Guatemala's national bird"],
    ["Andean condor", "condor", 2, "The Andean condor is the national bird of Bolivia, Chile, Colombia and Ecuador.", "It is one of the largest flying birds|Its wingspan can reach over 3 metres|It is a vulture of the mountains|It is the national bird of Bolivia, Chile, Colombia and Ecuador"],
    ["Vicuña", "vicuna", 4, "The vicuña is Peru's national animal.", "It is a relative of the llama|It has some of the finest wool in the world|It lives high in the Andes|It appears on Peru's coat of arms"],
    ["Scarlet macaw", "macaw", 3, "The scarlet macaw is Honduras' national bird.", "It is a big parrot|It is red, yellow and blue|It can live over 50 years|It is the national bird of Honduras"],
    ["Keel-billed toucan", "toucan", 3, "The keel-billed toucan is Belize's national bird.", "It has a huge, rainbow-coloured beak|Its beak is light and hollow|It lives in rainforests|It is the national bird of Belize"],
    ["Doctor bird", "red-billed streamertail|streamertail", 4, "The doctor bird is Jamaica's national bird.", "It is a hummingbird|It has two very long tail streamers|It is found only on one Caribbean island|It is Jamaica's national bird"],
    ["Dodo", "", 2, "The dodo is a national symbol of Mauritius.", "It was a flightless bird|It went extinct in the 1600s|It is a famous example of extinction|It is a symbol of Mauritius"],
    ["Emu", "", 2, "The emu is Australia's national bird.", "It is the second-largest bird in the world|It cannot fly|It can run at 50 km/h|It appears on Australia's coat of arms"],
    ["Indian peafowl", "peacock|indian peacock|peafowl|peahen", 1, "The peacock is India's national bird.", "The male has a huge fan of eye-spotted feathers|It dances when it rains|It is blue and green|It is India's national bird"],
    ["Barbary lion", "atlas lion|lion", 3, "The Barbary (Atlas) lion is Morocco's national animal.", "It is a big cat with a dark, thick mane|It is extinct in the wild|It lived in the Atlas Mountains|Morocco's football team is nicknamed after it"],
    ["Hoopoe", "", 4, "The hoopoe is Israel's national bird.", "It has a crest of feathers like a crown|It makes a 'hoo-poo' sound|It is pink, black and white|It was chosen as Israel's national bird in 2008"],
    ["White stork", "stork", 3, "The white stork is the national bird of Belarus and Lithuania.", "It nests on rooftops and chimneys|Legends say it delivers babies|It migrates to Africa for winter|It is the national bird of Belarus and Lithuania"],
    ["Mute swan", "swan", 4, "The mute swan is Denmark's national bird.", "It is a large white water bird|It has an orange beak with a black knob|It inspired 'The Ugly Duckling' by Hans Christian Andersen|It is Denmark's national bird"],
    ["Golden eagle", "", 3, "The golden eagle is Mexico's national animal.", "It is a large bird of prey|It appears on a flag eating a snake on a cactus|It is the national animal of Mexico"]
  ], { ask: "Guess the National Animal!" });

  add("culture", "festivals", "Famous Festivals", "🎉", [
    ["Diwali", "deepavali|deepawali", 1, "Diwali, the festival of lights.", "It is celebrated in October or November|Homes are decorated with clay lamps called diyas|Fireworks and sweets are part of it|It is the festival of lights|It is a major Hindu festival"],
    ["Holi", "", 1, "Holi, the festival of colours.", "It welcomes spring|A bonfire is lit the night before|People throw coloured powder and water at each other|It is the festival of colours"],
    ["Onam", "", 2, "Onam, Kerala's harvest festival.", "It celebrates the return of King Mahabali|People make flower carpets called pookalam|A grand feast called sadya is served on banana leaves|It is Kerala's biggest festival"],
    ["Pongal", "thai pongal", 2, "Pongal, Tamil Nadu's harvest festival.", "It is a harvest festival in January|Rice is boiled with milk until it overflows|Cattle are decorated on one of its days|It is celebrated in Tamil Nadu"],
    ["Eid al-Fitr", "eid|eid ul fitr|ramzan eid|eid al fitr|eid-ul-fitr", 1, "Eid al-Fitr marks the end of Ramadan.", "It begins when the new moon is sighted|People wear new clothes and give gifts|It ends a month of fasting|It marks the end of Ramadan"],
    ["Chinese New Year", "lunar new year|spring festival", 1, "Chinese New Year, the Spring Festival.", "Its date changes with the moon|Red envelopes of money are given|Lion and dragon dances fill the streets|Each year is named after one of 12 zodiac animals"],
    ["Songkran", "", 2, "Songkran, the Thai New Year water festival.", "It is held in April|It is a new year festival|The whole country has a giant water fight|It is celebrated in Thailand"],
    ["Oktoberfest", "wiesn", 1, "Oktoberfest, the beer festival in Munich.", "It actually starts in September|It began with a royal wedding in 1810|Millions of litres of beer are drunk|It is held in Munich"],
    ["La Tomatina", "tomatina", 2, "La Tomatina, the tomato fight in Buñol.", "It happens on the last Wednesday of August|Thousands of people take part|Everyone throws ripe tomatoes at each other|It takes place in Buñol, Spain"],
    ["Day of the Dead", "dia de los muertos|dia de muertos", 1, "Día de los Muertos, Mexico's festival honouring the dead.", "It happens at the start of November|Families build altars called ofrendas|Marigolds and sugar skulls are part of it|The Pixar film 'Coco' is about it|It is a Mexican celebration"],
    ["Rio Carnival", "carnival|carnaval|rio carnaval", 1, "The Rio Carnival in Brazil.", "It happens just before Lent|Samba schools compete in a huge parade|Its parade happens in the Sambadrome|It is held in Rio de Janeiro"],
    ["Hanami", "cherry blossom festival|sakura festival", 2, "Hanami, cherry-blossom viewing in Japan.", "It happens in spring|People picnic under the trees|Its name means 'flower viewing'|It is about cherry blossoms in Japan"],
    ["Thanksgiving", "thanksgiving day", 1, "Thanksgiving in the USA and Canada.", "It traces back to a 1621 harvest feast|Turkey and pumpkin pie are eaten|A giant parade is held in New York|Americans celebrate it in November"],
    ["Halloween", "hallowe'en|all hallows eve", 1, "Halloween on 31 October.", "It has roots in the ancient Celtic festival Samhain|Children go trick-or-treating|People carve pumpkins into jack-o'-lanterns|It is on 31 October"],
    ["Hanukkah", "chanukah|hanukah", 2, "Hanukkah, the Jewish festival of lights.", "It lasts eight nights|Children play with a spinning top called a dreidel|Candles are lit on a menorah|It is a Jewish festival of lights"],
    ["Nowruz", "norouz|navroz|persian new year", 3, "Nowruz, the Persian New Year.", "It starts on the spring equinox|Families set a table with seven items starting with 'S'|People jump over bonfires the week before|It is the Persian New Year"],
    ["Loy Krathong", "", 3, "Loy Krathong, Thailand's festival of floating lanterns.", "It is held on the full moon of the 12th Thai month|People float decorated baskets on water|Its baskets are made of banana leaves|It is celebrated in Thailand"],
    ["Bastille Day", "fete nationale|14 july|quatorze juillet", 2, "Bastille Day, France's national day on 14 July.", "It remembers the storming of a prison in 1789|A military parade goes down the Champs-Élysées|Fireworks light up the Eiffel Tower|It is France's national day on 14 July"],
    ["St. Patrick's Day", "saint patricks day|st patricks day|paddys day", 1, "St Patrick's Day on 17 March.", "It is held on 17 March|Chicago dyes its river green for it|People wear green and shamrocks|It honours Ireland's patron saint"],
    ["Mardi Gras", "fat tuesday", 2, "Mardi Gras, the carnival before Lent.", "Its name means 'Fat Tuesday'|People throw beads from parade floats|It happens the day before Ash Wednesday|It is famous in New Orleans"],
    ["Running of the Bulls", "san fermin|encierro|sanfermines", 2, "The Running of the Bulls during San Fermín in Pamplona.", "It is part of the San Fermín festival in July|Runners wear white with red scarves|People run in front of charging animals through narrow streets|It takes place in Pamplona, Spain"],
    ["Inti Raymi", "festival of the sun", 4, "Inti Raymi, the Inca festival of the sun.", "It is held on the winter solstice in June|It honours the Inca sun god|It is re-enacted at the Sacsayhuamán fortress|It takes place in Cusco, Peru"],
    ["Chuseok", "hangawi", 3, "Chuseok, the Korean harvest festival.", "It is a harvest festival in autumn|Families visit ancestral graves|People eat half-moon rice cakes called songpyeon|It is celebrated in Korea"],
    ["Mid-Autumn Festival", "moon festival|mooncake festival", 2, "The Mid-Autumn Festival.", "It is held on the full moon of the 8th lunar month|Families gather to look at the moon|People eat mooncakes|It is celebrated in China and East Asia"],
    ["Dragon Boat Festival", "duanwu|duanwu festival", 3, "The Dragon Boat Festival (Duanwu).", "It remembers the poet Qu Yuan|People eat sticky rice dumplings called zongzi|Teams paddle long, decorated vessels to the beat of drums|It is a Chinese festival"],
    ["Durga Puja", "pujo|durgotsav", 2, "Durga Puja, Bengal's biggest festival.", "It lasts several days in autumn|Huge decorated pandals are built|Idols of a goddess are immersed in rivers at the end|It is the biggest festival in Kolkata"],
    ["Ganesh Chaturthi", "vinayaka chaturthi|ganeshotsav", 2, "Ganesh Chaturthi.", "It celebrates the birth of an elephant-headed god|Huge idols are carried through the streets|The idols are immersed in water at the end|It is very big in Mumbai"],
    ["Navratri", "navaratri", 2, "Navratri, nine nights of the goddess.", "Its name means 'nine nights'|People dance garba and dandiya|It is celebrated in honour of the goddess Durga|It is especially big in Gujarat"],
    ["Vaisakhi", "baisakhi", 2, "Vaisakhi, the Sikh new year and harvest festival.", "It is held in mid-April|It marks the founding of the Khalsa in 1699|People dance the bhangra|It is a Punjabi harvest festival"],
    ["Bihu", "rongali bihu|bohag bihu", 3, "Bihu, the festival of Assam.", "There are three of them each year|The spring one is the Assamese new year|It has fast, joyful folk dances|It is the main festival of Assam"],
    ["Kumbh Mela", "kumbh|maha kumbh", 2, "Kumbh Mela, the largest gathering of people on Earth.", "It is the largest gathering of people on Earth|It moves between four cities|Pilgrims take a holy dip in sacred rivers|It is a Hindu pilgrimage festival"],
    ["Hogmanay", "", 3, "Hogmanay, the Scottish New Year.", "People sing 'Auld Lang Syne'|The first person to enter a home after midnight brings luck|Edinburgh holds a huge street party|It is the Scottish New Year"],
    ["Carnival of Venice", "venice carnival|carnevale di venezia", 2, "The Carnival of Venice.", "It is held before Lent|People wear elaborate masks and costumes|Gondolas glide past masked guests|It takes place in an Italian city of canals"],
    ["Obon", "bon festival|bon", 3, "Obon, the Japanese festival honouring ancestors.", "It is held in summer|It honours the spirits of ancestors|People dance the bon odori|Lanterns are floated on rivers at the end"],
    ["Tết", "tet|tet nguyen dan", 3, "Tết, the Vietnamese Lunar New Year.", "It is a lunar new year|People eat sticky rice cakes called bánh chưng|Peach and apricot blossoms decorate homes|It is the biggest holiday in Vietnam"],
    ["Lantern Festival", "yuanxiao", 3, "The Lantern Festival ends Chinese New Year celebrations.", "It is held on the 15th day of the first lunar month|People solve riddles hung on glowing paper decorations|Sweet rice balls called tangyuan are eaten|It ends the Chinese New Year season"],
    ["Guy Fawkes Night", "bonfire night|guy fawkes day", 3, "Guy Fawkes Night on 5 November.", "It is on 5 November|It remembers a failed plot to blow up Parliament in 1605|People light bonfires and set off fireworks|It is a British tradition"],
    ["Midsummer", "midsommar", 3, "Midsummer in Sweden.", "It is held around the summer solstice|People dance around a flower-covered maypole|They wear flower crowns|It is one of Sweden's biggest holidays"],
    ["King's Day", "koningsdag|kings day", 3, "King's Day in the Netherlands.", "It is on 27 April|Everyone wears orange|The whole country becomes a street market|It celebrates the Dutch monarch's birthday"],
    ["Las Fallas", "fallas|falles", 4, "Las Fallas in Valencia.", "It is held in March|Giant papier-mâché figures are built|On the last night the figures are burned|It takes place in Valencia, Spain"],
    ["Timkat", "timket", 4, "Timkat, the Ethiopian Orthodox Epiphany.", "It is held in January|It celebrates the baptism of Jesus|Priests carry replicas of the Ark of the Covenant|It is an Ethiopian festival"],
    ["Up Helly Aa", "", 4, "Up Helly Aa, the Viking fire festival in Shetland.", "It is held in January|Torch-bearers dress as Vikings|A Viking ship is set on fire|It takes place in Shetland, Scotland"],
    ["Christmas", "xmas", 1, "Christmas on 25 December.", "Its date is 25 December for most churches|People decorate evergreen trees|Children wait for presents from Santa Claus|It celebrates the birth of Jesus"],
    ["Raksha Bandhan", "rakhi", 1, "Raksha Bandhan, the festival of siblings.", "It falls in August|A sister ties a thread on her brother's wrist|The brother promises to protect her|It celebrates siblings"],
    ["Vishu", "", 3, "Vishu, the Malayali new year.", "It is held in April|The first sight of the morning is a 'kani' of fruit, gold and flowers|Elders give money called kaineettam|It is the Malayali new year"]
  ], { ask: "Guess the Festival!" });

  add("culture", "languages", "Languages", "🗣️", [
    ["Hindi", "", 1, "Hindi is the most widely spoken language in India.", "It is written in the Devanagari script|'Namaste' is a greeting in it|Bollywood films are mostly made in it|It is the most spoken language in India"],
    ["Bengali", "bangla", 1, "Bengali (Bangla) is spoken in Bangladesh and West Bengal.", "Rabindranath Tagore wrote poems in it|International Mother Language Day honours its speakers|It is spoken in West Bengal|It is the national language of Bangladesh"],
    ["Tamil", "", 1, "Tamil, one of the world's oldest living classical languages.", "It is one of the oldest living languages in the world|It was the first Indian language declared 'classical'|'Vanakkam' means hello in it|It is the main language of a South Indian state and northern Sri Lanka"],
    ["Malayalam", "", 1, "Malayalam, the language of Kerala.", "Its name is a palindrome in English letters|'Namaskaram' is a greeting in it|It is written in a rounded script|It is spoken in Kerala"],
    ["Telugu", "", 1, "Telugu, the language of Andhra Pradesh and Telangana.", "It has been called the 'Italian of the East'|Almost every word in it ends in a vowel|RRR and Baahubali were made in it|It is spoken in Andhra Pradesh and Telangana"],
    ["Kannada", "", 2, "Kannada, the language of Karnataka.", "Its script is very similar to Telugu's|Eight writers in it have won the Jnanpith Award|'Namaskara' is a greeting in it|It is spoken in Karnataka"],
    ["Marathi", "", 2, "Marathi, the language of Maharashtra.", "It is written in Devanagari|The poet-saint Dnyaneshwar wrote in it|It is the main language of Mumbai's state|It is spoken in Maharashtra"],
    ["Gujarati", "", 2, "Gujarati, the language of Gujarat.", "Its script has no line on top of the letters|Mahatma Gandhi's mother tongue was this|It is spoken in Gujarat"],
    ["Punjabi", "panjabi", 2, "Punjabi, spoken in Punjab in India and Pakistan.", "It is a tonal language|In India it is written in the Gurmukhi script|Bhangra songs are sung in it|It is spoken in Punjab"],
    ["Urdu", "", 2, "Urdu, the national language of Pakistan.", "It is written from right to left|It is famous for ghazal poetry|Spoken, it is very close to Hindi|It is the national language of Pakistan"],
    ["Mandarin Chinese", "mandarin|chinese|putonghua", 1, "Mandarin Chinese, the world's most spoken native language.", "It is the most spoken first language in the world|It has four main tones|It is written with characters, not an alphabet|'Nǐ hǎo' means hello in it"],
    ["Cantonese", "yue", 3, "Cantonese, spoken in Hong Kong and Guangdong.", "It has six to nine tones|Many classic kung-fu films are in it|It is spoken in Guangdong|It is the main language of Hong Kong"],
    ["Japanese", "nihongo", 1, "Japanese uses kanji, hiragana and katakana.", "It uses three writing systems|Two of its scripts are hiragana and katakana|'Konnichiwa' means hello in it|It is spoken in Japan"],
    ["Korean", "hangul|hangugeo", 1, "Korean, written in the Hangul alphabet.", "Its alphabet was invented by King Sejong in 1443|Its alphabet is called Hangul|'Annyeonghaseyo' means hello in it|K-pop songs are mostly sung in it"],
    ["Thai", "", 2, "Thai, the language of Thailand.", "It has five tones|Its alphabet has 44 consonants|'Sawasdee' means hello in it|It is spoken in Bangkok"],
    ["Vietnamese", "", 2, "Vietnamese uses a Latin alphabet with many accents.", "It uses the Latin alphabet with lots of accent marks|It has six tones|'Xin chào' means hello in it|It is spoken in Hanoi"],
    ["Indonesian", "bahasa indonesia|bahasa", 2, "Indonesian (Bahasa Indonesia).", "It has no verb tenses — time is shown with extra words|It unites people across 17,000 islands|'Terima kasih' means thank you in it|It is spoken in Jakarta"],
    ["Filipino", "tagalog|pilipino", 2, "Filipino, based on Tagalog.", "It is based mainly on Tagalog|It mixes in many Spanish and English words|'Salamat' means thank you in it|It is spoken in Manila"],
    ["Arabic", "", 1, "Arabic, written right to left, the language of the Quran.", "It is written from right to left|The numbers we use came to Europe through its speakers|It is the language of the Quran|It is official in over 20 countries"],
    ["Hebrew", "", 2, "Hebrew, revived as an everyday language in the 1800s.", "It was revived as a spoken language in the 19th century|It is written from right to left|'Shalom' means hello and peace in it|It is spoken in Israel"],
    ["Persian", "farsi", 2, "Persian (Farsi), the language of Iran.", "The poets Rumi and Hafez wrote in it|It is written in a version of the Arabic script|It is also spoken in Afghanistan as Dari|It is spoken in Iran"],
    ["Turkish", "", 2, "Turkish, written in the Latin alphabet since 1928.", "It switched to the Latin alphabet in 1928|It adds many endings onto one word|'Merhaba' means hello in it|It is spoken in Istanbul"],
    ["Russian", "", 1, "Russian, written in Cyrillic.", "It is written in the Cyrillic alphabet|Tolstoy and Dostoevsky wrote in it|'Privet' means hi in it|It is spoken in Moscow"],
    ["Ukrainian", "", 3, "Ukrainian, written in Cyrillic.", "It is written in a Cyrillic alphabet|It has the letter 'ї'|It is spoken in Kyiv"],
    ["Polish", "", 2, "Polish, known for clusters of consonants.", "It is famous for long clusters of consonants|It has letters like ł and ż|'Dzień dobry' means good day in it|It is spoken in Warsaw"],
    ["German", "deutsch", 1, "German, known for long compound words.", "All its nouns start with a capital letter|It is famous for very long compound words|'Guten Tag' means good day in it|It is spoken in Berlin and Vienna"],
    ["French", "francais", 1, "French, spoken on five continents.", "It is an official language of the UN and the Olympics|'Bonjour' means hello in it|It is spoken in Quebec and much of West Africa|It is spoken in Paris"],
    ["Spanish", "espanol|castilian", 1, "Spanish, the second most spoken native language.", "It is the second most spoken first language in the world|It has the letter ñ|'Hola' means hello in it|It is spoken in Madrid and Mexico City"],
    ["Portuguese", "portugues", 1, "Portuguese, spoken mostly in Brazil.", "Most of its speakers live in South America|'Obrigado' means thank you in it|It is the language of Brazil|It is spoken in Lisbon"],
    ["Italian", "italiano", 1, "Italian, the language of opera.", "Musical words like 'piano' and 'forte' come from it|It is the main language of opera|'Ciao' means hi and bye in it|It is spoken in Rome"],
    ["Dutch", "nederlands", 2, "Dutch, spoken in the Netherlands and Belgium.", "Afrikaans grew out of it|New York was first named 'New Amsterdam' by its speakers|It is spoken in Amsterdam|It is also spoken in Flanders, Belgium"],
    ["Greek", "", 2, "Greek, with the oldest recorded history of any living European language.", "It has the oldest written record of any living European language|Its alphabet begins with alpha and beta|Homer's poems were written in it|It is spoken in Athens"],
    ["Swedish", "svenska", 3, "Swedish, spoken in Sweden and part of Finland.", "It has the letters å, ä and ö|ABBA sang in it before switching to English|It is an official language of Finland too|It is spoken in Stockholm"],
    ["Finnish", "suomi", 3, "Finnish, not related to most European languages.", "It is not related to its Scandinavian neighbours' languages|It has 15 grammatical cases|'Kiitos' means thank you in it|It is spoken in Helsinki"],
    ["Hungarian", "magyar", 3, "Hungarian (Magyar).", "It is related to Finnish, not to its neighbours|It has about 18 cases|Its speakers write their family name first|It is spoken in Budapest"],
    ["Swahili", "kiswahili", 2, "Swahili, East Africa's common language.", "'Hakuna matata' from The Lion King is in it|Many of its words come from Arabic|'Jambo' means hello in it|It is spoken in Kenya and Tanzania"],
    ["Amharic", "", 3, "Amharic, the working language of Ethiopia.", "It has its own script called Ge'ez|It is the second most spoken Semitic language|It is the working language of Ethiopia"],
    ["Zulu", "isizulu", 3, "Zulu (isiZulu), spoken in South Africa.", "It uses click sounds|'Sawubona' means hello in it|It is the most spoken home language in South Africa"],
    ["Yoruba", "", 3, "Yoruba, spoken in southwest Nigeria.", "It is a tonal language|It is spoken in Lagos|Its people live mainly in southwest Nigeria and Benin"],
    ["Afrikaans", "", 3, "Afrikaans, which grew from Dutch.", "It developed from 17th-century Dutch|It is one of the youngest major languages|It is spoken in South Africa and Namibia"],
    ["Latin", "", 2, "Latin, the language of ancient Rome.", "It is still the official language of Vatican City|Most Romance languages grew out of it|Scientific names of species are written in it|It was spoken in ancient Rome"],
    ["Sanskrit", "", 2, "Sanskrit, the classical language of ancient India.", "The Vedas were written in it|The Ramayana and Mahabharata were composed in it|Yoga words like 'asana' come from it|It is an ancient Indian language"],
    ["Esperanto", "", 3, "Esperanto, a constructed language from 1887.", "It was invented in 1887|Its creator was L. L. Zamenhof|It was designed to be an easy international language|Its name means 'one who hopes'"],
    ["Māori", "maori|te reo maori|te reo", 3, "Māori (te reo Māori), spoken in New Zealand.", "'Kia ora' is a greeting in it|The haka is performed in it|It is an official language of New Zealand"],
    ["Irish", "irish gaelic|gaeilge|gaelic", 3, "Irish (Gaeilge).", "It is a Celtic language|'Sláinte' is a toast in it|It is an official language of the EU|It is spoken in Ireland"],
    ["Welsh", "cymraeg", 3, "Welsh (Cymraeg).", "It is a Celtic language|It has a town with a 58-letter name|It is spoken in Wales"],
    ["Nepali", "nepalese", 3, "Nepali, written in Devanagari.", "It is written in Devanagari|It is also an official language in Sikkim, India|It is spoken in Kathmandu"],
    ["Sinhala", "sinhalese", 3, "Sinhala, spoken in Sri Lanka.", "Its letters are very round|It is spoken by the largest group on its island|It is spoken in Sri Lanka"]
  ], { ask: "Guess the Language!" });

  add("culture", "destinations", "Tourist Destinations", "🧳", [
    ["Grand Canyon", "", 1, "The Grand Canyon in Arizona.", "It was carved by the Colorado River|It is up to 1.8 km deep|It shows nearly 2 billion years of rock layers|It is in Arizona, USA"],
    ["Niagara Falls", "niagara", 1, "Niagara Falls on the US–Canada border.", "It is made of three waterfalls|Boats called the Maid of the Mist sail near it|It lies on the border of two countries|It is between Ontario and New York"],
    ["Victoria Falls", "mosi-oa-tunya|mosi oa tunya", 2, "Victoria Falls on the Zambezi.", "Its local name means 'the smoke that thunders'|It is one of the largest waterfalls by width and height|Explorer David Livingstone named it after a queen|It lies between Zambia and Zimbabwe"],
    ["Iguazu Falls", "iguacu falls|iguazu|iguassu falls", 2, "Iguazú Falls on the Argentina–Brazil border.", "It is made of about 275 separate drops|Its biggest part is called the Devil's Throat|It lies between Argentina and Brazil"],
    ["Angel Falls", "kerepakupai meru|salto angel", 3, "Angel Falls, the world's highest waterfall.", "It is the highest uninterrupted waterfall in the world|It drops nearly 1 km|It is named after an American pilot|It is in Venezuela"],
    ["Great Barrier Reef", "barrier reef", 1, "The Great Barrier Reef off Queensland.", "It is the largest coral reef system in the world|It can be seen from space|It suffers from coral bleaching|It is off the coast of Queensland, Australia"],
    ["Uluru", "ayers rock", 2, "Uluru, the giant sandstone rock in central Australia.", "It is a giant red sandstone rock|It glows red at sunset|It is sacred to the Anangu people|It is in the middle of Australia"],
    ["Mount Everest", "everest|sagarmatha|chomolungma", 1, "Mount Everest, Earth's highest mountain.", "It is about 8,849 metres high|Hillary and Tenzing first climbed it in 1953|Its local names include Sagarmatha and Chomolungma|It is the highest mountain on Earth"],
    ["Mount Fuji", "fuji|fujisan|fuji-san", 1, "Mount Fuji, Japan's highest mountain.", "It is an active volcano|It last erupted in 1707|Its snow-capped cone is a symbol of its country|It is Japan's highest mountain"],
    ["Mount Kilimanjaro", "kilimanjaro", 2, "Kilimanjaro, Africa's highest mountain.", "It is a dormant volcano|It has three volcanic cones|You can climb it without technical gear|It is the highest mountain in Africa"],
    ["Ha Long Bay", "halong bay", 2, "Ha Long Bay in Vietnam.", "It has nearly 2,000 limestone islands|Its name means 'descending dragon'|Tourists explore it on junk boats|It is in northern Vietnam"],
    ["Bali", "", 1, "Bali, the 'Island of the Gods' in Indonesia.", "It is called the 'Island of the Gods'|It has famous rice terraces and monkey forests|Most of its people are Hindu|It is an island in Indonesia"],
    ["Santorini", "thira|thera", 2, "Santorini, the Greek island of white houses and blue domes.", "It was shaped by a huge volcanic eruption|Its village Oia is famous for sunsets|Its houses are white with blue domes|It is a Greek island"],
    ["Bora Bora", "", 2, "Bora Bora in French Polynesia.", "It is famous for overwater bungalows|It has a turquoise lagoon around a volcano|It is in French Polynesia"],
    ["Cappadocia", "kapadokya", 2, "Cappadocia in central Turkey.", "It has rock towers called 'fairy chimneys'|People once lived in underground cities here|Hundreds of hot-air balloons fly at sunrise|It is in central Turkey"],
    ["Banff", "banff national park", 3, "Banff National Park in the Canadian Rockies.", "It is Canada's oldest national park|Its Lake Louise and Moraine Lake are bright turquoise|It is in the Rocky Mountains|It is in Alberta"],
    ["Yellowstone", "yellowstone national park", 2, "Yellowstone, the first national park.", "It was the world's first national park, in 1872|It sits on top of a supervolcano|Its geyser Old Faithful erupts regularly|It is mostly in Wyoming, USA"],
    ["Galápagos Islands", "galapagos|galapagos islands", 2, "The Galápagos Islands of Ecuador.", "Giant tortoises live here|Charles Darwin studied its finches|It helped inspire the theory of evolution|It belongs to Ecuador"],
    ["Amazon Rainforest", "amazon|amazonia", 1, "The Amazon, the world's largest tropical rainforest.", "It is the largest tropical rainforest on Earth|It produces lots of the world's oxygen|It is home to jaguars, sloths and pink river dolphins|Most of it is in Brazil"],
    ["Serengeti", "serengeti national park", 2, "The Serengeti in Tanzania.", "Over a million wildebeest migrate across it|Its name means 'endless plains'|It is famous for lions and safaris|It is in Tanzania"],
    ["Sahara Desert", "sahara", 1, "The Sahara, the largest hot desert.", "It is the largest hot desert in the world|It is almost as big as the USA|It covers much of North Africa"],
    ["Dead Sea", "", 2, "The Dead Sea, the lowest place on land.", "Its shore is the lowest land on Earth|Its water is so salty that you float easily|Fish cannot live in it|It lies between Jordan and Israel"],
    ["Amalfi Coast", "amalfi", 2, "The Amalfi Coast in southern Italy.", "Colourful towns cling to its cliffs|Positano is one of its towns|It is famous for lemons and limoncello|It is in southern Italy"],
    ["Venice", "venezia", 1, "Venice, the city of canals.", "It is built on 118 small islands|People travel by gondola and water bus|It has no cars|It is in northern Italy"],
    ["Dubrovnik", "", 2, "Dubrovnik, the walled city on the Adriatic.", "It is surrounded by stone city walls|It was a filming location for 'Game of Thrones'|It is called the 'Pearl of the Adriatic'|It is in Croatia"],
    ["Kyoto", "", 2, "Kyoto, Japan's former imperial capital.", "It was Japan's capital for over 1,000 years|It has about 2,000 temples and shrines|Its Gion district is famous for geisha|It is in Japan"],
    ["Dubai", "", 1, "Dubai, the city of skyscrapers.", "It has an indoor ski slope in a shopping mall|It built islands shaped like palm trees|It is home to the world's tallest building|It is in the United Arab Emirates"],
    ["Las Vegas", "vegas", 1, "Las Vegas, the entertainment capital in the Nevada desert.", "It is nicknamed 'Sin City'|It has a copy of the Eiffel Tower|Its main road is called the Strip|It is in Nevada"],
    ["Goa", "", 1, "Goa, India's beach state.", "It was a Portuguese colony until 1961|It is famous for beaches and nightlife|Its food includes vindaloo and bebinca|It is India's smallest state by area"],
    ["Munnar", "", 2, "Munnar, the tea hill station in Kerala.", "It is a hill station|It is covered in tea plantations|The Neelakurinji flower blooms here once every 12 years|It is in Kerala"],
    ["Alleppey", "alappuzha", 2, "Alappuzha (Alleppey), the 'Venice of the East'.", "It is called the 'Venice of the East'|Tourists stay on houseboats in its backwaters|It hosts the Nehru Trophy snake-boat race|It is in Kerala"],
    ["Ladakh", "leh", 2, "Ladakh, the high-altitude desert in the Himalayas.", "It is a cold, high desert|Pangong Lake changes colour through the day|Bikers ride over its high mountain passes|Its main town is Leh"],
    ["Jaipur", "pink city", 1, "Jaipur, the Pink City of Rajasthan.", "It is called the 'Pink City'|It has the Amber Fort and Hawa Mahal|It is the capital of Rajasthan"],
    ["Varanasi", "banaras|benares|kashi", 2, "Varanasi, one of the oldest living cities.", "It is one of the oldest living cities in the world|Its riverside steps are called ghats|An evening Ganga aarti is held here|It is on the Ganges in Uttar Pradesh"],
    ["Rishikesh", "", 2, "Rishikesh, the yoga capital of the world.", "It is called the 'Yoga Capital of the World'|The Beatles visited an ashram here in 1968|It has the Laxman Jhula bridge|It is on the Ganges in Uttarakhand"],
    ["Hampi", "", 3, "Hampi, ruins of the Vijayanagara Empire.", "It was the capital of the Vijayanagara Empire|Huge boulders are scattered all over it|It has a famous stone chariot|It is in Karnataka"],
    ["Andaman Islands", "andaman|andaman and nicobar", 2, "The Andaman Islands in the Bay of Bengal.", "Radhanagar Beach is here|The Cellular Jail was built here by the British|They lie in the Bay of Bengal|They are an Indian union territory"],
    ["Darjeeling", "", 2, "Darjeeling, the tea town in West Bengal.", "It is famous for its tea|A 'toy train' climbs up to it|You can see Kangchenjunga from it|It is a hill station in West Bengal"],
    ["Manali", "", 2, "Manali, a hill station in Himachal Pradesh.", "It is a hill station in the Kullu valley|The Rohtang Pass and Atal Tunnel are nearby|It is popular for snow and paragliding|It is in Himachal Pradesh"],
    ["Phuket", "", 2, "Phuket, Thailand's largest island.", "It is Thailand's biggest island|Patong Beach is here|The Phi Phi Islands are close by|It is in the Andaman Sea"],
    ["Zanzibar", "unguja", 3, "Zanzibar, the spice island off Tanzania.", "It is called the 'Spice Island'|Freddie Mercury was born here|Its old town is Stone Town|It belongs to Tanzania"],
    ["Marrakech", "marrakesh", 2, "Marrakech, Morocco's 'Red City'.", "It is called the 'Red City'|Its main square is Jemaa el-Fnaa|It has busy souks (markets)|It is in Morocco"],
    ["Cape Town", "", 2, "Cape Town, under Table Mountain.", "It sits under Table Mountain|Nelson Mandela was imprisoned on nearby Robben Island|Penguins live on its Boulders Beach|It is in South Africa"],
    ["Cancún", "cancun", 2, "Cancún on Mexico's Caribbean coast.", "It is a resort city with turquoise beaches|It has an underwater sculpture museum|Mayan ruins are a day trip away|It is on Mexico's Yucatán Peninsula"],
    ["Patagonia", "", 3, "Patagonia at the southern tip of South America.", "It has glaciers, mountains and windswept plains|Torres del Paine is here|Its glaciers include Perito Moreno|It is shared by Argentina and Chile"],
    ["Pamukkale", "cotton castle", 3, "Pamukkale, Turkey's white travertine terraces.", "Its name means 'cotton castle'|It has white terraces of hot-spring pools|The ancient city of Hierapolis sits above it|It is in Turkey"],
    ["Plitvice Lakes", "plitvice", 3, "Plitvice Lakes in Croatia.", "It has 16 terraced lakes joined by waterfalls|Its water is bright turquoise|You walk across it on wooden boardwalks|It is in Croatia"],
    ["Milford Sound", "piopiotahi", 3, "Milford Sound in New Zealand's Fiordland.", "It is actually a fiord, not a sound|Mitre Peak rises above it|It is one of the wettest places on Earth|It is in New Zealand"],
    ["Hallstatt", "", 3, "Hallstatt, the lakeside village in Austria.", "It is a tiny lakeside village|It has one of the oldest salt mines in the world|A copy of it was built in China|It is in Austria"],
    ["Cinque Terre", "", 3, "Cinque Terre on the Italian Riviera.", "Its name means 'five lands'|It is five colourful fishing villages|A coastal path links the villages|It is on the Italian Riviera"],
    ["Lake Como", "como", 3, "Lake Como in northern Italy.", "It is shaped like an upside-down Y|George Clooney has a villa here|It is surrounded by the Alps|It is in northern Italy"],
    ["Chefchaouen", "chaouen", 4, "Chefchaouen, Morocco's blue city.", "Almost everything in it is painted blue|It sits in the Rif Mountains|It is in Morocco"],
    ["Salar de Uyuni", "uyuni|uyuni salt flat", 3, "Salar de Uyuni, the world's largest salt flat.", "It is the largest salt flat in the world|After rain it becomes a giant mirror|It is in Bolivia"]
  ], { ask: "Guess the Destination!" });
})();
