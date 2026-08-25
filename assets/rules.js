/* ============================================================================
   Estonian practice library — grammar rules + translation exercises
   ----------------------------------------------------------------------------
   ET_RULES   keyed explanations shown after every answer
   ET_ITEMS   the exercise bank: l = level, t = rule key, en = prompt,
              et = accepted answers (first one is the model answer),
              h  = optional hint / vocabulary nudge
   Accepted answers are compared case-insensitively and without punctuation,
   so only genuine word differences need to be listed here.
   ========================================================================== */

window.ET_RULES = {

  /* ---------------------------------------------------------------- A1 --- */
  'olema': {
    title: 'olema — to be',
    level: 'A1', link: 'index.html#olema',
    body: 'olema is irregular: olen, oled, on, oleme, olete, on. Note that the third person is on for both he/she and they. The predicate noun stays in the nominative — Ma olen õpilane, never partitive.',
    ex: ['Ma olen õpetaja. — I am a teacher.', 'Nad on kodus. — They are at home.']
  },
  'olema-neg': {
    title: 'Negating olema — ei ole / pole',
    level: 'A1', link: 'index.html#negation',
    body: 'olema is negated with ei ole, which has the everyday contraction pole. Both are correct and neither changes with person: ma ei ole, sa ei ole, nad ei ole.',
    ex: ['Ma ei ole arst. = Ma pole arst. — I am not a doctor.']
  },
  'pronouns': {
    title: 'Personal pronouns — long and short',
    level: 'A1', link: 'index.html#pronouns',
    body: 'Every pronoun has a long form (mina, sina, tema) and a short one (ma, sa, ta). The short form is the default; the long form adds emphasis or contrast. Object forms: mind, sind, teda, meid, teid, neid.',
    ex: ['Ma tean teda. — I know him.', 'Mina tean teda, aga tema ei tea mind. — I know him, but he does not know me.']
  },
  'mul-on': {
    title: 'Possession — mul on',
    level: 'A1', link: 'index.html#cases-intro',
    body: 'Estonian has no verb to have. The owner takes the adessive case (-l) and the thing owned is the subject: mul on, sul on, tal on, meil on, teil on, neil on. In the negative the thing owned moves into the partitive: mul ei ole aega.',
    ex: ['Mul on auto. — I have a car.', 'Tal ei ole raha. — He has no money.']
  },
  'greetings': {
    title: 'Greetings and set phrases',
    level: 'A1', link: 'index.html#greetings',
    body: 'Fixed expressions often use cases that only make sense historically — tere hommikust and head aega are frozen forms, so learn them whole rather than analysing them.',
    ex: ['Tere hommikust! — Good morning!', 'Head aega! — Goodbye!']
  },
  'numbers': {
    title: 'Numbers and counting',
    level: 'A1', link: 'index.html#numbers',
    body: 'After any number larger than one, the counted noun stays in the singular partitive: kaks õde, viis eurot, seitse tuba. Only üks takes the nominative singular.',
    ex: ['Mul on viis eurot. — I have five euros.', 'Tal on kaks õde. — She has two sisters.']
  },
  'present-a1': {
    title: 'Present tense — the everyday endings',
    level: 'A1', link: 'index.html#present-tense',
    body: 'Drop -ma from the dictionary form and add -n, -d, -b, -me, -te, -vad: elama gives elan, elad, elab, elame, elate, elavad. Estonian has no separate continuous tense, so ma loen covers both I read and I am reading.',
    ex: ['Ma elan Tallinnas. — I live in Tallinn.', 'Nad elavad Tartus. — They live in Tartu.']
  },
  'neg-present': {
    title: 'Negating verbs — ei plus the bare stem',
    level: 'A1', link: 'index.html#negation',
    body: 'Negation is refreshingly simple: ei never changes and the verb loses its personal ending entirely. Ma ei tea, sa ei tea, nad ei tea — the same form throughout.',
    ex: ['Ma ei tea. — I do not know.', 'Ta ei räägi inglise keelt. — He does not speak English.']
  },
  'questions-a1': {
    title: 'Asking questions',
    level: 'A1', link: 'index.html#questions',
    body: 'A yes/no question is the statement with kas in front, and the word order does not change: Kas sa oled eestlane? With a question word (kes, mis, kus, millal, kuidas) kas is dropped.',
    ex: ['Kas sa räägid eesti keelt? — Do you speak Estonian?', 'Kus sa elad? — Where do you live?']
  },
  'kus-locative': {
    title: 'Saying where — inside (-s) and on (-l)',
    level: 'A1', link: 'index.html#fourteen-cases',
    body: 'Estonian marks place with endings instead of prepositions. -s means inside something (toas, poes, Tallinnas) and -l means on or at it (laual, tööl). kodus is a frozen old form you simply memorise.',
    ex: ['Kass on toas. — The cat is in the room.', 'Raamat on laual. — The book is on the table.']
  },

  /* ---------------------------------------------------------------- A2 --- */
  'genitive': {
    title: 'Genitive — the of-case',
    level: 'A2', link: 'index.html#fourteen-cases',
    body: 'The genitive shows possession and is the base for most other cases, so it is worth learning alongside every new noun. The owner comes first: minu sõbra auto, literally my friend-of car.',
    ex: ['See on minu sõbra auto. — This is my friend’s car.', 'Lapse nimi on Mari. — The child’s name is Mari.']
  },
  'partitive': {
    title: 'Partitive — part of something',
    level: 'A2', link: 'index.html#fourteen-cases',
    body: 'The partitive marks an incomplete or unbounded amount, and it is obligatory after negation, after numbers, after palju, and with verbs of ongoing activity such as ootama, armastama and jooma.',
    ex: ['Ma joon teed. — I drink tea.', 'Ma ei söö liha. — I do not eat meat.']
  },
  'inner-locative': {
    title: 'Into, in, out of — the -sse / -s / -st series',
    level: 'A2', link: 'index.html#fourteen-cases',
    body: 'The inner locative cases describe being inside: illative -sse (into), inessive -s (in), elative -st (out of). Many common words use a short illative instead of -sse: tuppa, majja, linna.',
    ex: ['Ma lähen tuppa. — I go into the room.', 'Kiri tuli Soomest. — The letter came from Finland.']
  },
  'outer-locative': {
    title: 'Onto, on, off — the -le / -l / -lt series',
    level: 'A2', link: 'index.html#fourteen-cases',
    body: 'The outer locative cases describe surfaces and, idiomatically, events and activities: allative -le (onto, to), adessive -l (on, at), ablative -lt (from). Estonian goes tööle, kontserdile and turule.',
    ex: ['Ma lähen tööle. — I am going to work.', 'Ta tuleb turult. — He is coming from the market.']
  },
  'plural-nom': {
    title: 'Plural nominative — the -d ending',
    level: 'A2', link: 'index.html#fourteen-cases',
    body: 'Add -d to the genitive singular to get the plural nominative: laps > lapse > lapsed, maja > maja > majad. Remember that the verb form for they is on, the same as for he and she.',
    ex: ['Lapsed on aias. — The children are in the garden.', 'Need majad on vanad. — These houses are old.']
  },
  'adjective-agree': {
    title: 'Adjective agreement',
    level: 'A2', link: 'index.html#adjectives',
    body: 'An attributive adjective copies the case and number of its noun: uus auto, uue auto, uut autot, väikeses linnas. After olema the adjective simply stays in the nominative.',
    ex: ['Ma tahan uut autot. — I want a new car.', 'Me elame väikeses linnas. — We live in a small town.']
  },
  'present-a2': {
    title: 'Present tense in context',
    level: 'A2', link: 'index.html#present-tense',
    body: 'The present covers habits, general facts and things happening right now. Frequency adverbs (alati, tihti, kunagi) normally sit right after the verb or the subject rather than at the very end.',
    ex: ['Me käime tihti kinos. — We often go to the cinema.']
  },
  'neg-a2': {
    title: 'Negation with quantifiers',
    level: 'A2', link: 'index.html#negation',
    body: 'Estonian uses double negation: kunagi, keegi, midagi and kuhugi all still need ei on the verb. Watch the object forms kedagi and midagi.',
    ex: ['Ma ei joo kunagi õlut. — I never drink beer.', 'Kedagi ei ole kodus. — Nobody is at home.']
  },
  'da-infinitive': {
    title: 'da-infinitive and ma-infinitive',
    level: 'A2', link: 'index.html#present-tense',
    body: 'Estonian has two infinitives. tahtma, saama, võima, meeldima and oskama take the da-form (magada, aidata); pean, hakkan, lähen and jään take the ma-form (magama, aitama). The pairing is fixed per verb.',
    ex: ['Ma tahan magada. — I want to sleep.', 'Ma pean minema. — I have to go.']
  },
  'word-order-a2': {
    title: 'Word order — the verb stays second',
    level: 'A2', link: 'index.html#word-order',
    body: 'If a sentence opens with something other than the subject — a time word, for instance — the verb still comes second and the subject moves behind it: Täna lähen ma poodi. Keeping the subject first is also common in speech.',
    ex: ['Homme tuleb mu sõber külla. — Tomorrow my friend is coming to visit.']
  },
  'comparative': {
    title: 'Comparative — the -m ending',
    level: 'A2', link: 'index.html#adjectives',
    body: 'Add -m to the genitive stem: pikk > pika > pikem, huvitav > huvitava > huvitavam. Compare either with kui plus the nominative, or by putting the thing compared against into the elative: minust pikem.',
    ex: ['Täna on külmem kui eile. — Today is colder than yesterday.', 'Ta on minust pikem. — He is taller than me.']
  },
  'essive-translative': {
    title: 'Becoming (-ks) and acting as (-na)',
    level: 'A2', link: 'index.html#fourteen-cases',
    body: 'The translative -ks marks a change of state or a goal (saab arstiks, läheb soojemaks); the essive -na marks a role held right now (töötab õpetajana).',
    ex: ['Ta tahab arstiks saada. — He wants to become a doctor.', 'Ta töötab õpetajana. — He works as a teacher.']
  },
  'time-expr': {
    title: 'Time expressions',
    level: 'A2', link: 'index.html#fourteen-cases',
    body: 'Days and seasons take the adessive: esmaspäeval, suvel, hommikul. Clock time uses kell plus a nominative number, and a span runs from -st to -ni: üheksast viieni.',
    ex: ['Ma ärkan kell seitse. — I get up at seven.', 'Suvel sõidame maale. — In summer we go to the countryside.']
  },

  /* ---------------------------------------------------------------- B1 --- */
  'past-simple': {
    title: 'Simple past — lihtminevik',
    level: 'B1', link: 'index.html#past-future',
    body: 'The past marker is -si- or -s-: elama gives elasin, elasid, elas, elasime, elasite, elasid. In the negative use ei plus the -nud participle, which is identical for every person: ei tulnud.',
    ex: ['Ma nägin teda tänaval. — I saw him in the street.', 'Nad ei tulnud. — They did not come.']
  },
  'perfect': {
    title: 'Perfect — olen teinud',
    level: 'B1', link: 'index.html#past-future',
    body: 'Present tense of olema plus the -nud participle. Estonian uses it much as English does: for experience, for results that still matter, and with juba, veel and kunagi.',
    ex: ['Kas sa oled juba söönud? — Have you eaten already?', 'Ma ei ole kunagi Lätis käinud. — I have never been to Latvia.']
  },
  'future': {
    title: 'Future — the present tense does the job',
    level: 'B1', link: 'index.html#past-future',
    body: 'Estonian has no future tense. Use the present and let a time word (homme, järgmisel nädalal) carry the meaning. hakkama plus the ma-infinitive is available when you want to stress that something is starting.',
    ex: ['Homme sõidan Tartusse. — Tomorrow I will go to Tartu.']
  },
  'conditional': {
    title: 'Conditional — the -ksin forms',
    level: 'B1', link: 'index.html#conditional',
    body: 'Add -ksi- to the present stem: tuleksin, tuleksid, tuleks, tuleksime, tuleksite, tuleksid. Both halves of an if-sentence take the conditional: Kui mul oleks aega, ma tuleksin.',
    ex: ['Ma sooviksin kohvi. — I would like a coffee.', 'Kas sa saaksid mind aidata? — Could you help me?']
  },
  'postpositions': {
    title: 'Postpositions — after the genitive',
    level: 'B1', link: 'index.html#postpositions',
    body: 'Words like all, ees, kõrval, pärast and juures come after their noun, and that noun stands in the genitive: laua all, maja ees, kooli kõrval. läbi and enne are among the few that may also stand in front.',
    ex: ['Kass on laua all. — The cat is under the table.', 'Pood on kooli kõrval. — The shop is next to the school.']
  },
  'questions-b1': {
    title: 'Question words in longer questions',
    level: 'B1', link: 'index.html#questions',
    body: 'Question words carry case endings of their own: kelle (whose), kellele (to whom), kust (from where), millist (which, partitive). The verb follows the question word directly.',
    ex: ['Kelle auto see on? — Whose car is this?', 'Kust sa selle ostsid? — Where did you buy it?']
  },
  'word-order-b1': {
    title: 'Word order in subordinate clauses',
    level: 'B1', link: 'index.html#word-order',
    body: 'After et, kui, sest or kus the finite verb drifts towards the end of its clause, and a comma always separates the clause from the main one: Ma ei tea, kus ta elab.',
    ex: ['Ma ei tea, kus ta elab. — I do not know where he lives.']
  },
  'superlative': {
    title: 'Superlative — kõige plus comparative',
    level: 'B1', link: 'index.html#adjectives',
    body: 'The everyday superlative is kõige plus the comparative: kõige parem, kõige külmem. There is also a short form (parim, pikim, suurim) that sounds more literary. The domain goes in the genitive: linna parim restoran.',
    ex: ['See on linna kõige parem restoran. — This is the best restaurant in the city.']
  },
  'possessive-gen': {
    title: 'Possessives and oma',
    level: 'B1', link: 'index.html#pronouns',
    body: 'Possessive pronouns are simply the genitive of the personal pronoun: minu/mu, sinu/su, tema/ta. When the possessor is the subject of the same clause, replace it with oma: Ma unustasin oma õe nime.',
    ex: ['Minu ema sõber elab Narvas. — My mother’s friend lives in Narva.']
  },
  'ma-infinitive': {
    title: 'ma-infinitive forms — ma, mas, mast',
    level: 'B1', link: 'index.html#present-tense',
    body: 'The ma-infinitive takes locative endings of its own: -ma for setting off to do something, -mas for being in the middle of it, -mast for coming back from it. Lähen ujuma, olen ujumas, tulen ujumast.',
    ex: ['Lapsed on väljas mängimas. — The children are out playing.', 'Ma tulin ujumast. — I came back from swimming.']
  },
  'imperative': {
    title: 'Imperative — commands',
    level: 'B1', link: 'index.html#present-tense',
    body: 'The singular imperative is the bare present stem (tule, istu, unusta); the polite plural adds -ge or -ke (tulge, istuge). Negative commands use ära in the singular and ärge in the plural, never ei.',
    ex: ['Tule siia! — Come here!', 'Ära unusta oma võtmeid! — Do not forget your keys!']
  },
  'rection': {
    title: 'Verb government — rektsioon',
    level: 'B1', link: 'index.html#postpositions',
    body: 'Estonian verbs demand cases of their own, and they rarely match English prepositions: rääkima millestki, kartma midagi, mõtlema kellegi peale, huvi tundma millegi vastu. Learn each verb together with its case.',
    ex: ['Me räägime tööst. — We are talking about work.', 'Ta kardab koeri. — She is afraid of dogs.']
  },
  'terminative-comitative': {
    title: 'Up to (-ni), with (-ga), without (-ta)',
    level: 'B1', link: 'index.html#fourteen-cases',
    body: 'Three endings attach to the genitive stem: terminative -ni marks a limit in space or time, comitative -ga means with or by means of, abessive -ta means without and often pairs with ilma.',
    ex: ['Ma sõidan bussiga tööle. — I go to work by bus.', 'Kohv ilma suhkruta. — Coffee without sugar.']
  },

  /* ---------------------------------------------------------------- B2 --- */
  'object-case': {
    title: 'Total and partial object',
    level: 'B2', link: 'index.html#aspect',
    body: 'A completed whole action takes a genitive object: Ma lugesin raamatu läbi. An ongoing or partial one takes the partitive: Ma lugesin raamatut. Negation always forces the partitive, whatever the aspect.',
    ex: ['Ma ostsin uue arvuti. — I bought a new computer.', 'Ma ei näe maja. — I do not see the house.']
  },
  'impersonal': {
    title: 'Impersonal voice — tehakse, tehti',
    level: 'B2', link: 'index.html#aspect',
    body: 'When the doer is unknown or irrelevant, Estonian uses the impersonal: present -takse/-dakse, past -ti/-di. There is no subject and no by-phrase at all — Siin räägitakse eesti keelt.',
    ex: ['Siin räägitakse eesti keelt. — Estonian is spoken here.', 'Eile saadeti kirjad ära. — The letters were sent yesterday.']
  },
  'participle-nud': {
    title: 'Past participles — nud and tud',
    level: 'B2', link: 'index.html#participles',
    body: 'The -nud participle is active (langenud lehed, the leaves that fell); the -tud participle is passive (kirjutatud kiri, the letter that was written). As modifiers they stand in front of the noun and do not agree with it.',
    ex: ['Ema kirjutatud kiri on laual. — The letter written by my mother is on the table.']
  },
  'participle-v': {
    title: 'Present participles — v and tav',
    level: 'B2', link: 'index.html#participles',
    body: 'The -v participle is active and present (istuv mees, the sitting man); the -tav participle is passive (näidatav film, the film being shown). Both compress a whole relative clause and sound noticeably bookish.',
    ex: ['Seal istuv mees on minu õpetaja. — The man sitting there is my teacher.']
  },
  'subordinate': {
    title: 'Subordinate clauses',
    level: 'B2', link: 'index.html#complex-sentences',
    body: 'et (that), sest (because), kui (when/if) and kuigi (although) always take a comma. Estonian keeps whatever tense the situation actually has, so there is no backshifting the way English does it.',
    ex: ['Ma jäin koju, sest sadas vihma. — I stayed at home because it was raining.']
  },
  'reported': {
    title: 'Reported speech',
    level: 'B2', link: 'index.html#reported-speech',
    body: 'The usual pattern is ütles, et plus a clause — and the tense does not shift back: Ta ütles, et ta tuleb hiljem. For information you are not vouching for, Estonian can also use the quotative -vat form.',
    ex: ['Ta ütles, et ta on juba söönud. — He said he had already eaten.']
  },
  'relative': {
    title: 'Relative clauses — kes and mis',
    level: 'B2', link: 'index.html#complex-sentences',
    body: 'kes refers to people, mis to things, and both decline: kelle, kellele, mida, millega. The clause is fenced off by commas on both sides when it sits inside the sentence.',
    ex: ['Mees, kes siin elab, on minu naaber. — The man who lives here is my neighbour.']
  },
  'past-perfect': {
    title: 'Pluperfect — olin teinud',
    level: 'B2', link: 'index.html#past-future',
    body: 'Past tense of olema plus the -nud participle, for something finished before another past event. The negative is ei olnud teinud, often contracted to polnud.',
    ex: ['Kui ma kohale jõudsin, olid nad juba lahkunud. — When I arrived they had already left.']
  },
  'des-converb': {
    title: 'The -des form — while doing',
    level: 'B2', link: 'index.html#participles',
    body: 'Add -des to the da-infinitive stem to express an action running alongside the main verb: süües, kõndides, oodates. Both actions must belong to the same subject.',
    ex: ['Süües luges ta ajalehte. — While eating, he read the newspaper.']
  },
  'idioms': {
    title: 'Idioms and proverbs',
    level: 'B2', link: 'index.html#idioms',
    body: 'Estonian proverbs are short and rarely translate word for word. Learn them as fixed blocks — the grammar inside them is often archaic and should not be taken as a model.',
    ex: ['Sajab nagu oavarrest. — It is raining cats and dogs.', 'Harjutamine teeb meistriks. — Practice makes perfect.']
  },
  'modality': {
    title: 'Modal expressions',
    level: 'B2', link: 'index.html#conditional',
    body: 'Necessity and permission are spread across several patterns: pean plus ma-infinitive (must), tuleb plus da-infinitive (one has to), ei tohi (must not), peaks and tuleks (should). Only pean conjugates for person.',
    ex: ['Siin ei tohi suitsetada. — You must not smoke here.', 'Peaks rohkem lugema. — One should read more.']
  },
  'discourse': {
    title: 'Linking ideas',
    level: 'B2', link: 'index.html#complex-sentences',
    body: 'Estonian connects arguments with fixed frames: minu arvates, ühest küljest ... teisest küljest, mida ... seda ..., mitte ainult ... vaid ka. They keep verb-second order in the clause that follows.',
    ex: ['Minu arvates on see hea mõte. — In my opinion this is a good idea.']
  },

  /* ---------------------------------------------------------------- C1 --- */
  'quotative': {
    title: 'Quotative mood — the -vat form',
    level: 'C1', link: 'index.html#reported-speech',
    body: 'The quotative reports hearsay while quietly distancing you from it. Add -vat to the present stem: olevat, minevat, tegevat. It stays the same for every person and needs no reporting verb at all.',
    ex: ['Ta olevat väga rikas. — He is said to be very rich.', 'Pood olevat suletud. — The shop is apparently closed.']
  },
  'jussive': {
    title: 'Jussive — the -gu form',
    level: 'C1', link: 'index.html#conditional',
    body: 'The jussive is a third-person command: tulgu, otsustagu, tehku. The negative is ärgu plus the -gu stem: ärgu ta oodaku. It turns up in instructions, legal text and exasperated speech.',
    ex: ['Tulgu ta homme. — Let him come tomorrow.', 'Ärgu ta oodaku. — Let him not wait.']
  },
  'mata-maks': {
    title: 'The -mata and -maks forms',
    level: 'C1', link: 'index.html#participles',
    body: '-mata means without doing something, or not yet done (lõpetamata, lausumata); -maks and the -miseks noun both express purpose. All three replace a full subordinate clause and tighten written style.',
    ex: ['Töö jäi lõpetamata. — The work remained unfinished.', 'Ta lahkus sõnagi lausumata. — He left without saying a word.']
  },
  'nominalization': {
    title: 'Verbal nouns in -mine',
    level: 'C1', link: 'index.html#participles',
    body: 'Any verb becomes a noun with -mine: lugema > lugemine, ehitama > ehitamine. The object of the original verb then moves into the genitive: raamatute lugemine, silla ehitamine.',
    ex: ['Raamatute lugemine arendab mõistust. — Reading books develops the mind.']
  },
  'partitive-plural': {
    title: 'Partitive plural and the short plural',
    level: 'C1', link: 'index.html#fourteen-cases',
    body: 'The partitive plural (-id, -sid, or a vowel change) appears after palju, after numbers and with partial objects: palju vanu maju, huvitavaid inimesi. The short variant is the everyday choice in speech.',
    ex: ['Linnas on palju vanu maju. — There are many old houses in the city.']
  },
  'register': {
    title: 'Formal register',
    level: 'C1', link: 'index.html#complex-sentences',
    body: 'Official Estonian favours the tuleb plus da-infinitive pattern, impersonal forms, teie address and heavy noun phrases: Avaldus tuleb esitada esmaspäevaks. Recognising it matters as much as producing it.',
    ex: ['Palume teil vastata reedeks. — We kindly ask you to reply by Friday.']
  },
  'emphasis': {
    title: 'Particles — ju, ikka, siiski, ka',
    level: 'C1', link: 'index.html#word-order',
    body: 'Small particles carry a sentence’s attitude. ju appeals to shared knowledge, ikka and ikkagi mean still or anyway, siiski concedes, ka adds. They sit next to the word they colour, not at the edge of the sentence.',
    ex: ['Ma ju ütlesin! — I told you so!', 'Ikkagi tasub proovida. — It is still worth trying.']
  },
  'word-formation': {
    title: 'Derivation — building words',
    level: 'C1', link: 'index.html#about',
    body: 'Estonian builds vocabulary with suffixes rather than borrowings: -lik and -ik make adjectives (kannatlik, lapsik), -us makes abstract nouns (tööpuudus), -matu makes the impossible ones (pöördumatu).',
    ex: ['See otsus on pöördumatu. — This decision is irreversible.']
  },
  'advanced-syntax': {
    title: 'Advanced sentence frames',
    level: 'C1', link: 'index.html#complex-sentences',
    body: 'Fixed correlative frames do a lot of work in polished Estonian: mida ... seda ..., mitte ainult ... vaid ka, ükskõik kui ..., mis ka ei ..., ... asemel. The pieces have to appear in the right order.',
    ex: ['Mida kauem see kestis, seda väsinumaks me muutusime. — The longer it lasted, the more tired we became.']
  }
};
