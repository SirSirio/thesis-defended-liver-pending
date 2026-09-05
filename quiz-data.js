/* ==========================================================================
   THE LIVE QUIZ: the questions, and nothing else.
   --------------------------------------------------------------------------
   Loaded by quiz-live.html (every phone) and quiz-live-host.html (the
   projector). The CORRECT ANSWERS ARE NOT IN THIS FILE on purpose: phones
   load it, phones are held by contestants, and a contestant with View Source
   deserves a fair exam. The key lives in quiz-live-host.html alone, and
   reaches the database only at the moment each answer is revealed.

   This is the third copy of the questions, after quiz.html (the paper deck)
   and quiz-sheet.html (the printed sheet). Change a question in one and you
   change it in all three by hand. Two of the copies were already living that
   deal; this file joins it rather than pretending a build step exists.
   ========================================================================== */

window.QUIZ_LIVE = {

  questions: [
    { n: 1, text: 'I am notoriously famous for:',
      opts: ['Drinking wine', 'Eating slow', 'Always wearing my headphones', 'Barefoot shoes'] },

    { n: 2, text: 'The martial art I have been practicing for many years is called:',
      opts: ['Taekwondo', 'Viet Vo Dao', 'Vovinam Kiem Quyen', 'Quan Ki Do'] },

    { n: 3, text: 'Which AI model was I using during my thesis, at ~100€ a month?',
      opts: ['DeepSeek', 'Claude', 'Gemini', 'ChatGPT'] },

    /* RETIRED 2026-09-05, owner call: two AI questions was one too many.
       The thesis one above took this slot; this stays for a possible return.
    { text: 'My favourite AI model, 100€ a month for the last 3 months:',
      opts: ['Gemini', 'ChatGPT', 'Claude', 'Grok', 'DeepSeek'] },   answer was C */

    { n: 4, text: 'My first Copenhagen landlord was just crazy. She did many things. She did NOT:',
      opts: [
        'Wrap the heater regulators in duct tape so we could not turn them on',
        'Build a 5th room over a weekend where the living room was supposed to be',
        'Nearly kick me out by email (subject: “Notice of Termination of Lease”) after I complained',
        'Crash her car into one of our bikes and hand us an air fryer as compensation',
      ] },

    { n: 5, text: 'At DTU I immediately joined a biotech competition and built a biosensor from scratch. It was called:',
      opts: ['SensUs', 'iGEM', 'BioDesign Challenge', 'Tech-n-Bio'] },

    { n: 6, text: 'When it gets warm and the sun is shining, I cannot stop thinking about:',
      opts: ['Ice cold beer', 'BBQs', 'Swimming in the sea', 'Camping in nature'] },

    { n: 7, film: true, text: 'When was this video recorded?',
      opts: [
        'Bachelor’s graduation, 8 PM',
        'Me in 2 hours',
        'New Year’s Eve, 11:58 PM',
        'A completely ordinary Tuesday, 9 AM',
      ] },

    { n: 8, text: 'A few things I don’t like. Which one do I actually just not really mind?',
      opts: [
        'Beer', 'Windy weather', 'Cold water', 'Techno music', 'People complaining',
        'Biotechnology', 'Balaton lake', 'Dressing up for parties',
        'People driving slowly (THOSE F***ING BASTARDS SHOULD JUST F***ING WALK!!!)',
      ] },

    /* RETIRED 2026-09-05, owner call: out for now, may return.
    { text: 'From best (I don’t mind) to worst (I f***ing hate it), which ranking is most accurate?',
      opts: [
        'Windy weather → Cold water → Techno music → Balaton lake → Biotechnology → Beer',
        'Cold water → Techno music → Biotechnology → Beer → Windy weather → Balaton lake',
        'Techno music → Cold water → Beer → Windy weather → Balaton lake → Biotechnology',
        'Balaton lake → Techno music → Biotechnology → Cold water → Beer → Windy weather',
      ] },  answer was never set */

    { n: 9, text: 'My go-to breakfast is:',
      opts: [
        'Broccoli / carrot / cauliflower + almond milk + oats',
        'Avocado toast',
        'Croissant + apple / banana',
        'Protein banana bread',
      ] },

    { n: 10, text: 'Crazy things that happened during my stay in Denmark. Which one is NOT true?',
      opts: [
        'A besty set off the fire alarm cooking a burger at 3 AM while I slept',
        'I have carried weapons across a border',
        'I have spent 30 hours in a row on a bus',
        'My bike got stolen and the guy just rode away in front of me',
        'I calmly walked through a city centre at −27°C in a swimming costume and sunglasses, drinking wine',
      ] },

    { n: 11, text: 'The sentence I have said most often, with the most emphasis, in the past 2 years:',
      opts: ['VEERY NIIIICEEE', 'Porco dio', 'Buongiornoooooo', 'Whaaaat?'] },

    { n: 12, text: 'Lately I became a workaholic. On average, how many hours was I at DTU every day, weekends included?',
      opts: ['8', '9', '10', '12', '14'] },

    { n: 13, text: 'How many purchases did I make on Vinted in the past 6 months?',
      opts: ['8', '15', '26', '35'] },
  ],

  /* The tie breaker is question 16 in the database and a number, not a
     letter. Closest guess earns 150 points at the podium. */
  tb: { n: 16, text: 'How many bestemmie did I say in the last month of thesis?' },

  /* Scoring, identical on every phone and on the projector, so nobody can
     argue with their own screen. A correct answer is worth 100, plus up to
     50 for speed, fading linearly over the first 20 seconds. Both clocks
     are the database's own: started_at is stamped server side when the
     question opens, created_at when the answer lands.
     `rev` is the revealed entry for the question: { a: 'C', t: started_at }. */
  points: function (rev, answerRow) {
    if (!rev || !rev.a || !answerRow) return 0;
    if (String(answerRow.answer || '').toUpperCase() !== rev.a) return 0;
    var dt = (new Date(answerRow.created_at) - new Date(rev.t)) / 1000;
    if (!(dt >= 0)) return 100;
    return 100 + Math.max(0, Math.round(50 * (1 - Math.min(dt, 20) / 20)));
  },
};
