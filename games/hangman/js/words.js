/* ============ HANGMAN — word bank: 13 categories × 5 difficulty tiers ============
   Each tier is "WORD:clue|WORD:clue". Words are A–Z with optional spaces or hyphens (shown automatically). */
(function () {
  "use strict";
  const H = (window.HM = window.HM || {});
  H.TIERS = ["Beginner", "Easy", "Medium", "Hard", "Expert"];
  H.CATS = [];
  H.WORDS = [];
  function add(id, name, icon, tiers) {
    H.CATS.push({ id, name, icon });
    tiers.forEach((str, t) => str.split("|").forEach((pair) => {
      const [w, clue] = pair.split(":");
      H.WORDS.push({ word: w.trim().toUpperCase(), clue: clue.trim(), cat: id, tier: t });
    }));
  }
  add("animals", "Animals", "🐾", [
    "CAT:Says meow|DOG:Man's best friend|COW:Gives us milk|PIG:A pink farm animal that oinks|OWL:Hoots at night|BEE:Makes honey|FOX:A clever orange wild animal|BAT:Flies at night and hangs upside down",
    "TIGER:A big cat with stripes|HORSE:You can ride it|ZEBRA:Black-and-white stripes|MONKEY:Loves bananas and climbing|RABBIT:Long ears and hops|PANDA:A bear that eats bamboo|SHARK:An ocean predator with a fin|CAMEL:Has humps and lives in deserts",
    "ELEPHANT:The largest land animal, with a trunk|KANGAROO:Hops and carries its baby in a pouch|GIRAFFE:The tallest animal|PENGUIN:A bird that swims but can't fly|DOLPHIN:A smart, playful sea mammal|CHEETAH:The fastest land animal|OCTOPUS:Has eight arms|CROCODILE:A big reptile with powerful jaws",
    "PLATYPUS:An egg-laying mammal with a duck-like bill|CHAMELEON:A lizard that changes colour|RHINOCEROS:A heavy animal with a horn on its nose|HIPPOPOTAMUS:Its name means 'river horse'|ARMADILLO:Has armour and can roll into a ball|PORCUPINE:Covered in sharp quills|FLAMINGO:A pink bird that stands on one leg|WOLVERINE:A fierce member of the weasel family",
    "AXOLOTL:A Mexican salamander that keeps its gills|NARWHAL:A whale with a long tusk|PANGOLIN:A scaly anteater|QUOKKA:A smiling marsupial from Australia|OKAPI:A giraffe relative with striped legs|AARDVARK:An African burrowing anteater|CAPYBARA:The world's largest rodent|WILDEBEEST:Also called a gnu, it migrates in huge herds"
  ]);
  add("food", "Food & Drinks", "🍕", [
    "TEA:A hot drink made from leaves|PIE:Baked with a crust|EGG:Laid by hens|JAM:A sweet fruit spread|RICE:A grain often eaten with curry|CAKE:A birthday treat|MILK:A white drink from cows|SOUP:Eaten from a bowl with a spoon",
    "PIZZA:Italian flatbread with toppings|MANGO:Called the king of fruits|PASTA:Italian noodles|BREAD:Baked as a loaf|HONEY:Made by bees|LEMON:A sour yellow citrus fruit|COFFEE:A morning drink with caffeine|BURGER:A patty in a bun",
    "CHOCOLATE:A sweet made from cocoa|SANDWICH:A filling between two slices of bread|PINEAPPLE:A spiky tropical fruit|BISCUIT:A crunchy baked snack|PANCAKE:A flat breakfast cake|POPCORN:A movie snack that pops|NOODLES:Long strands slurped from a bowl|MUSHROOM:A fungus used in cooking",
    "CROISSANT:A flaky crescent-shaped pastry|LASAGNA:A layered pasta bake|GUACAMOLE:A mashed avocado dip|ZUCCHINI:A green summer squash|BROCCOLI:Looks like tiny green trees|SPAGHETTI:Long, thin pasta|CAPPUCCINO:Espresso with foamy milk|TIRAMISU:A coffee-flavoured Italian dessert",
    "QUESADILLA:A folded tortilla with melted cheese|BRUSCHETTA:Toasted bread topped with tomato|RATATOUILLE:A French vegetable stew|BOUILLABAISSE:A fish stew from Marseille|PROSCIUTTO:Italian dry-cured ham|KOMBUCHA:A fizzy fermented tea|WORCESTERSHIRE:A tangy English sauce|SAUERKRAUT:Fermented cabbage"
  ]);
  add("places", "Countries & Cities", "🌍", [
    "INDIA:Home of the Taj Mahal|PERU:Home of Machu Picchu|CUBA:A Caribbean island; its capital is Havana|ROME:Italy's capital with the Colosseum|OMAN:Its capital is Muscat|IRAN:Its capital is Tehran|CHAD:An African country named after a lake|FIJI:An island nation in the Pacific",
    "JAPAN:The land of the rising sun|EGYPT:Famous for its pyramids|PARIS:City of the Eiffel Tower|CHINA:Home of the Great Wall|DUBAI:City of the Burj Khalifa|KENYA:A safari country; capital Nairobi|TOKYO:Japan's capital|LONDON:City of Big Ben",
    "AUSTRALIA:Kangaroos and the Sydney Opera House|BRAZIL:Carnival and Christ the Redeemer|CANADA:Its flag has a maple leaf|MEXICO:Tacos and Aztec pyramids|GERMANY:Its capital is Berlin|SINGAPORE:A city-state called the Lion City|NEW YORK:The Big Apple|ISTANBUL:A city on two continents",
    "MADAGASCAR:A big island famous for lemurs|KATHMANDU:Capital of Nepal|REYKJAVIK:Capital of Iceland|KAZAKHSTAN:The largest landlocked country|LIECHTENSTEIN:A tiny country between Switzerland and Austria|MONTEVIDEO:Capital of Uruguay|ZIMBABWE:Home of Victoria Falls, shared with Zambia|MOZAMBIQUE:A southern African country; capital Maputo",
    "OUAGADOUGOU:Capital of Burkina Faso|KYRGYZSTAN:A Central Asian country; capital Bishkek|ULAANBAATAR:Capital of Mongolia|ASHGABAT:Capital of Turkmenistan|DJIBOUTI:A small nation in the Horn of Africa|TEGUCIGALPA:Capital of Honduras|LJUBLJANA:Capital of Slovenia|ANTANANARIVO:Capital of Madagascar"
  ]);
  add("movies", "Movies & Entertainment", "🎬", [
    "FILM:Another word for a movie|STAR:A famous performer|SONG:Has lyrics and a tune|ROLE:The part an actor plays|SHOW:A performance or TV programme|FAN:A big admirer|HERO:The good guy of the story|PLOT:What happens in a story",
    "OSCAR:A golden award statuette|CAMERA:It records the movie|COMEDY:A genre that makes you laugh|ACTOR:Plays a role|SCRIPT:The written lines|TICKET:You need one to get into the cinema|SEQUEL:Part two|DRAMA:A serious genre",
    "DIRECTOR:The person in charge of making a film|TRAILER:A short preview|ANIMATION:Cartoons are made with it|SOUNDTRACK:The music of a film|HOLLYWOOD:America's film capital|BOLLYWOOD:The Hindi film industry|THRILLER:A suspenseful genre|PREMIERE:A film's first public screening",
    "CINEMATOGRAPHY:The art of camera work|SCREENPLAY:A film's script|BLOCKBUSTER:A huge hit|DOCUMENTARY:A non-fiction film|PROTAGONIST:The main character|MATINEE:An afternoon show|CAMEO:A brief appearance by a famous person|CHOREOGRAPHER:Designs the dance moves",
    "MOCKUMENTARY:A comedy disguised as a documentary|DENOUEMENT:The final resolution of a plot|VENTRILOQUIST:Makes a puppet seem to talk|MACGUFFIN:An object that drives the plot|DOPPELGANGER:An identical-looking double|SOLILOQUY:A character speaking thoughts alone on stage|PANTOMIME:Acting without words|ROTOSCOPING:Animating by tracing over live-action footage"
  ]);
  add("sports", "Sports", "⚽", [
    "GOLF:Aim for a hole in one|RUN:Move fast on foot|SWIM:Done in a pool|BALL:Round and you kick it|GOAL:Scored in football|NET:The ball goes over it in tennis|RACE:A contest of speed|PUCK:Hit with a stick on ice",
    "TENNIS:Rackets and Wimbledon|HOCKEY:A stick and a ball or puck|RUGBY:Played with an oval ball|CHESS:A board game of kings and queens|BOXING:Fought in a ring with gloves|KARATE:A Japanese martial art|SKIING:Racing down snowy slopes|SURFING:Riding the waves",
    "CRICKET:Bat, ball and wickets|FOOTBALL:The world's most popular sport|BASEBALL:Home runs and pitchers|SWIMMING:Freestyle, backstroke and butterfly|CYCLING:The Tour de France|WRESTLING:Pin your opponent|MARATHON:A race of about 42 kilometres|BADMINTON:Played with a shuttlecock",
    "GYMNASTICS:Beam, vault and rings|TRIATHLON:Swim, bike and run|VOLLEYBALL:Spike the ball over a high net|SNOOKER:A cue sport with red balls|TAEKWONDO:A Korean martial art known for kicks|ARCHERY:A bow and arrows|FENCING:Swords and masks|DECATHLON:Ten track-and-field events",
    "KABADDI:A raider chants while holding a breath|LACROSSE:Played with a netted stick|BOBSLEIGH:A team sled on an icy track|PENTATHLON:A contest of five events|JAVELIN:Throwing a spear|CURLING:Sliding stones on ice and sweeping|SQUASH:A racket sport against walls|WATER POLO:A ball game played in a pool"
  ]);
  add("tech", "Technology", "💻", [
    "APP:A program on your phone|WEB:The World Wide ___|BUG:An error in code|CHIP:A tiny silicon part|CODE:Instructions for a computer|DATA:Stored information|WI-FI:Wireless internet|TAB:A page open in your browser",
    "MOUSE:Point and click|ROBOT:A machine that does tasks|LAPTOP:A portable computer|EMAIL:An electronic letter|PIXEL:A tiny dot on a screen|CLOUD:Online storage|SCREEN:A display|SELFIE:A photo of yourself",
    "KEYBOARD:You type on it|INTERNET:The global network|SOFTWARE:Programs and apps|PASSWORD:A secret word to log in|BLUETOOTH:Short-range wireless connection|COMPUTER:A machine that processes data|DOWNLOAD:Getting a file from the internet|BATTERY:Stores power",
    "ALGORITHM:A step-by-step procedure|PROCESSOR:The CPU|BANDWIDTH:How much data a connection can carry|ENCRYPTION:Scrambles data to keep it secret|SMARTPHONE:A pocket computer that makes calls|FIREWALL:A network security barrier|DATABASE:An organised store of data|SEMICONDUCTOR:The material chips are made from",
    "CRYPTOGRAPHY:The science of secret codes|BLOCKCHAIN:The ledger behind Bitcoin|QUBIT:A quantum bit|HEXADECIMAL:A base-16 number system|VIRTUALIZATION:Running virtual machines|MICROCONTROLLER:A tiny computer on a single chip|CYBERSECURITY:Protecting systems from attacks|NANOTECHNOLOGY:Engineering at the scale of atoms"
  ]);
  add("nature", "Nature", "🌿", [
    "SUN:Our nearest star|SEA:Salty water|TREE:Has a trunk and leaves|RAIN:Water falling from clouds|LEAF:Green part of a plant|SNOW:White flakes in winter|ROCK:A hard stone|WIND:Moving air",
    "RIVER:Flows to the sea|FLOWER:Blooms with petals|FOREST:Lots of trees together|OCEAN:A huge body of salt water|STORM:Thunder and lightning|ISLAND:Land surrounded by water|DESERT:A hot, dry, sandy place|VALLEY:Low land between hills",
    "MOUNTAIN:A very tall landform|RAINBOW:Seven colours after rain|VOLCANO:It erupts lava|WATERFALL:Water dropping over a cliff|THUNDER:The sound after lightning|GLACIER:A slow river of ice|BLOSSOM:Flowers on a fruit tree|SUNFLOWER:A tall yellow flower that follows the sun",
    "AVALANCHE:A snow slide down a mountain|PENINSULA:Land almost surrounded by water|TSUNAMI:A giant sea wave|STALACTITE:Hangs from a cave ceiling|ARCHIPELAGO:A group of islands|TUNDRA:A cold, treeless plain|MONSOON:A seasonal rainy wind|HURRICANE:A powerful tropical storm",
    "PHOTOSYNTHESIS:How plants make food from light|EQUINOX:When day and night are equal|ESTUARY:Where a river meets the sea|FJORD:A narrow sea inlet between cliffs|CHLOROPHYLL:Makes leaves green|MANGROVE:Trees that grow in salty coastal water|AURORA BOREALIS:The northern lights|STRATOSPHERE:The layer of air above where planes fly"
  ]);
  add("vehicles", "Vehicles", "🚗", [
    "CAR:Four wheels and a steering wheel|BUS:Carries many passengers|VAN:A box-shaped vehicle|CAB:A taxi|JET:A fast aeroplane|BIKE:Two wheels and pedals|BOAT:Floats on water|TRAM:Runs on rails in a city",
    "TRAIN:Runs on railway tracks|TRUCK:Carries heavy loads|PLANE:Flies in the sky|YACHT:A luxury boat|ROCKET:Launches into space|CANOE:A narrow paddle boat|FERRY:Carries people across water|TAXI:You hail it",
    "BICYCLE:Two wheels you pedal|SCOOTER:Two small wheels and a handlebar|TRACTOR:Pulls a plough on a farm|AMBULANCE:Rushes patients to hospital|SUBMARINE:Travels underwater|MOTORBIKE:A two-wheeler with an engine|LIMOUSINE:A long, fancy car|SPACESHIP:Travels between planets",
    "HELICOPTER:Has spinning rotor blades|HOVERCRAFT:Glides on a cushion of air|SNOWMOBILE:A motor sled for snow|RICKSHAW:A small cart for passengers|CATAMARAN:A boat with two hulls|BULLDOZER:Pushes earth with a big blade|ZEPPELIN:A large rigid airship|GONDOLA:A Venetian boat",
    "VELOCIPEDE:An early type of bicycle|TOBOGGAN:A long sled|TRIMARAN:A boat with three hulls|PALANQUIN:A covered litter carried on poles|DIRIGIBLE:A steerable airship|JUGGERNAUT:A huge, unstoppable truck|BARQUENTINE:A type of sailing ship|AUTOGYRO:An aircraft with a free-spinning rotor"
  ]);
  add("characters", "Famous Characters", "🦸", [
    "ELSA:The Snow Queen of Arendelle|HULK:Big, green and angry|THOR:God of thunder|NEMO:A lost clownfish|YODA:A small green Jedi Master|POOH:A bear who loves honey|BOND:Agent 007|TOM:The cat who chases Jerry",
    "MICKEY:Disney's famous mouse|BATMAN:The Dark Knight|SHREK:An ogre who loves his swamp|MOWGLI:Raised by wolves in the jungle|POPEYE:A sailor who loves spinach|MARIO:Nintendo's jumping plumber|SIMBA:The lion who became king|GOKU:A Saiyan hero of Dragon Ball",
    "SUPERMAN:The Man of Steel|PINOCCHIO:A puppet whose nose grows|SHERLOCK:A famous detective of Baker Street|PIKACHU:An Electric-type Pokemon|HERMIONE:The brightest witch at Hogwarts|GANDALF:A wizard who says 'You shall not pass!'|SPIDER-MAN:Your friendly neighbourhood hero|ALADDIN:Found a lamp with a genie",
    "CINDERELLA:Lost a glass slipper|DUMBLEDORE:Headmaster of Hogwarts|RAPUNZEL:Very long golden hair|VOLDEMORT:He-Who-Must-Not-Be-Named|CHEWBACCA:A Wookiee co-pilot|SPONGEBOB:Lives in a pineapple under the sea|MALEFICENT:A dark fairy with horns|DRACULA:A famous vampire count",
    "RUMPELSTILTSKIN:Spins straw into gold|QUASIMODO:The bell-ringer of Notre-Dame|SCHEHERAZADE:Told a thousand and one tales|GULLIVER:Travelled to Lilliput|FRANKENSTEIN:The scientist who built a creature|DON QUIXOTE:Tilted at windmills|TINKER BELL:Peter Pan's fairy friend|BEOWULF:The hero who fought Grendel"
  ]);
  add("objects", "Everyday Objects", "🏠", [
    "CUP:You drink from it|PEN:You write with it|KEY:Opens a lock|BED:You sleep in it|MAP:Shows you the way|HAT:Worn on your head|BAG:Carries your things|SOAP:Used for washing hands",
    "CHAIR:You sit on it|SPOON:Used for eating soup|CLOCK:Tells the time|PILLOW:Rest your head on it|MIRROR:Shows your reflection|CANDLE:Gives light when lit|BOTTLE:Holds water|WALLET:Holds your money",
    "UMBRELLA:Keeps you dry in the rain|SCISSORS:Used for cutting paper|BLANKET:Keeps you warm in bed|NOTEBOOK:You write notes in it|LANTERN:A portable light|SUITCASE:Packed for travel|STAPLER:Joins papers together|TELEPHONE:Used to make calls",
    "TOOTHBRUSH:Cleans your teeth|THERMOMETER:Measures temperature|CALENDAR:Shows dates|SPATULA:Flips pancakes|COLANDER:Drains pasta|WARDROBE:Stores clothes|CORKSCREW:Opens a wine bottle|BINOCULARS:Make distant things look closer",
    "CHANDELIER:A hanging crystal light|KALEIDOSCOPE:A tube of changing coloured patterns|DEHUMIDIFIER:Removes moisture from the air|THERMOSTAT:Controls the temperature|SECATEURS:Garden pruning shears|ESCALATOR:A moving staircase|TWEEZERS:Pluck tiny things|PERISCOPE:Look over obstacles"
  ]);
  add("science", "Science", "🔬", [
    "ATOM:The smallest unit of an element|CELL:The basic unit of life|GENE:Passed from parents to children|ACID:Has a low pH|LENS:Bends light|IRON:Metal with the symbol Fe|HEAT:A form of energy|GAS:Neither solid nor liquid",
    "ENERGY:The ability to do work|MAGNET:Attracts iron|PLANET:Orbits a star|OXYGEN:We breathe it|FOSSIL:Ancient remains in rock|METAL:Shiny and conducts electricity|LASER:A narrow beam of light|ORBIT:The path around a planet or star",
    "GRAVITY:Keeps us on the ground|ELECTRON:A negatively charged particle|MOLECULE:Atoms bonded together|SKELETON:The body's frame of bones|BACTERIA:Microscopic single-celled life|TELESCOPE:Used to look at stars|ASTEROID:A rocky object orbiting the Sun|FRICTION:A force that resists motion",
    "CHROMOSOME:A structure that carries genes|HYPOTHESIS:A testable prediction|EVAPORATION:Liquid turning into vapour|NEUTRON:A particle with no charge|ISOTOPE:A variant of an element|CATALYST:Speeds up a chemical reaction|ECOSYSTEM:Living things and their environment|VACCINE:Trains the immune system",
    "MITOCHONDRIA:The powerhouse of the cell|BIOLUMINESCENCE:Light made by living things|CHROMATOGRAPHY:Separating a mixture into its parts|THERMODYNAMICS:The science of heat and energy|ELECTROLYSIS:Splitting compounds with electricity|SPECTROSCOPY:Studying light split into colours|NEUROTRANSMITTER:A brain chemical messenger|EXOSKELETON:A hard outer shell, like an insect's"
  ]);
  add("history", "History", "🏛️", [
    "KING:Rules a kingdom|WAR:An armed conflict|FORT:A fortified building|TOMB:A burial place|ERA:A period of history|ARMY:A large group of soldiers|IDOL:A statue that was worshipped|SAGA:A long heroic story",
    "QUEEN:A female ruler|MUMMY:A preserved body from ancient Egypt|SWORD:A bladed weapon|CROWN:Worn by a monarch|CASTLE:A fortified royal home|KNIGHT:A warrior in armour|VIKING:A Norse seafarer|SCROLL:A rolled-up ancient document",
    "PHARAOH:A ruler of ancient Egypt|PYRAMID:A pharaoh's tomb|EMPEROR:Ruler of an empire|SAMURAI:A Japanese warrior|GLADIATOR:Fought in Roman arenas|DYNASTY:A line of rulers from one family|COLOSSEUM:Rome's ancient arena|MONARCHY:Rule by a king or queen",
    "RENAISSANCE:Europe's cultural rebirth|REVOLUTION:The overthrow of a government|HIEROGLYPHICS:Ancient Egyptian picture writing|CRUSADES:Medieval religious wars|PARLIAMENT:A law-making assembly|CONQUISTADOR:A Spanish conqueror of the Americas|INDEPENDENCE:Freedom from outside rule|FEUDALISM:The medieval system of lords and vassals",
    "MESOPOTAMIA:The land between two rivers|BYZANTINE:The eastern Roman Empire|CHARLEMAGNE:A king of the Franks crowned emperor in 800|ZIGGURAT:A stepped temple tower|SUFFRAGETTE:Campaigned for women's votes|ARMISTICE:An agreement to stop fighting|COLONIALISM:One nation ruling another's land|HAMMURABI:A Babylonian king known for his code of laws"
  ]);
  add("gk", "General Knowledge", "🧠", [
    "MOON:Orbits the Earth|YEAR:Has twelve months|WEEK:Seven days|ZERO:Nothing as a number|BOOK:Has pages to read|GOLD:A precious yellow metal|MARS:The red planet|TIME:Measured in hours and minutes",
    "EARTH:Our home planet|PIANO:An instrument with 88 keys|DOZEN:Twelve of something|ATLAS:A book of maps|SEVEN:The number of continents|MAPLE:The leaf on Canada's flag|OLIVE:Its branch is a symbol of peace|LUNAR:Relating to the moon",
    "ALPHABET:A to Z|LIBRARY:A place to borrow books|MUSEUM:Displays historic objects|CENTURY:One hundred years|ORCHESTRA:A large group of musicians|PASSPORT:Needed for travelling abroad|OLYMPICS:Held every four years|LANGUAGE:A system of communication",
    "DICTIONARY:Gives the meanings of words|ENCYCLOPEDIA:A book of knowledge on many subjects|CONSTITUTION:A country's supreme law|DEMOCRACY:Government by the people|ACRONYM:A word made from initials|PALINDROME:Reads the same backwards|MILLENNIUM:A thousand years|LATITUDE:Distance north or south of the equator",
    "ONOMATOPOEIA:A word that sounds like what it means|PSEUDONYM:A pen name|RHYTHM:A regular beat (and a word with no usual vowels)|QUIZZICAL:Mildly puzzled|SYZYGY:An alignment of three celestial bodies|MNEMONIC:A memory aid|ACQUIESCE:To accept reluctantly|CONSCIENTIOUS:Careful and diligent"
  ]);
  H.catById = (id) => H.CATS.find((c) => c.id === id);
})();
