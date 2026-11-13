/* ============ GUESS WHO? — worldwide movies and more TV shows ============ */
(function () {
  "use strict";
  const add = GW.add;

  /* =================== HOLLYWOOD BY GENRE =================== */
  add("movies", "action", "Action Movies", "💥", [
    ["Die Hard", "", 1, "Die Hard (1988).", "It is set during a Christmas party|A cop is trapped in a Los Angeles skyscraper|The villain is Hans Gruber|Bruce Willis plays John McClane"],
    ["Mad Max: Fury Road", "mad max|fury road", 2, "Mad Max: Fury Road (2015).", "It is mostly one long chase across a desert|A guitarist plays a flame-throwing guitar on a truck|Charlize Theron plays Imperator Furiosa|Tom Hardy plays a wandering survivor"],
    ["The Raid", "the raid redemption|serbuan maut", 3, "The Raid (2011), an Indonesian action film.", "It was filmed in Indonesia|A police team fights its way up a tower block|It shows off pencak silat fighting|Iko Uwais stars"],
    ["Speed", "", 2, "Speed (1994).", "A bomb is planted on a city bus|The bus explodes if it goes below 50 mph|Sandra Bullock drives the bus|Keanu Reeves plays a SWAT officer"],
    ["Top Gun", "", 1, "Top Gun (1986).", "It is about an elite naval flying school|It features 'Take My Breath Away'|The pilots play beach volleyball|Tom Cruise plays 'Maverick'"],
    ["Mission: Impossible – Fallout", "mission impossible fallout|fallout", 3, "Mission: Impossible – Fallout (2018).", "Henry Cavill reloads his arms in a famous fight|Tom Cruise broke his ankle jumping between rooftops|It has a helicopter chase in Kashmir-set mountains|It is the sixth film in a spy series"],
    ["John Wick", "", 1, "John Wick (2014).", "A retired hitman's dog is killed|Its world has a hotel for assassins called the Continental|He is called 'Baba Yaga'|Keanu Reeves stars"],
    ["Gladiator", "", 1, "Gladiator (2000).", "A Roman general is betrayed by an emperor's son|He becomes a slave and fights in arenas|'Are you not entertained?' is a famous line|Russell Crowe plays Maximus"]
  ]);
  add("movies", "adventure", "Adventure Movies", "🗺️", [
    ["Raiders of the Lost Ark", "indiana jones|raiders", 1, "Raiders of the Lost Ark (1981).", "It is set in 1936|An archaeologist races Nazis to a holy relic|He runs from a giant rolling boulder|It introduced Indiana Jones"],
    ["Jumanji", "", 1, "Jumanji (1995).", "Two children find a board game|Every roll unleashes jungle dangers|A man was trapped inside the game for 26 years|Robin Williams stars"],
    ["The Goonies", "goonies", 2, "The Goonies (1985).", "A group of kids find a treasure map|They search for One-Eyed Willy's ship|Their gang motto is 'never say die!'"],
    ["Life of Pi", "", 2, "Life of Pi (2012).", "It is based on a Yann Martel novel|A boy is shipwrecked in the Pacific|He shares a lifeboat with a tiger named Richard Parker|It was directed by Ang Lee"],
    ["Cast Away", "castaway", 2, "Cast Away (2000).", "A FedEx employee survives a plane crash|He is stranded on an island for four years|He makes friends with a volleyball named Wilson|Tom Hanks stars"],
    ["The Revenant", "revenant", 2, "The Revenant (2015).", "It is set in the 1820s American wilderness|A frontiersman is mauled by a bear|He is left for dead and seeks revenge|It finally won Leonardo DiCaprio an Oscar"],
    ["Into the Wild", "", 3, "Into the Wild (2007).", "It is based on a true story|A graduate gives away his savings and hitchhikes|He lives in an abandoned bus in Alaska|Sean Penn directed it"]
  ]);
  add("movies", "fantasy", "Fantasy Movies", "🧙", [
    ["The Lord of the Rings: The Fellowship of the Ring", "the fellowship of the ring|fellowship of the ring|lotr", 1, "The Fellowship of the Ring (2001).", "It was filmed in New Zealand|Nine companions set out on a quest|A wizard says 'You shall not pass!'|A hobbit must destroy a piece of cursed jewellery"],
    ["Harry Potter and the Philosopher's Stone", "harry potter and the sorcerer's stone|philosophers stone|sorcerers stone", 1, "Harry Potter and the Philosopher's Stone (2001).", "It has a different title in America|A boy learns he is a wizard on his 11th birthday|He boards a train at platform 9¾|It is the first film in a famous wizard series"],
    ["Pan's Labyrinth", "el laberinto del fauno", 3, "Pan's Labyrinth (2006).", "It is set in Spain in 1944|A girl meets a faun in a stone maze|A monster has eyes in its hands|Guillermo del Toro directed it"],
    ["The Wizard of Oz", "wizard of oz", 1, "The Wizard of Oz (1939).", "A tornado carries a girl from Kansas|She follows a yellow brick road|She wears ruby slippers|Judy Garland sings 'Over the Rainbow'"],
    ["The Chronicles of Narnia: The Lion, the Witch and the Wardrobe", "narnia|the lion the witch and the wardrobe", 2, "The Lion, the Witch and the Wardrobe (2005).", "Four children are sent away during the Blitz|They step through a piece of furniture|An evil queen keeps it always winter|A great talking beast named Aslan rules the land"],
    ["Avatar", "", 1, "Avatar (2009).", "It was the highest-grossing film ever|It is set on the moon Pandora|Humans mine a mineral called unobtanium|The Na'vi are tall and blue"],
    ["Stardust", "", 3, "Stardust (2007).", "A young man crosses a wall into a magical land|He hunts for a fallen star|The star turns out to be a woman|It is based on a Neil Gaiman novel"]
  ]);
  add("movies", "comedy", "Comedy Movies", "😂", [
    ["Home Alone", "", 1, "Home Alone (1990).", "A family flies to Paris for Christmas|They forget their eight-year-old son|He sets traps for two burglars|Macaulay Culkin stars"],
    ["The Hangover", "hangover", 1, "The Hangover (2009).", "Friends go to Las Vegas for a bachelor party|They wake up with no memory of the night|There is a tiger in their hotel bathroom|They have to find the missing groom"],
    ["Mrs. Doubtfire", "mrs doubtfire", 2, "Mrs. Doubtfire (1993).", "A divorced dad wants to see his children|He disguises himself as an elderly Scottish nanny|His face ends up in a cake|Robin Williams stars"],
    ["The Mask", "", 2, "The Mask (1994).", "A shy bank clerk finds an ancient wooden face covering|It turns him into a green-faced cartoon wild man|He says 'Smokin'!'|Jim Carrey stars"],
    ["Superbad", "", 3, "Superbad (2007).", "Two high-school friends try to buy alcohol for a party|One friend has a fake ID saying 'McLovin'|Jonah Hill and Michael Cera star"],
    ["Hera Pheri", "", 1, "Hera Pheri (2000).", "Three broke men answer a wrong-number ransom call|Paresh Rawal plays Baburao Ganpatrao Apte|Its lines are among India's most famous memes|Akshay Kumar and Suniel Shetty star"],
    ["Andaz Apna Apna", "", 2, "Andaz Apna Apna (1994).", "Two slackers compete to marry an heiress|It has the villain Crime Master Gogo|It flopped at first but became a cult classic|Aamir Khan and Salman Khan star"],
    ["In Harihar Nagar", "", 2, "In Harihar Nagar (1990).", "Four friends in a colony try to impress a new neighbour|They get caught up in a murder mystery|It is a Malayalam comedy classic by Siddique-Lal"]
  ]);
  add("movies", "romance", "Romance Movies", "💘", [
    ["The Notebook", "notebook", 1, "The Notebook (2004).", "An old man reads a story to a woman with dementia|A young couple meets at a summer carnival|He builds her a house he promised her|Ryan Gosling and Rachel McAdams star"],
    ["Pride & Prejudice", "pride and prejudice", 2, "Pride & Prejudice (2005).", "It is based on a Jane Austen novel|Elizabeth Bennet clashes with Mr. Darcy|Keira Knightley stars"],
    ["La La Land", "la la land", 1, "La La Land (2016).", "It begins with a song on a jammed freeway|A jazz pianist and an aspiring actress fall in love|It was wrongly announced as Best Picture at the Oscars|Ryan Gosling and Emma Stone star"],
    ["Notting Hill", "", 2, "Notting Hill (1999).", "A London bookshop owner meets a Hollywood star|He spills orange juice on her|Hugh Grant and Julia Roberts star"],
    ["Before Sunrise", "", 3, "Before Sunrise (1995).", "Two strangers meet on a train|They spend one night walking around Vienna|Two sequels follow them years later|Ethan Hawke and Julie Delpy star"],
    ["Jab We Met", "", 1, "Jab We Met (2007).", "A heartbroken businessman meets a talkative girl on a train|She says 'Main apni favourite hoon!'|Kareena Kapoor plays Geet|Shahid Kapoor plays Aditya"],
    ["Ennu Ninte Moideen", "", 2, "Ennu Ninte Moideen (2015).", "It is based on a true story from Kozhikode|Two lovers from different religions wait for each other for decades|Prithviraj and Parvathy star"],
    ["Sita Ramam", "", 2, "Sita Ramam (2022).", "An army officer receives letters from a woman calling herself his wife|It is set in 1964|Dulquer Salmaan and Mrunal Thakur star"]
  ]);
  add("movies", "superhero", "Superhero Movies", "🦸", [
    ["Spider-Man 2", "spiderman 2|spider man 2", 2, "Spider-Man 2 (2004).", "It is directed by Sam Raimi|A hero loses his powers for a while|He stops a runaway train with his webs|Doctor Octopus is the villain"],
    ["Logan", "", 2, "Logan (2017).", "It is set in 2029|An old mutant cares for Professor X|He protects a girl called Laura|It is Hugh Jackman's farewell as Wolverine"],
    ["The Incredibles", "incredibles", 1, "The Incredibles (2004).", "A family of supers lives in hiding|The villain is a former fan called Syndrome|A costume designer says 'No capes!'|It is a Pixar film"],
    ["X-Men", "xmen|x men", 2, "X-Men (2000).", "It begins in a Nazi camp in 1944|A school for gifted youngsters trains mutants|Hugh Jackman plays a clawed hero|Professor X fights Magneto"],
    ["Minnal Murali", "", 2, "Minnal Murali (2021).", "Two men are struck by lightning in a Kerala village|A tailor becomes a masked hero|Tovino Thomas stars|Basil Joseph directed it"],
    ["Krrish", "", 2, "Krrish (2006).", "A boy inherits powers from his father, who met an alien|He wears a black mask|It is a sequel to 'Koi... Mil Gaya'|Hrithik Roshan stars"],
    ["Hanu-Man", "hanuman|hanu man", 3, "Hanu-Man (2024).", "A petty thief in the village of Anjanadri gets powers from a gem|The gem holds a drop of Lord Hanuman's blood|Teja Sajja stars|Prasanth Varma directed it"]
  ]);
  add("movies", "mystery", "Mystery Movies", "🔎", [
    ["Knives Out", "", 1, "Knives Out (2019).", "A crime novelist dies after his 85th birthday party|A nurse who can't lie without vomiting is a key witness|Detective Benoit Blanc investigates|Daniel Craig stars"],
    ["Murder on the Orient Express", "orient express", 2, "Murder on the Orient Express.", "A train is stuck in a snowdrift|A rich passenger is found stabbed 12 times|Hercule Poirot investigates|It is based on an Agatha Christie novel"],
    ["The Prestige", "prestige", 2, "The Prestige (2006).", "Two rival magicians in Victorian London|One performs 'The Transported Man'|Nikola Tesla builds a machine|Christopher Nolan directed it"],
    ["Rear Window", "", 3, "Rear Window (1954).", "A photographer is stuck at home with a broken leg|He spies on his neighbours|He suspects one of murder|Alfred Hitchcock directed it"],
    ["Kahaani", "", 2, "Kahaani (2012).", "A pregnant woman searches Kolkata for her missing husband|It is set during Durga Puja|It has a huge twist ending|Vidya Balan stars"],
    ["Ratsasan", "ratchasan", 2, "Ratsasan (2018).", "A would-be film-maker becomes a policeman|He hunts a serial killer of schoolgirls|The killer leaves a broken doll|Vishnu Vishal stars"],
    ["Anjaam Pathiraa", "", 3, "Anjaam Pathiraa (2020).", "A criminologist helps police hunt a killer of policemen|The killer leaves victims' hearts out|Kunchacko Boban stars|It is a Malayalam thriller"]
  ]);
  add("movies", "crime", "Crime Movies", "🕵️", [
    ["Goodfellas", "", 2, "Goodfellas (1990).", "It follows Henry Hill's life in the Mafia|It opens with 'As far back as I can remember...'|Joe Pesci asks 'Funny how?'|Martin Scorsese directed it"],
    ["The Departed", "departed", 2, "The Departed (2006).", "A cop goes undercover in a gang|A gangster's mole joins the police|It is set in Boston|It is a remake of 'Infernal Affairs'"],
    ["Scarface", "", 2, "Scarface (1983).", "A Cuban refugee builds a drug empire in Miami|He has a mountain of cocaine on his desk|'Say hello to my little friend!'|Al Pacino plays Tony Montana"],
    ["Gangs of Wasseypur", "", 2, "Gangs of Wasseypur (2012).", "It spans 60 years of a coal-mining feud|It was released in two parts|Manoj Bajpayee and Nawazuddin Siddiqui star|Anurag Kashyap directed it"],
    ["Satya", "", 3, "Satya (1998).", "A newcomer to Mumbai falls in with gangsters|Manoj Bajpayee plays Bhiku Mhatre|Ram Gopal Varma directed it"],
    ["Vada Chennai", "", 3, "Vada Chennai (2018).", "A carrom player gets drawn into gang wars|It is set in the north of a big Tamil city over decades|Dhanush stars|Vetrimaaran directed it"],
    ["Pulp Fiction", "", 1, "Pulp Fiction (1994).", "It tells stories out of order|Two hitmen talk about a 'Royale with Cheese'|John Travolta and Uma Thurman dance|Quentin Tarantino directed it"]
  ]);
  add("movies", "historical", "Historical Movies", "🏛️", [
    ["Braveheart", "", 2, "Braveheart (1995).", "It is set in the 13th century|A Scottish warrior leads a revolt against England|He shouts 'Freedom!'|Mel Gibson directed and starred"],
    ["Schindler's List", "schindlers list", 2, "Schindler's List (1993).", "It is mostly in black and white|A German businessman saves over 1,000 Jewish workers|A girl in a red coat stands out|Steven Spielberg directed it"],
    ["Gandhi", "", 1, "Gandhi (1982).", "It won eight Oscars|It begins with an assassination in 1948|Ben Kingsley plays the title role|It is about India's independence leader"],
    ["Jodhaa Akbar", "jodha akbar", 2, "Jodhaa Akbar (2008).", "A Mughal emperor marries a Rajput princess|It is set in the 16th century|Hrithik Roshan and Aishwarya Rai star"],
    ["Padmaavat", "padmavat|padmavati", 2, "Padmaavat (2018).", "A sultan becomes obsessed with a queen of Chittor|It was renamed after protests|Ranveer Singh plays Alauddin Khilji|Deepika Padukone plays the queen"],
    ["Titanic", "", 1, "Titanic (1997).", "It is set in 1912|A poor artist meets a rich girl on a ship|'I'm the king of the world!'|The ship hits an iceberg"],
    ["Kerala Varma Pazhassi Raja", "pazhassi raja", 3, "Pazhassi Raja (2009).", "It is about a king who fought the British East India Company|It is set in the Wayanad forests|Mammootty plays the king"],
    ["Marakkar: Arabikadalinte Simham", "marakkar|marakkar lion of the arabian sea", 3, "Marakkar: Lion of the Arabian Sea (2021).", "It is about a naval chief who fought the Portuguese|It won the National Award for Best Feature Film|Mohanlal stars|Priyadarshan directed it"]
  ]);

  /* =================== INDIAN CINEMA =================== */
  add("movies", "malm", "Malayalam Movies", "🌴", [
    ["Aavesham", "", 1, "Aavesham (2024).", "Three college students in Bengaluru need help with bullies|They befriend a gangster called Ranga|He says 'Eda mone!'|Fahadh Faasil stars"],
    ["Premalu", "", 1, "Premalu (2024).", "A Malayali guy moves to Hyderabad|He falls for a girl who works at an IT firm|It was a surprise blockbuster rom-com|Naslen and Mamitha Baiju star"],
    ["Bramayugam", "", 2, "Bramayugam (2024).", "It is filmed in black and white|A singer gets trapped in a mysterious mansion|A sinister lord plays dice with him|Mammootty stars"],
    ["Lucifer", "", 1, "Lucifer (2019).", "A political leader dies and a power struggle begins|A mysterious man called Stephen Nedumpally steps in|Prithviraj directed it|Mohanlal stars"],
    ["Thallumaala", "", 2, "Thallumaala (2022).", "It is told out of order in chapters of fistfights|Its hero Wazim becomes a social media star|Tovino Thomas stars"],
    ["Bheeshma Parvam", "", 2, "Bheeshma Parvam (2022).", "It is a family gangster drama set in Kochi|It is inspired by the Mahabharata|Mammootty plays Michael"],
    ["Sandesam", "", 3, "Sandesam (1991).", "Two brothers belong to rival political parties|It is a political satire|Sreenivasan wrote it|Sathyan Anthikad directed it"],
    ["Spadikam", "", 2, "Spadikam (1995).", "A brilliant boy is crushed by his strict headmaster father|He becomes the rowdy 'Aadu Thoma'|He tears off his shirt for fights|Mohanlal stars"]
  ]);
  add("movies", "tamilm", "Tamil Movies", "🎞️", [
    ["Jailer", "", 1, "Jailer (2023).", "A retired prison officer hunts the men who targeted his son|Mohanlal and Shiva Rajkumar have cameos|Rajinikanth plays 'Tiger' Muthuvel Pandian"],
    ["Leo", "", 1, "Leo (2023).", "A café owner in Himachal Pradesh is mistaken for a gangster|It is part of the Lokesh Cinematic Universe|Vijay stars"],
    ["Anniyan", "", 2, "Anniyan (2005).", "A rule-following lawyer has split personalities|One personality punishes wrongdoers using the Garuda Purana|Vikram stars|Shankar directed it"],
    ["Vikram Vedha", "", 2, "Vikram Vedha (2017).", "A cop hunts a gangster who keeps telling him stories|It is inspired by a folk tale of a king and a ghost|R. Madhavan and Vijay Sethupathi star"],
    ["Asuran", "", 2, "Asuran (2019).", "A farmer flees with his son after a revenge killing|It is about caste violence|Dhanush stars|Vetrimaaran directed it"],
    ["Soorarai Pottru", "", 2, "Soorarai Pottru (2020).", "A former Air Force officer wants to start a cheap airline|It is inspired by Air Deccan's founder|It won National Awards for Best Film and Best Actor|Suriya stars"],
    ["Roja", "", 2, "Roja (1992).", "A village girl's husband is kidnapped by militants in Kashmir|A. R. Rahman's first film score|Mani Ratnam directed it"],
    ["Amaran", "", 2, "Amaran (2024).", "It is based on the life of Major Mukund Varadarajan|It shows his love story and his work in Kashmir|Sivakarthikeyan and Sai Pallavi star"]
  ]);
  add("movies", "telm", "Telugu Movies", "🎬", [
    ["Kalki 2898 AD", "kalki", 2, "Kalki 2898 AD (2024).", "It is set in a future city called Kasi|A pregnant woman is hunted by a powerful regime|Amitabh Bachchan plays Ashwatthama|Prabhas plays Bhairava"],
    ["Pushpa 2: The Rule", "pushpa 2|pushpa the rule", 1, "Pushpa 2: The Rule (2024).", "A red sandalwood smuggler expands his empire|He dances in a saree at a village festival|Fahadh Faasil plays a police officer|Allu Arjun stars"],
    ["Ala Vaikunthapurramuloo", "ala vaikunthapuramulo", 2, "Ala Vaikunthapurramuloo (2020).", "Two babies are swapped at birth|A middle-class man discovers he is a rich family's son|Its song 'Butta Bomma' was a hit|Allu Arjun stars"],
    ["Jersey", "", 2, "Jersey (2019).", "A failed cricketer returns to the game at 36|He wants to buy his son an Indian team shirt|Nani stars"],
    ["Mahanati", "", 2, "Mahanati (2018).", "It is a biopic of legendary actress Savitri|Keerthy Suresh won a National Award for it|Dulquer Salmaan plays Gemini Ganesan"],
    ["Rangasthalam", "", 2, "Rangasthalam (2018).", "It is set in a village in the 1980s|Its hero is hard of hearing|He fights a corrupt village president|Ram Charan stars"]
  ]);
  add("movies", "bollym", "Bollywood Movies", "🎵", [
    ["Mughal-e-Azam", "mughal e azam", 2, "Mughal-e-Azam (1960).", "It took over a decade to make|A prince falls for a court dancer|Its song 'Pyar Kiya To Darna Kya' was shot in a mirror palace|Dilip Kumar and Madhubala star"],
    ["Mother India", "", 2, "Mother India (1957).", "A poor village woman raises her sons alone|She shoots her own son at the end|It was its country's first film nominated for an Oscar|Nargis stars"],
    ["Pathaan", "pathan", 1, "Pathaan (2023).", "A RAW agent stops a deadly virus attack|Salman Khan makes a cameo as Tiger|John Abraham plays the villain|Shah Rukh Khan stars"],
    ["Jawan", "", 1, "Jawan (2023).", "A jailer leads a team of women on a hijack|He plays both father and son|Atlee directed it|Shah Rukh Khan stars"],
    ["Animal", "", 1, "Animal (2023).", "A son is obsessed with his father's love|It has a huge corridor fight with an axe|Bobby Deol plays a mute villain|Ranbir Kapoor stars"],
    ["Queen", "", 2, "Queen (2014).", "A woman's fiancé dumps her a day before the wedding|She goes on her honeymoon alone to Paris and Amsterdam|Kangana Ranaut stars"],
    ["Taare Zameen Par", "like stars on earth", 2, "Taare Zameen Par (2007).", "A boy struggles at school and is sent to boarding school|An art teacher realises he has dyslexia|Aamir Khan directed it"],
    ["Stree", "", 2, "Stree (2018).", "A ghost abducts men during a festival in Chanderi|People write 'come tomorrow' on their walls to keep a ghost away|Rajkummar Rao plays a tailor"]
  ]);
  add("movies", "kannadam", "Kannada Movies", "🌺", [
    ["K.G.F: Chapter 1", "kgf|kgf chapter 1|k g f", 1, "K.G.F: Chapter 1 (2018).", "It is set in a gold mine in the 1970s|A Mumbai gangster goes undercover as a slave|His mother wanted him to die rich|Yash plays Rocky"],
    ["K.G.F: Chapter 2", "kgf 2|kgf chapter 2", 1, "K.G.F: Chapter 2 (2022).", "Rocky rules the gold fields|Sanjay Dutt plays Adheera|Raveena Tandon plays the prime minister|It is the sequel to a 2018 hit"],
    ["Kantara", "", 1, "Kantara (2022).", "It is set in a forest village in coastal Karnataka|It features the ritual of Bhoota Kola|Its climax ends in a divine trance|Rishab Shetty wrote, directed and starred"],
    ["777 Charlie", "", 2, "777 Charlie (2022).", "A lonely man adopts a stray Labrador|They take a road trip to Kashmir|Rakshit Shetty stars"],
    ["Kirik Party", "", 2, "Kirik Party (2016).", "It follows a mischievous engineering student|It is a college comedy-drama|Rakshit Shetty stars|Rishab Shetty directed it"],
    ["Mungaru Male", "", 2, "Mungaru Male (2006).", "Its title means 'monsoon rain'|It ran for a year in a Bengaluru theatre|A rabbit called Devadas is a famous character|Ganesh stars"],
    ["Lucia", "", 3, "Lucia (2013).", "It was crowd-funded|A cinema usher takes a pill to live his dream|It mixes dream and reality|Pawan Kumar directed it"],
    ["Bangarada Manushya", "", 3, "Bangarada Manushya (1972).", "Its title means 'golden man'|A man transforms a village with farming|It ran for two years in theatres|Dr. Rajkumar stars"]
  ]);
  add("movies", "bengalim", "Bengali Movies", "🐟", [
    ["Pather Panchali", "", 2, "Pather Panchali (1955).", "It is the first film of the Apu Trilogy|A brother and sister run to see a train|It was Satyajit Ray's first film"],
    ["Charulata", "", 3, "Charulata (1964).", "A lonely wife in 1870s Calcutta|She falls for her husband's cousin|It is based on a Tagore novella|Satyajit Ray directed it"],
    ["Meghe Dhaka Tara", "the cloud-capped star", 3, "Meghe Dhaka Tara (1960).", "A refugee family lives on the outskirts of Calcutta|A daughter sacrifices everything for her family|Ritwik Ghatak directed it"],
    ["Sonar Kella", "the golden fortress", 2, "Sonar Kella (1974).", "A boy remembers a past life in a golden fort|The detective Feluda goes to Rajasthan|Satyajit Ray directed it"],
    ["Chokher Bali", "", 3, "Chokher Bali (2003).", "It is based on a Tagore novel|A young widow comes between a couple|Aishwarya Rai stars|Rituparno Ghosh directed it"],
    ["Bhooter Bhabishyat", "", 3, "Bhooter Bhabishyat (2012).", "Ghosts living in a mansion try to stop it being demolished|It is a political comedy|Anik Dutta directed it"]
  ]);
  add("movies", "marathim", "Marathi Movies", "🚩", [
    ["Sairat", "", 1, "Sairat (2016).", "A low-caste boy falls for an upper-caste girl|Its song 'Zingaat' became a dance craze|It is the highest-grossing Marathi film for years|Nagraj Manjule directed it"],
    ["Natsamrat", "", 2, "Natsamrat (2016).", "A retired stage actor is let down by his children|It is based on a famous play|Nana Patekar stars"],
    ["Court", "", 3, "Court (2014).", "A folk singer is charged with abetting a suicide|It shows the slow pace of Indian justice|It won the National Award for Best Film"],
    ["Harishchandrachi Factory", "", 3, "Harishchandrachi Factory (2009).", "It is about the making of India's first feature film|It is a comedy about Dadasaheb Phalke|It was India's Oscar entry"],
    ["Ved", "", 3, "Ved (2022).", "A heartbroken drinker marries a girl who loves him|Riteish Deshmukh directed and starred|Genelia Deshmukh co-stars"]
  ]);
  add("movies", "punjabim", "Punjabi Movies", "🌾", [
    ["Carry On Jatta", "", 2, "Carry On Jatta (2012).", "A man pretends to be an orphan to marry the girl he loves|His lies multiply into chaos|Gippy Grewal stars"],
    ["Qismat", "", 2, "Qismat (2018).", "A college romance turns tragic|Ammy Virk and Sargun Mehta star"],
    ["Chaar Sahibzaade", "", 3, "Chaar Sahibzaade (2014).", "It is an animated film|It tells the story of Guru Gobind Singh's four sons"],
    ["Jatt & Juliet", "jatt and juliet", 2, "Jatt & Juliet (2012).", "A village boy and a city girl travel to Canada|They can't stand each other at first|Diljit Dosanjh and Neeru Bajwa star"]
  ]);

  /* =================== INTERNATIONAL CINEMA =================== */
  add("movies", "koreanm", "Korean Movies", "🇰🇷", [
    ["Train to Busan", "", 1, "Train to Busan (2016).", "A fund manager takes his daughter on a trip by rail|A zombie outbreak hits their carriages|Gong Yoo stars"],
    ["Oldboy", "old boy", 2, "Oldboy (2003).", "A man is locked in a room for 15 years|He eats a live octopus|He fights a corridor of men with a hammer|Park Chan-wook directed it"],
    ["Memories of Murder", "", 3, "Memories of Murder (2003).", "It is based on Korea's first known serial killings|Two detectives in the countryside chase a killer|Bong Joon-ho directed it"],
    ["The Host", "gwoemul", 2, "The Host (2006).", "A monster rises from the Han River|It snatches a girl|Her clumsy family sets out to save her|Bong Joon-ho directed it"],
    ["Decision to Leave", "", 3, "Decision to Leave (2022).", "A detective falls for a widow he is investigating|Park Chan-wook won Best Director at Cannes for it"],
    ["The Handmaiden", "", 3, "The Handmaiden (2016).", "It is set in 1930s Korea under Japanese rule|A pickpocket is hired as a maid to an heiress|Park Chan-wook directed it"]
  ]);
  add("movies", "japanesem", "Japanese Movies", "🗾", [
    ["Seven Samurai", "shichinin no samurai", 2, "Seven Samurai (1954).", "Farmers hire warriors to defend their village|It is over three hours long|An American western was remade from it|Akira Kurosawa directed it"],
    ["Spirited Away", "sen to chihiro no kamikakushi", 1, "Spirited Away (2001).", "A girl's parents turn into pigs|She works in a bathhouse for spirits|A faceless spirit follows her|It won the Oscar for Best Animated Feature"],
    ["Your Name", "kimi no na wa", 1, "Your Name (2016).", "A city boy and a country girl swap bodies|A comet is about to strike|Makoto Shinkai directed it"],
    ["Godzilla Minus One", "", 2, "Godzilla Minus One (2023).", "It is set just after World War II|A former kamikaze pilot faces a giant monster|It won an Oscar for visual effects"],
    ["Rashomon", "", 3, "Rashomon (1950).", "A crime is told from four different viewpoints|It is set at a ruined city gate|Akira Kurosawa directed it"],
    ["Shoplifters", "", 3, "Shoplifters (2018).", "A poor family survives by shoplifting|They take in a little girl|It won the Palme d'Or|Hirokazu Kore-eda directed it"],
    ["Drive My Car", "", 3, "Drive My Car (2021).", "A theatre director is driven around by a young woman|It is based on a Haruki Murakami story|It won the Oscar for Best International Feature"]
  ]);
  add("movies", "chinesem", "Chinese Movies", "🐉", [
    ["Crouching Tiger, Hidden Dragon", "crouching tiger hidden dragon|crouching tiger", 1, "Crouching Tiger, Hidden Dragon (2000).", "Warriors fight on top of bamboo trees|A legendary sword called the Green Destiny is stolen|Ang Lee directed it"],
    ["Hero", "ying xiong", 2, "Hero (2002).", "A nameless warrior tells a king how he killed three assassins|Each version of the story has its own colour|Jet Li stars|Zhang Yimou directed it"],
    ["Farewell My Concubine", "", 3, "Farewell My Concubine (1993).", "Two Peking opera actors' lives across 50 years|It won the Palme d'Or|Leslie Cheung and Gong Li star"],
    ["In the Mood for Love", "", 3, "In the Mood for Love (2000).", "Neighbours in 1960s Hong Kong suspect their partners are cheating|They grow close themselves|Tony Leung and Maggie Cheung star|Wong Kar-wai directed it"],
    ["Kung Fu Hustle", "", 2, "Kung Fu Hustle (2004).", "A wannabe gangster in 1940s Shanghai|A slum is full of hidden martial-arts masters|A landlady has a lion's roar|Stephen Chow directed and starred"],
    ["Ne Zha 2", "nezha 2|ne zha", 2, "Ne Zha 2 (2025).", "It is an animated film about a mythical demon-born boy|It became the highest-grossing animated film ever"],
    ["Infernal Affairs", "", 3, "Infernal Affairs (2002).", "A cop goes undercover in the triads|A triad member joins the police|It is set in Hong Kong|It was remade as 'The Departed'"]
  ]);
  add("movies", "frenchm", "French Movies", "🥐", [
    ["Amélie", "amelie|le fabuleux destin d'amelie poulain", 1, "Amélie (2001).", "A shy waitress in Montmartre secretly helps others|She sends a garden gnome around the world|Audrey Tautou stars"],
    ["The Intouchables", "intouchables|untouchable", 1, "The Intouchables (2011).", "A rich man paralysed after a paragliding accident hires a carer|The carer is a young man from the suburbs|It is based on a true story|Omar Sy stars"],
    ["La Haine", "hate", 3, "La Haine (1995).", "It follows three young men from the Paris suburbs for a day|It is shot in black and white|Vincent Cassel stars"],
    ["Léon: The Professional", "leon|the professional|leon the professional", 2, "Léon: The Professional (1994).", "A hitman takes in a 12-year-old girl|He looks after a houseplant|Gary Oldman plays a crazed cop|Jean Reno and Natalie Portman star"],
    ["Anatomy of a Fall", "anatomie d'une chute", 3, "Anatomy of a Fall (2023).", "A writer is accused of killing her husband|Their blind son is a key witness|It won the Palme d'Or"],
    ["The Artist", "", 2, "The Artist (2011).", "It is a silent black-and-white film|A silent movie star struggles with talkies|A dog called Uggie steals scenes|It won the Oscar for Best Picture"]
  ]);
  add("movies", "spanishm", "Spanish Movies", "💃", [
    ["The Orphanage", "el orfanato", 3, "The Orphanage (2007).", "A woman reopens the children's home where she grew up|Her son vanishes after playing with invisible friends|It is a Spanish horror film"],
    ["The Invisible Guest", "contratiempo", 2, "The Invisible Guest (2016).", "A businessman wakes in a hotel room beside a dead woman|A lawyer helps him prepare his defence|Mario Casas stars"],
    ["The Platform", "el hoyo", 2, "The Platform (2019).", "Prisoners live on vertical levels|Food comes down on a slab once a day|It was a Netflix hit"],
    ["Society of the Snow", "la sociedad de la nieve", 2, "Society of the Snow (2023).", "It retells a 1972 plane crash in the Andes|The survivors were a Uruguayan rugby team|J. A. Bayona directed it"],
    ["Volver", "", 3, "Volver (2006).", "Women of a family deal with a death and a ghost|Penélope Cruz stars|Pedro Almodóvar directed it"]
  ]);
  add("movies", "italianm", "Italian Movies", "🍝", [
    ["Life Is Beautiful", "la vita e bella|life is beautiful", 1, "Life Is Beautiful (1997).", "A Jewish father protects his son in a concentration camp|He pretends it is all a game|Roberto Benigni directed and starred"],
    ["Cinema Paradiso", "nuovo cinema paradiso", 2, "Cinema Paradiso (1988).", "A film director remembers his childhood in a Sicilian village|A projectionist becomes his mentor|It ends with a montage of censored kisses"],
    ["The Good, the Bad and the Ugly", "the good the bad and the ugly|il buono il brutto il cattivo", 2, "The Good, the Bad and the Ugly (1966).", "Three gunmen race to find buried gold|It ends in a three-way stand-off in a cemetery|Ennio Morricone wrote its famous theme|Clint Eastwood stars"],
    ["La Dolce Vita", "", 3, "La Dolce Vita (1960).", "A journalist drifts through Rome's high society|A woman wades into the Trevi Fountain|Federico Fellini directed it"],
    ["Bicycle Thieves", "ladri di biciclette", 3, "Bicycle Thieves (1948).", "A poor man needs his bike for work|It is stolen on his first day|He searches Rome with his son"]
  ]);
  add("movies", "germanm", "German Movies", "🍺", [
    ["Run Lola Run", "lola rennt", 2, "Run Lola Run (1998).", "A woman has 20 minutes to find 100,000 marks|The story restarts three times|Its heroine has bright red hair"],
    ["Das Boot", "the boat", 3, "Das Boot (1981).", "It follows a submarine crew in World War II|It is set almost entirely inside a U-boat"],
    ["Good Bye, Lenin!", "good bye lenin|goodbye lenin", 2, "Good Bye, Lenin! (2003).", "A mother wakes from a coma after the Berlin Wall falls|Her son pretends East Germany still exists|He fakes news broadcasts for her"],
    ["The Lives of Others", "das leben der anderen", 3, "The Lives of Others (2006).", "A Stasi officer spies on a playwright|He begins to sympathise with him|It won the Oscar for Best Foreign Language Film"],
    ["All Quiet on the Western Front", "im westen nichts neues", 2, "All Quiet on the Western Front (2022).", "A young soldier joins the German army in World War I|It is based on a 1928 novel|It won four Oscars"]
  ]);
  add("movies", "turkishm", "Turkish Movies", "🧿", [
    ["Miracle in Cell No. 7", "7. kogustaki mucize|miracle in cell no 7", 2, "Miracle in Cell No. 7 (2019).", "A father with a learning disability is wrongly jailed|His little daughter fights to free him|It is a remake of a Korean film"],
    ["Winter Sleep", "kis uykusu", 3, "Winter Sleep (2014).", "A hotel owner in Cappadocia argues with his family|It won the Palme d'Or|Nuri Bilge Ceylan directed it"],
    ["Once Upon a Time in Anatolia", "", 4, "Once Upon a Time in Anatolia (2011).", "Police search the steppe at night for a body|It won the Grand Prix at Cannes|Nuri Bilge Ceylan directed it"],
    ["G.O.R.A.", "gora", 3, "G.O.R.A. (2004).", "A carpet seller is abducted by aliens|It spoofs sci-fi films|Cem Yılmaz wrote and starred"]
  ]);

  /* =================== TV SHOWS & WEB SERIES =================== */
  add("tv", "netflix", "Netflix", "🟥", [
    ["The Witcher", "witcher", 1, "The Witcher.", "It is based on Polish fantasy novels|Its hero hunts monsters for money|A bard sings a catchy song about tossing a coin|Henry Cavill played Geralt"],
    ["Ozark", "", 2, "Ozark.", "A financial adviser launders money for a drug cartel|He moves his family to a lake in Missouri|Jason Bateman stars"],
    ["Black Mirror", "", 2, "Black Mirror.", "Each episode is a separate story|It is about the dark side of technology|One episode lets you choose the story ('Bandersnatch')"],
    ["Mindhunter", "", 3, "Mindhunter.", "It is set in the late 1970s|FBI agents interview jailed serial killers|David Fincher directed many episodes"],
    ["Lupin", "", 2, "Lupin.", "A man takes inspiration from a gentleman thief in a book|He steals a necklace from the Louvre|Omar Sy stars"],
    ["Adolescence", "", 2, "Adolescence (2025).", "Every episode is filmed in one single take|A 13-year-old boy is arrested for murder|Stephen Graham co-created and stars"]
  ]);
  add("tv", "prime", "Amazon Prime", "🟦", [
    ["Fallout", "", 2, "Fallout.", "It is based on a video game series|A young woman leaves an underground vault|A ghoul bounty hunter roams the wasteland|It is set after a nuclear war"],
    ["The Rings of Power", "rings of power|the lord of the rings the rings of power", 2, "The Lord of the Rings: The Rings of Power.", "It is set thousands of years before 'The Hobbit'|A young Galadriel hunts Sauron|It was one of the most expensive series ever made"],
    ["Invincible", "", 2, "Invincible.", "It is an animated superhero series|A teen discovers his father is the world's strongest hero|His father turns out to be dangerous"],
    ["Paatal Lok", "", 2, "Paatal Lok.", "A Delhi police inspector investigates an assassination attempt|It divides society into heaven, earth and the underworld|Jaideep Ahlawat stars"],
    ["Made in Heaven", "", 3, "Made in Heaven.", "Two wedding planners in Delhi|Each episode features a different wedding|Sobhita Dhulipala and Arjun Mathur star"]
  ]);
  add("tv", "disneyplus", "Disney+ Series", "🏰", [
    ["Loki", "", 1, "Loki.", "A god of mischief is arrested by the Time Variance Authority|He meets a female version of himself|Tom Hiddleston stars"],
    ["WandaVision", "wanda vision", 2, "WandaVision.", "Each episode copies a different decade of sitcoms|A couple live in a too-perfect town|Elizabeth Olsen and Paul Bettany star"],
    ["Andor", "", 2, "Andor.", "It is set five years before 'Rogue One'|A thief becomes a rebel spy|Diego Luna stars"],
    ["The Night Manager", "night manager", 3, "The Night Manager (Hindi).", "A hotel employee goes undercover|He targets an arms dealer|Anil Kapoor and Aditya Roy Kapur star"],
    ["The Bear", "bear", 2, "The Bear.", "A top chef takes over his late brother's sandwich shop|Its kitchen scenes are famously stressful|'Yes, Chef!'|Jeremy Allen White stars"],
    ["Percy Jackson and the Olympians", "percy jackson", 2, "Percy Jackson and the Olympians.", "A boy learns his father is a Greek god|He goes to Camp Half-Blood|He is a son of Poseidon"]
  ]);
  add("tv", "hbo", "HBO Series", "📡", [
    ["The Sopranos", "sopranos", 2, "The Sopranos.", "A New Jersey mob boss sees a therapist|It has a famous cut-to-black ending|James Gandolfini stars"],
    ["The Wire", "", 3, "The Wire.", "It is set in Baltimore|Each season looks at a different institution|Idris Elba plays Stringer Bell"],
    ["Chernobyl", "", 2, "Chernobyl.", "It is a five-part miniseries|It is about a nuclear disaster in 1986|Jared Harris plays scientist Valery Legasov"],
    ["Succession", "", 2, "Succession.", "A media tycoon's children fight to take over|The family name is Roy|Brian Cox stars"],
    ["The Last of Us", "", 1, "The Last of Us.", "It is based on a video game|A fungus turns people into monsters|A smuggler escorts a teenage girl who is immune|Pedro Pascal and Bella Ramsey star"],
    ["House of the Dragon", "", 1, "House of the Dragon.", "It is set 200 years before 'Game of Thrones'|It is about a Targaryen civil war|House Targaryen fights itself"],
    ["The White Lotus", "white lotus", 2, "The White Lotus.", "Each season is set at a different luxury resort|Each season begins with a death|Mike White created it"]
  ]);
  add("tv", "britishtv", "British TV Shows", "🇬🇧", [
    ["Peaky Blinders", "", 1, "Peaky Blinders.", "It is set in Birmingham after World War I|A gang hides razor blades in their caps|Cillian Murphy plays Tommy Shelby"],
    ["Doctor Who", "", 1, "Doctor Who.", "It first aired in 1963|A Time Lord travels in a blue police box|The lead regenerates into new actors"],
    ["Downton Abbey", "", 2, "Downton Abbey.", "It follows an aristocratic family and their servants|It is set in the early 20th century|Maggie Smith plays the Dowager Countess"],
    ["Fawlty Towers", "", 3, "Fawlty Towers.", "It is set in a hotel in Torquay|Only 12 episodes were ever made|John Cleese plays the rude owner Basil"],
    ["Line of Duty", "", 3, "Line of Duty.", "An anti-corruption unit investigates police officers|It has very long interrogation scenes|'Now we're sucking diesel!'"],
    ["Fleabag", "", 2, "Fleabag.", "Its heroine talks directly to the camera|She runs a guinea-pig-themed café|Phoebe Waller-Bridge created and stars"],
    ["Top Gear", "", 2, "Top Gear.", "It is a motoring show|Celebrities race 'a reasonably priced car'|Its presenters included Clarkson, Hammond and May"]
  ]);
  add("tv", "americantv", "American TV Shows", "🇺🇸", [
    ["The Walking Dead", "walking dead|twd", 1, "The Walking Dead.", "A sheriff's deputy wakes from a coma|The world is overrun by 'walkers'|Andrew Lincoln plays Rick Grimes"],
    ["Lost", "", 2, "Lost.", "A plane crashes on a mysterious island|It has polar bears and a smoke monster|The numbers 4 8 15 16 23 42 are important"],
    ["Prison Break", "", 2, "Prison Break.", "An engineer gets himself jailed on purpose|He tattoos building blueprints on his body|He wants to free his brother from death row"],
    ["House", "house md|house m.d.", 2, "House M.D.", "A brilliant doctor solves strange medical cases|He walks with a cane|He always says 'Everybody lies'|Hugh Laurie stars"],
    ["The Simpsons", "simpsons", 1, "The Simpsons.", "It is the longest-running American sitcom|It is set in Springfield|Its family is yellow"],
    ["24", "twenty four", 3, "24.", "Each season covers one day in real time|A ticking clock appears on screen|Kiefer Sutherland plays Jack Bauer"],
    ["Yellowstone", "", 2, "Yellowstone.", "A family runs the largest cattle ranch in Montana|They fight developers and a reservation|Kevin Costner stars"]
  ]);
  add("tv", "sitcoms", "Sitcoms", "🛋️", [
    ["Seinfeld", "", 2, "Seinfeld.", "It is called 'a show about nothing'|It is set in New York City|Its characters include Kramer, Elaine and George"],
    ["Brooklyn Nine-Nine", "brooklyn 99|b99|brooklyn nine nine", 1, "Brooklyn Nine-Nine.", "It is set in a New York police precinct|Its captain is very serious|It has an annual Halloween Heist|Andy Samberg plays Jake Peralta"],
    ["Modern Family", "", 1, "Modern Family.", "It is shot like a documentary|It follows three related households|Its characters include Phil Dunphy"],
    ["Parks and Recreation", "parks and rec", 2, "Parks and Recreation.", "It is set in Pawnee, Indiana|Its hero dreams of being president|Ron Swanson loves breakfast food|Amy Poehler stars"],
    ["Sarabhai vs Sarabhai", "sarabhai v/s sarabhai", 2, "Sarabhai vs Sarabhai.", "A posh mother can't stand her middle-class daughter-in-law|Rosesh writes terrible poems|Maya says things are 'so middle class'"],
    ["Taarak Mehta Ka Ooltah Chashmah", "tmkoc|taarak mehta", 1, "Taarak Mehta Ka Ooltah Chashmah.", "It is set in Gokuldham Society in Mumbai|It is India's longest-running sitcom|Jethalal runs an electronics shop"],
    ["Schitt's Creek", "schitts creek", 3, "Schitt's Creek.", "A rich family loses everything|They move to a small town they once bought as a joke|Moira Rose has many wigs"],
    ["Ted Lasso", "", 2, "Ted Lasso.", "An American football coach manages an English soccer team|He bakes biscuits for his boss|Jason Sudeikis stars"]
  ]);
  add("tv", "crimetv", "Crime Series", "🚔", [
    ["True Detective", "", 2, "True Detective.", "Each season has a new cast and case|Season one is set in Louisiana|'Time is a flat circle'|Matthew McConaughey and Woody Harrelson star"],
    ["Dexter", "", 2, "Dexter.", "A blood-spatter analyst for Miami police|He is secretly a serial killer|He only kills other killers"],
    ["Better Call Saul", "", 2, "Better Call Saul.", "It is a prequel to 'Breaking Bad'|A small-time lawyer reinvents himself under a catchy new name|Bob Odenkirk stars"],
    ["Narcos", "", 1, "Narcos.", "It is about the drug trade in Colombia|It starts with the story of Pablo Escobar|Two DEA agents hunt the cartels"],
    ["Asur", "", 3, "Asur.", "A forensic expert hunts a serial killer obsessed with mythology|It is set partly in Varanasi|Arshad Warsi stars"],
    ["Delhi Crime", "", 2, "Delhi Crime.", "It is based on a real 2012 case|A police officer leads a hard investigation|It won an International Emmy|Shefali Shah stars"],
    ["Kerala Crime Files", "", 3, "Kerala Crime Files.", "It is a Malayalam web series|A sex worker is murdered in a Kochi lodge|Police search for a man called 'Shiju'"]
  ]);
  add("tv", "fantasytv", "Fantasy Series", "🐲", [
    ["Shadow and Bone", "", 2, "Shadow and Bone.", "A map-maker discovers she can summon light|A dark band of monsters splits a country|It is based on the Grishaverse novels"],
    ["The Wheel of Time", "wheel of time", 3, "The Wheel of Time.", "A powerful woman from the Aes Sedai seeks the Dragon Reborn|It is based on Robert Jordan's books|Rosamund Pike stars"],
    ["Merlin", "", 2, "Merlin.", "A young warlock hides his magic in Camelot|He serves the young Prince Arthur|Colin Morgan stars"],
    ["Once Upon a Time", "", 3, "Once Upon a Time.", "Fairy-tale characters are trapped in a town in Maine|They don't remember who they are|An evil queen cast the curse"],
    ["Arcane", "", 2, "Arcane.", "It is based on 'League of Legends'|Two sisters end up on opposite sides|It is set in Piltover and Zaun"],
    ["Wednesday", "", 1, "Wednesday.", "A gloomy girl is sent to Nevermore Academy|A disembodied hand helps her|Her dance went viral|Jenna Ortega stars"]
  ]);
  add("tv", "reality", "Reality Shows", "🎤", [
    ["Bigg Boss", "big boss", 1, "Bigg Boss.", "Contestants live locked in a house full of cameras|They are evicted by votes each week|Salman Khan hosts the Hindi version"],
    ["Kaun Banega Crorepati", "kbc", 1, "Kaun Banega Crorepati.", "It is a quiz show with lifelines|Contestants can win seven crore rupees|Amitabh Bachchan hosts it"],
    ["Shark Tank India", "shark tank", 2, "Shark Tank India.", "Founders pitch businesses to investors|The investors are named after sea predators|Its judges include Aman Gupta and Namita Thapar"],
    ["MasterChef", "master chef", 1, "MasterChef.", "Home cooks compete in a kitchen|They have to plate before time runs out|Winners get a trophy and a cookbook deal"],
    ["Indian Idol", "", 1, "Indian Idol.", "It is a singing contest|It is based on a British singing show|Its winners have included Abhijeet Sawant"],
    ["Survivor", "", 2, "Survivor.", "Contestants are stranded in a remote place|They vote each other off at Tribal Council|'Outwit, outplay, outlast'"],
    ["The Kapil Sharma Show", "kapil sharma show|comedy nights with kapil", 1, "The Kapil Sharma Show.", "It is a comedy talk show|Film stars come to promote their films|Its host is from Amritsar"],
    ["Roadies", "mtv roadies", 2, "MTV Roadies.", "Contestants travel by motorbike and do tasks|Its auditions are famous for harsh judges|It began in 2003"]
  ]);
  add("tv", "kdrama", "Korean Dramas", "🇰🇷", [
    ["Squid Game", "ojing-eo geim", 1, "Squid Game.", "Contestants in green tracksuits play children's games|Losers are killed|A giant doll plays 'Red Light, Green Light'"],
    ["Business Proposal", "", 2, "Business Proposal.", "A woman goes on a blind date pretending to be her friend|Her date turns out to be her company's CEO"],
    ["Vincenzo", "", 2, "Vincenzo.", "A Korean-Italian mafia lawyer returns to Seoul|He hunts gold hidden in an old building|Song Joong-ki stars"],
    ["Queen of Tears", "", 2, "Queen of Tears.", "A department-store heiress and her husband from the countryside|Their marriage is falling apart|Kim Soo-hyun and Kim Ji-won star"],
    ["The Glory", "", 2, "The Glory.", "A woman bullied in school plans revenge for years|She becomes a teacher of her bully's daughter|Song Hye-kyo stars"],
    ["When Life Gives You Tangerines", "", 3, "When Life Gives You Tangerines (2025).", "It follows a couple across decades on Jeju Island|IU and Park Bo-gum star"]
  ]);
  add("tv", "indianweb", "Indian Web Series", "🇮🇳", [
    ["The Family Man", "family man", 1, "The Family Man.", "A middle-class man is secretly a spy|His family thinks he has a boring job|Manoj Bajpayee stars"],
    ["Mirzapur", "", 1, "Mirzapur.", "A carpet king runs crime in a UP town|Two brothers get pulled in|Pankaj Tripathi plays Kaleen Bhaiya"],
    ["Aspirants", "", 2, "Aspirants.", "Three friends prepare for the UPSC exam|It is set in Delhi's Rajinder Nagar|It was made by TVF"],
    ["Gullak", "", 2, "Gullak.", "It is about the Mishra family in a small town|It is narrated by a piggy bank|It was made by TVF"],
    ["Farzi", "", 2, "Farzi.", "An artist starts printing perfect fake currency|Vijay Sethupathi plays a task-force officer|Shahid Kapoor stars"],
    ["Rocket Boys", "", 3, "Rocket Boys.", "It tells the story of Homi Bhabha and Vikram Sarabhai|It shows the start of India's nuclear and space programmes|Jim Sarbh and Ishwak Singh star"]
  ]);
})();
