/* ============ GUESS WHO? — expanded universes: more characters, franchises, cartoons and anime ============
   Adding to a subcategory id that already exists appends to it; repeated answers are skipped by GW.add. */
(function () {
  "use strict";
  const add = GW.add;

  /* =================== MOVIE CHARACTERS =================== */
  add("movchar", "marvel", "Marvel", "🦾", [
    ["Ant-Man", "antman|scott lang|ant man", 1, "Scott Lang, the size-changing hero played by Paul Rudd.", "A former thief trying to be a good dad|He uses a special suit and Pym Particles|He can shrink to the size of an insect or grow to giant size|He got stuck in the Quantum Realm for five years|His real name is Scott Lang"],
    ["Wasp", "the wasp|hope van dyne|hope", 2, "Hope van Dyne, the Wasp, played by Evangeline Lilly.", "Her father invented the shrinking technology|Her mother was lost in the Quantum Realm for decades|She has wings and blasters in her suit|She is Ant-Man's partner|Her name is Hope van Dyne"],
    ["Vision", "the vision", 2, "Vision, the synthetic being played by Paul Bettany.", "He was created by Tony Stark, Bruce Banner and Ultron|He has red skin and a yellow cape|He can phase through walls|He was powered by the Mind Stone in his forehead|He fell in love with Wanda Maximoff"],
    ["Thanos", "the mad titan|mad titan", 1, "Thanos, the Mad Titan, played by Josh Brolin.", "He comes from the moon Titan|He believes the universe is overpopulated|He adopted Gamora and Nebula|He wears the Infinity Gauntlet|He wiped out half of all life with a snap"],
    ["Deadpool", "wade wilson|merc with a mouth", 1, "Wade Wilson, the fourth-wall-breaking mercenary played by Ryan Reynolds.", "A mercenary who got healing powers from an experiment|His skin is badly scarred|He talks directly to the audience|He wears a red suit and carries two katanas|His real name is Wade Wilson"],
    ["Wolverine", "logan|james howlett", 1, "Logan, the X-Man played by Hugh Jackman.", "He has lived for over a century|He has a fast healing factor|His skeleton is coated with adamantium|Three metal claws come out of each hand|He is called Logan"],
    ["Star-Lord", "star lord|peter quill|starlord", 1, "Peter Quill, leader of the Guardians of the Galaxy, played by Chris Pratt.", "He was taken from Earth as a boy in 1988|He loves his 'Awesome Mix' cassette tapes|His father was a living planet called Ego|He leads the Guardians of the Galaxy|His real name is Peter Quill"],
    ["Gamora", "", 2, "Gamora, the green-skinned warrior played by Zoe Saldaña.", "She is called 'the deadliest woman in the galaxy'|She has green skin|Her adoptive sister is Nebula|Thanos sacrificed her on Vormir|She is one of the Guardians of the Galaxy"],
    ["Rocket", "rocket raccoon|89p13", 1, "Rocket, the genetically modified raccoon voiced by Bradley Cooper.", "He was experimented on by the High Evolutionary|He is a genius with weapons and engines|He hates being called a 'rodent'|His best friend is a tree|He is a talking raccoon"],
    ["Nick Fury", "fury|nicholas fury", 1, "Nick Fury, director of S.H.I.E.L.D., played by Samuel L. Jackson.", "He started the Avengers Initiative|He wears a long black leather coat|A cat called Goose scratched his eye|He wears an eye patch|He was the director of S.H.I.E.L.D."],
    ["Winter Soldier", "bucky|bucky barnes|james buchanan barnes", 2, "Bucky Barnes, Steve Rogers' best friend, played by Sebastian Stan.", "He grew up in Brooklyn with his best friend|He fell from a train in the Alps|He was brainwashed into an assassin by HYDRA|He has a metal arm|His name is Bucky Barnes"],
    ["Shang-Chi", "shang chi|shaun", 2, "Shang-Chi, the martial artist played by Simu Liu.", "He worked as a valet in San Francisco under the name Shaun|He was trained as an assassin as a child|His father Wenwu led the Ten Rings|He wields the Ten Rings himself|He is a master of kung fu"],
    ["Moon Knight", "marc spector|steven grant", 3, "Marc Spector, the avatar of Khonshu, played by Oscar Isaac.", "He works at a museum gift shop in London as Steven|He has dissociative identity disorder|He serves an Egyptian god of the night sky|His suit is white with a hood|He is the avatar of Khonshu"],
    ["Daredevil", "matt murdock", 2, "Matt Murdock, the blind lawyer-vigilante.", "He was blinded by chemicals as a boy|His other senses became superhuman|He is a lawyer by day|He protects Hell's Kitchen in New York|His name is Matt Murdock"],
    ["Captain Marvel", "carol danvers", 1, "Carol Danvers, played by Brie Larson.", "She was an Air Force pilot|She absorbed the energy of the Tesseract|She lived with the Kree as 'Vers'|Her movie is set in the 1990s with a cat called Goose|Her name is Carol Danvers"],
    ["Okoye", "", 3, "Okoye, general of the Dora Milaje, played by Danai Gurira.", "She is a general in her nation's army|She is bald and fights with a spear|She leads the Dora Milaje|She protects the king of Wakanda"]
  ]);
  add("movchar", "dc", "DC Universe", "🦇", [
    ["Lex Luthor", "luthor|alexander luthor", 1, "Lex Luthor, Superman's archenemy.", "He is a billionaire genius|He is jealous of an alien's power|He runs LexCorp|He is bald|He is Superman's greatest enemy"],
    ["Darkseid", "uxas", 2, "Darkseid, the tyrant of Apokolips.", "He is a god-like tyrant|He rules the planet Apokolips|He searches for the Anti-Life Equation|His eyes fire Omega Beams|His nephew Steppenwolf leads his armies"],
    ["Green Arrow", "oliver queen|arrow", 2, "Oliver Queen, the hooded archer.", "He is a billionaire who was shipwrecked on an island for five years|He came back as a vigilante|He wears a green hood|He is an expert archer with trick ammunition|His name is Oliver Queen"],
    ["Shazam", "billy batson|captain marvel shazam", 2, "Billy Batson, the boy who becomes Shazam.", "He is a foster kid in Philadelphia|An old wizard gave him powers|He turns into an adult superhero|He says one magic word to transform"],
    ["Supergirl", "kara zor-el|kara danvers|kara", 2, "Kara Zor-El, Superman's cousin.", "She was sent from Krypton to look after a baby|She arrived on Earth decades late|Her cousin is the Man of Steel|Her name is Kara Zor-El"],
    ["Nightwing", "dick grayson", 3, "Dick Grayson, the first Robin, as Nightwing.", "He grew up as a circus acrobat|His parents were killed during a trapeze act|He was the first Boy Wonder|He protects the city of Blüdhaven|His name is Dick Grayson"],
    ["Robin", "boy wonder", 1, "Robin, Batman's sidekick.", "Several young people have taken this role|He wears red, green and yellow|He fights beside the Dark Knight|He is called the Boy Wonder"],
    ["Penguin", "oswald cobblepot|oz cobb", 2, "Oswald Cobblepot, the Penguin.", "He is a Gotham crime boss|He walks with a waddle|He always carries an umbrella|Colin Farrell played him in a 2024 series|His name is Oswald Cobblepot"],
    ["Riddler", "the riddler|edward nygma|edward nashton", 2, "Edward Nygma, the Riddler.", "He is obsessed with puzzles|He leaves clues at his crime scenes|Paul Dano played him in 'The Batman'|His costume often has question marks|His name is Edward Nygma"],
    ["Bane", "", 2, "Bane, the masked strongman who broke the Bat.", "He grew up in a prison|He is a tactical genius and very strong|He wears a mask that feeds him painkiller|He famously broke Batman's back|Tom Hardy played him in 'The Dark Knight Rises'"]
  ]);
  add("movchar", "hp", "Harry Potter", "⚡", [
    ["Bellatrix Lestrange", "bellatrix|bella", 2, "Bellatrix Lestrange, Voldemort's devoted follower.", "She escaped from Azkaban prison|She tortured Neville's parents|She is Sirius Black's cousin|She killed Sirius in the Department of Mysteries|Molly Weasley defeated her in the final battle"],
    ["Minerva McGonagall", "mcgonagall|professor mcgonagall", 1, "Professor McGonagall, Head of Gryffindor.", "She is an Animagus who turns into a cat|She teaches Transfiguration|She is Head of Gryffindor House|She became headmistress after the war"],
    ["Neville Longbottom", "neville", 1, "Neville Longbottom, the brave Gryffindor.", "He was raised by his grandmother|He is brilliant at Herbology|He pulled the sword of Gryffindor from the Sorting Hat|He killed Nagini the snake"],
    ["Ginny Weasley", "ginny|ginevra weasley", 2, "Ginny Weasley, Ron's younger sister.", "She is the youngest of seven children|Tom Riddle's diary possessed her in her first year|She plays Chaser for the Gryffindor team|She marries Harry"],
    ["Fred and George Weasley", "fred and george|the weasley twins|weasley twins", 2, "The Weasley twins, pranksters who opened a joke shop.", "They are twins|They gave Harry the Marauder's Map|They left school by flying out on broomsticks|They opened a joke shop in Diagon Alley"]
  ]);
  add("movchar", "starwars", "Star Wars", "🌌", [
    ["Anakin Skywalker", "anakin|ani", 1, "Anakin Skywalker, the Chosen One who became Darth Vader.", "He was a slave on Tatooine|He won a podrace as a boy|He was believed to be the Chosen One|He secretly married Padmé Amidala|He turned to the dark side"],
    ["Rey", "rey skywalker|rey palpatine", 2, "Rey, the scavenger from Jakku.", "She scavenged junk on Jakku|She waited for her family to return|She trained with Luke Skywalker|She is the granddaughter of Palpatine|She took the name Skywalker"],
    ["Kylo Ren", "ben solo|ben", 2, "Kylo Ren (Ben Solo), son of Han and Leia.", "He wears a mask he doesn't need|His lightsaber has a cross-guard|He killed his father on a bridge|His parents are Han Solo and Leia|His real name is Ben Solo"],
    ["C-3PO", "c3po|threepio|see threepio", 1, "C-3PO, the golden protocol droid.", "He was built by Anakin Skywalker|He is fluent in over six million forms of communication|He worries a lot|He is a golden protocol droid"],
    ["The Mandalorian", "mandalorian|din djarin|mando", 1, "Din Djarin, the Mandalorian bounty hunter.", "He never takes off his helmet|He is a bounty hunter|He says 'This is the way'|He protects a small green child called Grogu"],
    ["Emperor Palpatine", "palpatine|darth sidious|sidious|the emperor", 2, "Palpatine, Darth Sidious.", "He rose from senator to chancellor|He secretly led the Sith|He ordered Order 66|He fires lightning from his fingers|He is also called Darth Sidious"],
    ["Padmé Amidala", "padme|padme amidala|queen amidala", 2, "Padmé Amidala, queen and senator of Naboo.", "She was elected queen at 14|She later became a senator|She secretly married a Jedi|She is the mother of Luke and Leia"],
    ["Boba Fett", "boba", 2, "Boba Fett, the bounty hunter.", "He is a clone of the bounty hunter used as the template for the clone army|He wears green Mandalorian armour|He captured Han Solo in carbonite|He survived the Sarlacc pit"]
  ]);
  add("movchar", "lotr", "Lord of the Rings", "💍", [
    ["Galadriel", "lady galadriel|lady of lothlorien", 2, "Galadriel, the elf queen of Lothlórien.", "She is one of the oldest elves in Middle-earth|She rules the forest of Lothlórien|She carries one of the three elven rings|She gave Frodo a phial of light|Cate Blanchett played her"],
    ["Saruman", "saruman the white|curunir", 2, "Saruman, the wizard who betrayed the Fellowship.", "He is the head of the order of wizards|He lives in the tower of Orthanc|He breeds Uruk-hai for Sauron|He is called 'the White'|Christopher Lee played him"],
    ["Bilbo Baggins", "bilbo", 1, "Bilbo Baggins, the hobbit who found the Ring.", "He lives at Bag End|He went on an adventure with thirteen dwarves|He found a magic ring in Gollum's cave|He is Frodo's older cousin and guardian"],
    ["Boromir", "", 3, "Boromir of Gondor.", "He is the son of the Steward of Gondor|He tried to take the Ring from Frodo|He died defending Merry and Pippin from orcs|He said 'One does not simply walk into Mordor'"],
    ["Arwen", "arwen undomiel", 2, "Arwen, the elf who loves Aragorn.", "She is the daughter of Elrond|She gives up immortality for love|She is called the Evenstar of her people|She marries Aragorn"]
  ]);

  add("movchar", "scifi", "Sci-Fi Franchises", "🛸", [
    ["Morpheus", "", 1, "Morpheus, who frees Neo in The Matrix.", "He captains the ship Nebuchadnezzar|He believes he has found 'the One'|He offers a red pill and a blue pill|Laurence Fishburne played him in The Matrix"],
    ["Trinity", "", 2, "Trinity, the hacker from The Matrix.", "She is a famous hacker|She fights in a black leather outfit|She falls in love with Neo|Carrie-Anne Moss played her in The Matrix"],
    ["Jake Sully", "jake", 2, "Jake Sully, the former Marine in Avatar.", "He is a paraplegic former Marine|He controls a blue alien body with his mind|He joins the Na'vi on Pandora|He is the hero of Avatar"],
    ["Neytiri", "", 2, "Neytiri, the Na'vi princess of Avatar.", "She is a skilled hunter with a bow|She is the daughter of a clan leader|She teaches a human the ways of her people|She is a Na'vi on Pandora"],
    ["Optimus Prime", "optimus|orion pax", 1, "Optimus Prime, leader of the Autobots.", "He is a noble leader of robots|He turns into a red and blue truck|He says 'Autobots, roll out!'|He leads the Autobots"],
    ["Bumblebee", "b-127|bee", 1, "Bumblebee, the yellow Autobot.", "He lost his voice and talks through his radio|He is small and loyal|He turns into a yellow car|He is an Autobot"],
    ["Megatron", "", 1, "Megatron, leader of the Decepticons.", "He was once a gladiator on Cybertron|He wants to rule the universe|He is Optimus Prime's greatest enemy|He leads the Decepticons"],
    ["Sarah Connor", "", 2, "Sarah Connor of The Terminator.", "She was a waitress when a killer robot came for her|She learned to fight and survive|Her son will lead the human resistance|A cyborg was sent back in time to kill her"],
    ["T-1000", "t1000", 2, "The liquid-metal T-1000 from Terminator 2.", "It is made of liquid metal|It can copy anyone it touches|It turns its arms into blades|It hunts John Connor in Terminator 2"],
    ["Caesar", "", 2, "Caesar, the intelligent chimpanzee who leads the apes.", "He was raised by a scientist in San Francisco|A drug made him super intelligent|His first word was 'No!'|He leads the apes in Planet of the Apes films"],
    ["Ellen Ripley", "ripley", 2, "Ellen Ripley, hero of the Alien films.", "She is a warrant officer on the Nostromo|She is the only survivor of her crew|She fights a xenomorph|Sigourney Weaver played her in Alien"],
    ["Marty McFly", "marty", 1, "Marty McFly from Back to the Future.", "He is a teenage skateboarder|He travels back to 1955 by accident|He has to get his parents together|His time machine is a DeLorean"],
    ["Doc Brown", "emmett brown|doc|dr emmett brown", 2, "Doc Brown, inventor of the DeLorean time machine.", "He is a wild-haired inventor|He needs 1.21 gigawatts|He says 'Great Scott!'|He built a time machine from a DeLorean"],
    ["E.T.", "et|the extra terrestrial|extra-terrestrial", 1, "E.T., the alien left behind on Earth.", "He is accidentally left behind on Earth|A boy called Elliott hides him|His finger glows|He wants to 'phone home'"]
  ]);
  add("movchar", "actionfr", "Action Franchises", "💥", [
    ["Dominic Toretto", "dom|dom toretto|toretto", 1, "Dom Toretto, played by Vin Diesel in Fast & Furious.", "He loves Corona beer and barbecues|He always talks about family|He drives a black Dodge Charger|He is the hero of Fast & Furious"],
    ["Brian O'Conner", "brian oconner|brian", 2, "Brian O'Conner, played by Paul Walker in Fast & Furious.", "He started as an undercover cop|He fell for Dom's sister Mia|He loves Japanese tuner cars|Paul Walker played him"],
    ["Luke Hobbs", "hobbs", 2, "Luke Hobbs, the federal agent played by Dwayne Johnson.", "He is a federal agent|He first hunted Dom's crew|He teamed up with Deckard Shaw in a spin-off|Dwayne Johnson played him"],
    ["Apollo Creed", "creed|apollo", 2, "Apollo Creed, Rocky's rival and friend.", "He was the heavyweight champion|He gave an unknown boxer a title shot|He later became Rocky's trainer|He died in the ring against Ivan Drago"],
    ["Ivan Drago", "drago", 2, "Ivan Drago, the Soviet boxer in Rocky IV.", "He is a giant Soviet boxer|He says 'I must break you'|He killed Apollo Creed in the ring|Dolph Lundgren played him"],
    ["Katniss Everdeen", "katniss|the mockingjay|mockingjay", 1, "Katniss Everdeen of The Hunger Games.", "She hunts with a bow in District 12|She volunteered to save her sister|She became the Mockingjay|Jennifer Lawrence played her"],
    ["Peeta Mellark", "peeta", 2, "Peeta Mellark of The Hunger Games.", "He is a baker's son|He is great at camouflage painting|He was a tribute from District 12|He loves Katniss"],
    ["President Snow", "coriolanus snow|snow", 2, "President Coriolanus Snow of The Hunger Games.", "He always wears a white rose|He rules from the Capitol|He hosts the Hunger Games|Donald Sutherland played him"],
    ["Alan Grant", "dr alan grant|dr grant", 2, "Dr Alan Grant, the palaeontologist in Jurassic Park.", "He is a palaeontologist who digs up raptors|He doesn't like children at first|He visited a dinosaur theme park|Sam Neill played him"],
    ["Ian Malcolm", "dr ian malcolm", 2, "Dr Ian Malcolm, the chaos theorist of Jurassic Park.", "He is a mathematician who studies chaos theory|He wears black leather|He says 'Life, uh, finds a way'|Jeff Goldblum played him"],
    ["Owen Grady", "owen", 2, "Owen Grady, raptor trainer in Jurassic World.", "He trains velociraptors|His favourite raptor is Blue|He works at Jurassic World|Chris Pratt played him"],
    ["Davy Jones", "", 2, "Davy Jones, captain of the Flying Dutchman.", "He has a face full of tentacles|He keeps his heart in a chest|He captains the Flying Dutchman|He commands the Kraken"],
    ["Hector Barbossa", "barbossa|captain barbossa", 2, "Captain Barbossa from Pirates of the Caribbean.", "He led a mutiny against Jack Sparrow|He was cursed to be undead|He has a pet monkey named Jack|He captains the Black Pearl at times"],
    ["Will Turner", "", 2, "Will Turner from Pirates of the Caribbean.", "He was a blacksmith's apprentice|His father was 'Bootstrap Bill'|He later captains the Flying Dutchman|Orlando Bloom played him"],
    ["Elizabeth Swann", "elizabeth", 2, "Elizabeth Swann from Pirates of the Caribbean.", "She is a governor's daughter|She becomes a pirate king|She loves Will Turner|Keira Knightley played her"],
    ["M", "", 3, "M, head of MI6 in the James Bond films.", "This character runs MI6|Judi Dench and Ralph Fiennes have played them|They give 007 his missions|They are known by a single letter"],
    ["Q", "", 3, "Q, the MI6 gadget master in James Bond.", "He runs MI6's research branch|He gives 007 gadgets and cars|Desmond Llewelyn and Ben Whishaw played him|He is known by one letter"],
    ["Ernst Stavro Blofeld", "blofeld", 3, "Blofeld, head of SPECTRE.", "He leads the criminal organisation SPECTRE|He strokes a white cat|He often has a scar over his eye|He is James Bond's archenemy"]
  ]);

  /* =================== CARTOONS =================== */
  add("cartoons", "disneyc", "Disney Animation", "🏰", [
    ["Minnie Mouse", "minnie", 1, "Minnie Mouse, Mickey's girlfriend.", "She first appeared in 1928|She wears a big polka-dot bow|She wears high heels|She is the girlfriend of Disney's most famous character"],
    ["Goofy", "", 1, "Goofy, Mickey's tall, clumsy friend.", "He is a tall, clumsy dog|He laughs 'a-hyuck!'|His son is called Max|He is one of Mickey's best friends"],
    ["Pluto", "", 1, "Pluto, Mickey's pet dog.", "He is a dog who doesn't talk|He is yellow-orange|He is named after a dwarf planet|He is Mickey's pet"],
    ["Mufasa", "", 1, "Mufasa, the king of the Pride Lands.", "He is a wise king|He teaches his son about the 'circle of life'|He was killed in a wildebeest stampede|He is Simba's father"],
    ["Anna", "princess anna|anna of arendelle", 2, "Anna, Elsa's sister in Frozen.", "She is a princess of Arendelle|She got engaged to a man she just met|She traveled with Kristoff and his reindeer|She is Elsa's younger sister"],
    ["Olaf", "", 1, "Olaf, the snowman from Frozen.", "He was built by two sisters as children|He loves warm hugs|He dreams of summer|He is a talking snowman"],
    ["Genie", "the genie", 1, "The Genie from Aladdin, voiced by Robin Williams.", "He lived in a lamp for 10,000 years|He grants three wishes|He wants to be free|Robin Williams voiced him"],
    ["Stitch", "experiment 626", 1, "Stitch, the blue alien from Lilo & Stitch.", "He was created as Experiment 626|He crash-landed in Hawaii|He is adopted by a girl as a 'dog'|He is a small blue alien"],
    ["Elsa", "queen elsa|elsa of arendelle", 1, "Elsa, the Snow Queen of Frozen.", "She hid her powers from everyone|She built an ice palace on a mountain|She sings 'Let It Go'|She is the Snow Queen of Arendelle"],
    ["Simba", "", 1, "Simba, the Lion King.", "He ran away after his father's death|He grew up with Timon and Pumbaa|Rafiki held him up on Pride Rock|He is the Lion King"],
    ["Timon", "", 2, "Timon, the meerkat from The Lion King.", "He is a fast-talking meerkat|He sings 'Hakuna Matata'|His best friend is a warthog|He helped raise Simba"],
    ["Pumbaa", "", 2, "Pumbaa, the warthog from The Lion King.", "He is a warthog|He is shy about his smell|He eats bugs|His best friend is Timon"],
    ["Baymax", "", 2, "Baymax, the inflatable robot from Big Hero 6.", "He is an inflatable healthcare robot|He asks 'On a scale of 1 to 10, how would you rate your pain?'|He was built by Tadashi Hamada|He is from Big Hero 6"],
    ["Moana", "", 1, "Moana, the wayfinder of Motunui.", "She is the daughter of an island chief|The ocean chose her|She sailed with the demigod Maui|She restored the heart of Te Fiti"],
    ["Rapunzel", "", 1, "Rapunzel from Tangled.", "She lived in a tower for 18 years|She paints on the walls|Her hair has magical healing powers|She wanted to see the floating lights"],
    ["Mirabel Madrigal", "mirabel", 3, "Mirabel from Encanto.", "She lives in a magical house in Colombia|She is the only one in her family without a gift|She wears glasses and an embroidered skirt|She is the hero of Encanto"]
  ]);
  add("cartoons", "pixar", "Pixar & DreamWorks", "🎈", [
    ["Mater", "tow mater", 1, "Mater, the rusty tow truck in Cars.", "He is a rusty tow truck|He is from Radiator Springs|He is great at driving backwards|His best friend is Lightning McQueen"],
    ["Nemo", "", 1, "Nemo, the clownfish from Finding Nemo.", "He has a small 'lucky fin'|He was taken by a diver|He ended up in a dentist's fish tank in Sydney|He is a little clownfish"],
    ["Mr. Incredible", "bob parr|mr incredible", 1, "Bob Parr, Mr. Incredible.", "He is super strong|He was forced to work in an insurance office|His family all have powers|His real name is Bob Parr"],
    ["Elastigirl", "helen parr|mrs incredible", 2, "Helen Parr, Elastigirl.", "She can stretch her body|She is a mum of three|She is married to Mr. Incredible|Her name is Helen Parr"],
    ["Joy", "", 2, "Joy from Inside Out.", "She lives inside an 11-year-old's head|She is always positive|She glows yellow|She is one of Riley's emotions"],
    ["Sadness", "", 2, "Sadness from Inside Out.", "She lives inside Riley's head|She is blue and wears glasses|She learns that being sad is important too|She is an emotion in Inside Out"],
    ["Mike Wazowski", "mike", 1, "Mike Wazowski from Monsters, Inc.", "He is a green monster|He has one big eye|He works at Monsters, Inc.|His best friend is Sulley"],
    ["Sulley", "james p sullivan|sullivan|sully", 1, "James P. Sullivan from Monsters, Inc.", "He is a huge blue furry monster with purple spots|He was the top scarer|He looks after a girl he calls 'Boo'|His best friend is Mike"],
    ["Remy", "", 2, "Remy, the rat chef in Ratatouille.", "He has a great sense of smell|He dreams of being a chef in Paris|He controls a cook by pulling his hair|He is a rat"],
    ["Carl Fredricksen", "carl", 2, "Carl Fredricksen from Up.", "He is a grumpy old widower|He tied thousands of balloons to his house|He flew to South America|He is the hero of Up"],
    ["Jessie", "jessie the cowgirl", 2, "Jessie, the cowgirl from Toy Story 2.", "She is a cowgirl toy|She yodels|She was abandoned by her owner Emily|She is Woody's friend in Toy Story"],
    ["Edna Mode", "e|edna", 2, "Edna Mode, superhero costume designer in The Incredibles.", "She designs superhero costumes|She is tiny with big round glasses|She says 'No capes!'|She appears in The Incredibles"],
    ["Miguel Rivera", "miguel", 3, "Miguel from Coco.", "He wants to be a musician|Music is banned in his family|He visits the Land of the Dead|He is the hero of Coco"],
    ["Donkey", "", 1, "Donkey from Shrek.", "He never stops talking|He married a dragon|He asks 'Are we there yet?'|He is Shrek's best friend"],
    ["Puss in Boots", "puss", 2, "Puss in Boots from Shrek 2.", "He is a sword-fighting cat|He does big sad eyes|He has a Spanish accent|He wears a feathered hat and carries a sword"]
  ]);
  add("cartoons", "classic", "Classic Cartoons", "🐭", [
    ["Jerry", "jerry mouse", 1, "Jerry the mouse of Tom and Jerry.", "He is a small brown mouse|He lives in a hole in the wall|He always outsmarts a cat|His enemy is Tom"],
    ["Daffy Duck", "daffy", 1, "Daffy Duck of Looney Tunes.", "He is a black bird with an orange beak|He lisps|He says 'You're despicable!'|He is a Looney Tunes star"],
    ["Shaggy", "shaggy rogers|norville rogers", 1, "Shaggy of Scooby-Doo.", "He is always hungry|He wears a green shirt|He says 'Zoinks!'|His best friend is a Great Dane"],
    ["Pink Panther", "the pink panther", 1, "The Pink Panther.", "He first appeared in a film's opening credits|He never speaks|A famous jazz theme plays when he appears|He is a cartoon cat of an unusual colour"],
    ["Patrick Star", "patrick", 1, "Patrick Star from SpongeBob SquarePants.", "He lives under a rock|He is not very smart|He is pink|His best friend is SpongeBob"],
    ["Squidward", "squidward tentacles", 1, "Squidward Tentacles.", "He plays the clarinet badly|He works as a cashier at the Krusty Krab|He is grumpy|He is SpongeBob's neighbour"],
    ["Nobita", "nobita nobi", 1, "Nobita Nobi from Doraemon.", "He is lazy and bad at school|He is bullied by Gian and Suneo|He has a crush on Shizuka|His friend is a robot cat from the future"],
    ["Tweety", "tweety bird|tweety pie", 1, "Tweety, the yellow canary.", "He is a small yellow canary|He says 'I tawt I taw a puddy tat!'|A cat is always trying to catch him|He is a Looney Tunes bird"],
    ["Sylvester", "sylvester the cat", 2, "Sylvester the cat.", "He is a black-and-white cat|He lisps 'Sufferin' succotash!'|He always chases Tweety"],
    ["Road Runner", "roadrunner", 1, "The Road Runner.", "He is a very fast bird|He says 'Meep meep!'|A coyote can never catch him"],
    ["Wile E. Coyote", "wile e coyote|coyote", 2, "Wile E. Coyote.", "He orders gadgets from ACME|His plans always backfire|He falls off cliffs a lot|He chases the Road Runner"],
    ["Fred Flintstone", "fred", 1, "Fred Flintstone.", "He lives in Bedrock|He works at a quarry|He shouts 'Yabba dabba doo!'|He is the head of the Stone Age family"],
    ["Garfield", "", 1, "Garfield, the lazy cat.", "He is a lazy orange cat|He hates Mondays|He loves lasagna|His owner is Jon Arbuckle"],
    ["Snoopy", "", 1, "Snoopy from Peanuts.", "He sleeps on top of his doghouse|He imagines himself as a WWI flying ace|His best friend is a bird called Woodstock|He is Charlie Brown's beagle"],
    ["Johnny Bravo", "", 2, "Johnny Bravo.", "He has a huge blond quiff|He always wears sunglasses|He flexes his muscles|He tries to impress women and always fails"],
    ["Dexter", "", 2, "Dexter from Dexter's Laboratory.", "He is a boy genius|He has a secret lab behind his bookshelf|His sister Dee Dee keeps ruining things|He speaks with an accent"],
    ["Courage", "courage the cowardly dog", 2, "Courage the Cowardly Dog.", "He is a pink dog|He gets scared of everything|He lives in the middle of Nowhere|He protects his owners from spooky things"],
    ["Bart Simpson", "bart", 1, "Bart Simpson.", "He is a 10-year-old prankster|He skateboards|He says 'Eat my shorts!'|He is Homer's son"],
    ["Woody Woodpecker", "", 2, "Woody Woodpecker.", "He is a red-headed bird|He has a famous laugh|He pecks wood|He is a bird that pecks holes in trees"],
    ["Motu", "motu patlu", 2, "Motu from Motu Patlu.", "He lives in Furfuri Nagar|He gets super strength from eating samosas|His thin best friend is Patlu|He is from an Indian cartoon"]
  ]);

  /* =================== ANIME =================== */
  add("anime", "dragonball", "Dragon Ball", "🐉", [
    ["Vegeta", "prince vegeta", 1, "Vegeta, prince of the Saiyans.", "He is very proud|He is the prince of a warrior race|He married Bulma|He says 'It's over 9000!'|He is Goku's rival"],
    ["Gohan", "son gohan", 1, "Gohan, Goku's elder son.", "He would rather study than fight|He was trained by Piccolo|He defeated Cell as a child|He is Goku's eldest son"],
    ["Piccolo", "", 1, "Piccolo, the Namekian.", "He is green and tall|He has antennae|He started as Goku's enemy|He trained Gohan|He is a Namekian"],
    ["Frieza", "freeza|lord frieza", 1, "Frieza, the galactic tyrant.", "He is a galactic tyrant|He has several transformations|He destroyed the Saiyans' planet|Goku first went Super Saiyan to beat him"],
    ["Cell", "perfect cell", 2, "Cell, the bio-android.", "He was built by Dr. Gero|He absorbed Androids 17 and 18|He held his own fighting tournament|Gohan defeated him"],
    ["Majin Buu", "buu|kid buu|fat buu", 2, "Majin Buu.", "He is pink|He can turn people into candy|He has several forms|A wizard called Babidi released him"],
    ["Trunks", "future trunks", 2, "Trunks, Vegeta's son.", "He came back from a dark future|He carries a sword|He has lavender hair|He is Vegeta and Bulma's son"],
    ["Broly", "", 2, "Broly, the Legendary Super Saiyan.", "He is called the Legendary Super Saiyan|He was banished as a baby|He has huge uncontrollable power|He starred in his own film"],
    ["Bulma", "", 2, "Bulma, the genius inventor.", "She is a genius inventor|Her family runs Capsule Corporation|She built the Dragon Radar|She married Vegeta"],
    ["Krillin", "kuririn", 2, "Krillin, Goku's best friend.", "He is short and bald|He has six dots on his forehead|He married Android 18|He is Goku's best friend"]
  ]);
  add("anime", "naruto", "Naruto", "🍥", [
    ["Sasuke Uchiha", "sasuke", 1, "Sasuke Uchiha, Naruto's rival.", "He is the last of his clan|He wants revenge on his brother|He left the village to train with Orochimaru|He is Naruto's rival"],
    ["Sakura Haruno", "sakura", 1, "Sakura Haruno.", "She has pink hair|She has super strength|She became a medical ninja|She is on Team 7"],
    ["Kakashi Hatake", "kakashi", 1, "Kakashi Hatake, the Copy Ninja.", "He always wears a mask|He reads 'Icha Icha' books|He has a Sharingan eye|He leads Team 7"],
    ["Itachi Uchiha", "itachi", 1, "Itachi Uchiha.", "He was a member of the Akatsuki|He wiped out his own clan|He did it to protect the village|He is Sasuke's older brother"],
    ["Madara Uchiha", "madara", 2, "Madara Uchiha.", "He co-founded the Hidden Leaf Village|He fought Hashirama at the Valley of the End|He planned the Infinite Tsukuyomi|He is a legend of the clan with the Sharingan"],
    ["Hinata Hyuga", "hinata", 2, "Hinata Hyuga.", "She is shy|She has the Byakugan|She has always loved Naruto|She marries him"],
    ["Jiraiya", "pervy sage", 2, "Jiraiya, one of the Legendary Sannin.", "He writes romance novels|He is one of the Legendary Sannin|Naruto calls him 'Pervy Sage'|He trained Naruto"],
    ["Gaara", "", 2, "Gaara of the Sand.", "He has the kanji for 'love' on his forehead|He controls sand|He carries a gourd on his back|He becomes Kazekage"],
    ["Orochimaru", "", 2, "Orochimaru, the snake sannin.", "He is obsessed with immortality|He is pale with snake-like features|He gave Sasuke a curse mark|He is one of the Legendary Sannin"]
  ]);
  add("anime", "onepiece", "One Piece", "🏴‍☠️", [
    ["Roronoa Zoro", "zoro", 1, "Roronoa Zoro, the three-sword swordsman.", "He fights with three swords|He gets lost everywhere|He has green hair|He is Luffy's first crewmate"],
    ["Nami", "", 1, "Nami, navigator of the Straw Hats.", "She loves money and tangerines|She draws maps|She uses a weather staff|She is the Straw Hats' navigator"],
    ["Sanji", "black leg sanji|vinsmoke sanji", 1, "Sanji, cook of the Straw Hats.", "He fights only with his legs|He is a cook|He falls for every pretty woman|He is the Straw Hats' chef"],
    ["Tony Tony Chopper", "chopper", 1, "Chopper, the reindeer doctor.", "He is a reindeer who ate a Devil Fruit|He has a blue nose|He is a doctor|He is part of the Straw Hat crew"],
    ["Nico Robin", "robin", 2, "Nico Robin, the archaeologist.", "She can read ancient Poneglyphs|She can sprout extra arms anywhere|She is an archaeologist|She joined the Straw Hats"],
    ["Shanks", "red-haired shanks|red haired shanks", 1, "Red-Haired Shanks.", "He is one of the Four Emperors|He lost his arm saving a boy|He gave Luffy his straw hat|He has red hair"],
    ["Portgas D. Ace", "ace|portgas d ace|fire fist ace", 2, "Portgas D. Ace.", "He ate the Flame-Flame Fruit|He was a Whitebeard pirate|He is the son of Gol D. Roger|He is Luffy's sworn brother"],
    ["Trafalgar Law", "law|trafalgar d water law", 2, "Trafalgar Law.", "He is called the 'Surgeon of Death'|He ate the Op-Op Fruit|He captains the Heart Pirates|He allied with Luffy"],
    ["Blackbeard", "marshall d teach|teach", 2, "Blackbeard (Marshall D. Teach).", "He betrayed Whitebeard's crew|He has two Devil Fruit powers|He controls darkness|His real name is Marshall D. Teach"],
    ["Usopp", "god usopp", 2, "Usopp, the sniper.", "He has a long nose|He tells tall tales|He is a sharpshooter with a slingshot|He is the Straw Hats' sniper"]
  ]);
  add("anime", "demonslayer", "Demon Slayer", "🗡️", [
    ["Nezuko Kamado", "nezuko", 1, "Nezuko, Tanjiro's demon sister.", "She was turned into a demon|She carries a bamboo muzzle in her mouth|She travels in a box on her brother's back|She is Tanjiro's sister"],
    ["Zenitsu Agatsuma", "zenitsu", 1, "Zenitsu Agatsuma.", "He is a coward who cries a lot|He fights best when asleep|He uses Thunder Breathing|He has yellow hair"],
    ["Inosuke Hashibira", "inosuke", 1, "Inosuke Hashibira.", "He was raised by boars|He wears a boar's head mask|He fights with two jagged swords|He uses Beast Breathing"],
    ["Giyu Tomioka", "giyu|tomioka", 2, "Giyu Tomioka, the Water Hashira.", "He spared Nezuko at the very start|He is quiet and serious|He is the Water Hashira"],
    ["Muzan Kibutsuji", "muzan", 2, "Muzan Kibutsuji, the first demon.", "He is the first demon|He disguises himself as a human in Tokyo|He leads the Twelve Kizuki|He turned Nezuko into a demon"],
    ["Kyojuro Rengoku", "rengoku", 2, "Kyojuro Rengoku, the Flame Hashira.", "He has fiery hair|He is always cheerful|He fought Akaza on the Mugen Train|He is the Flame Hashira"],
    ["Shinobu Kocho", "shinobu", 3, "Shinobu Kocho, the Insect Hashira.", "She is too weak to cut off a demon's head|She kills demons with poison|She smiles all the time|She is the Insect Hashira"]
  ]);
  add("anime", "moreanime", "Anime Icons", "⭐", [
    ["Mikasa Ackerman", "mikasa", 1, "Mikasa Ackerman of Attack on Titan.", "She always wears a red scarf|She is incredibly strong|She protects Eren no matter what|She is from Attack on Titan"],
    ["Armin Arlert", "armin", 2, "Armin Arlert of Attack on Titan.", "He is a brilliant strategist|He dreams of seeing the ocean|He becomes the Colossal Titan|He is Eren's childhood friend"],
    ["Ryuk", "", 2, "Ryuk, the Shinigami of Death Note.", "He is a Shinigami (death god)|He dropped a notebook into the human world|He loves apples|He follows Light Yagami"],
    ["Yuji Itadori", "itadori|yuji", 1, "Yuji Itadori of Jujutsu Kaisen.", "He is super athletic|He swallowed a cursed finger|He hosts the King of Curses|He is the hero of Jujutsu Kaisen"],
    ["Ryomen Sukuna", "sukuna", 2, "Sukuna, the King of Curses.", "He is called the King of Curses|He has four arms in his true form|His fingers are cursed objects|He lives inside Yuji Itadori"],
    ["Megumi Fushiguro", "megumi", 2, "Megumi Fushiguro of Jujutsu Kaisen.", "He summons shadow animals called shikigami|His spiky hair is black|Gojo is his guardian|He is in Jujutsu Kaisen"],
    ["Rukia Kuchiki", "rukia", 2, "Rukia Kuchiki of Bleach.", "She gave her powers to a human|She has an ice sword|She is a Soul Reaper|She is from Bleach"],
    ["Sosuke Aizen", "aizen", 2, "Sosuke Aizen of Bleach.", "He seemed kind and gentle|He betrayed the Soul Society|He has the power of complete hypnosis|He is the main villain of Bleach"],
    ["All Might", "toshinori yagi", 1, "All Might, the Symbol of Peace.", "He is the 'Symbol of Peace'|His real form is very skinny|He passed One For All to Deku|He is the number one hero"],
    ["Katsuki Bakugo", "bakugo|kacchan", 1, "Katsuki Bakugo of My Hero Academia.", "He is very angry all the time|He makes explosions from his sweat|He calls Deku names|He is from My Hero Academia"],
    ["Shoto Todoroki", "todoroki", 2, "Shoto Todoroki of My Hero Academia.", "His hair is half red and half white|He has a scar over his eye|He can use fire and ice|He is from My Hero Academia"],
    ["Genos", "", 2, "Genos of One Punch Man.", "He is a cyborg|He wants revenge for his family|He became Saitama's disciple|He is from One Punch Man"],
    ["Anya Forger", "anya", 1, "Anya Forger of Spy x Family.", "She is a little girl who can read minds|She loves peanuts and spy cartoons|Her pretend father is a spy|She is from Spy x Family"],
    ["Loid Forger", "loid|twilight", 2, "Loid Forger (Twilight) of Spy x Family.", "He is a master spy|His codename is Twilight|He builds a fake family for a mission|He is Anya's adoptive father"],
    ["Yor Forger", "yor|thorn princess", 2, "Yor Forger of Spy x Family.", "She is a secret assassin|Her codename is Thorn Princess|She works at City Hall|She is Anya's adoptive mother"],
    ["Alphonse Elric", "al|alphonse", 2, "Alphonse Elric of Fullmetal Alchemist.", "He lost his body in an alchemy accident|His soul is bound to a suit of armour|He is very gentle|He is Edward's younger brother"],
    ["Takemichi Hanagaki", "takemichi", 3, "Takemichi Hanagaki of Tokyo Revengers.", "He is a down-on-his-luck 26-year-old|He travels back in time 12 years|He joins a delinquent gang|He is the hero of Tokyo Revengers"],
    ["Manjiro Sano", "mikey", 2, "Mikey (Manjiro Sano) of Tokyo Revengers.", "He leads the Tokyo Manji Gang|He is small but an amazing fighter|He loves dorayaki|He is called Mikey"],
    ["Meowth", "", 1, "Meowth of Team Rocket.", "He is a Pokémon who can talk|He taught himself to walk on two legs|He is part of Team Rocket|He has a coin on his head"],
    ["Misty", "", 2, "Misty from Pokémon.", "She is a Water-type Gym Leader|Ash 'borrowed' and wrecked her bike|Her favourite Pokémon include Staryu and Psyduck|She travelled with Ash"]
  ]);
})();
