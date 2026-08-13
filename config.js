/* ==========================================================================
   CONFIG
   --------------------------------------------------------------------------
   Everything you might need to change lives in this file.
   You never need to touch any other file to update the party details.

   Anything set to null shows a polite placeholder on the site instead of
   breaking. So you can share the link right now and fill these in later.
   ========================================================================== */

window.PARTY_CONFIG = {

  /* ---------------------------------------------------------------------
     WHEN
     ---------------------------------------------------------------------
     Written as ISO 8601 with an explicit offset. The "+02:00" is central
     European summer time, which covers both Italy and Denmark in October.
     Keep the offset. It is what makes the countdown show the same target
     to a guest in Rome, in Copenhagen, and on a plane in between.

     TO CHANGE THE DATE: edit the line below. That is the whole job.
     --------------------------------------------------------------------- */

  startsAt: '2026-10-03T16:00:00+02:00',

  // When the countdown flips from "happening now" to "it is over".
  // Rough guess is fine. Nobody is checking.
  endsAt: '2026-10-04T03:00:00+02:00',

  /* ---------------------------------------------------------------------
     WHERE
     ---------------------------------------------------------------------
     Set `address` to the full street address, exactly as you would type it
     into Google Maps. Everything else (the embedded map, the "open in
     Google Maps" link, the "open in Apple Maps" link) is generated from it.

     Leave it null and the location section says the venue is being
     confirmed, which is a normal thing for an invitation to say.
     --------------------------------------------------------------------- */

  venue: {
    name: null,        // e.g. 'Anker Engelunds Vej 1, Bygning 101'
    address: null,     // e.g. 'Anker Engelunds Vej 1, 2800 Kgs. Lyngby, Denmark'
    note: null,        // optional extra line, e.g. 'Second floor, follow the noise'
  },

  /* ---------------------------------------------------------------------
     THE DOOR
     ---------------------------------------------------------------------
     The single most useful thing on this site. A short clip showing which
     door actually gets people in.

     Put the file in assets/ and set the path below. Keep it small, under
     about 10 MB, since guests will load it outdoors on mobile data.
     MP4 (H.264) plays everywhere. A poster frame is optional but stops the
     player being a black rectangle while it loads.
     --------------------------------------------------------------------- */

  door: {
    videoSrc: null,    // e.g. 'assets/door.mp4'
    posterSrc: null,   // e.g. 'assets/door-poster.jpg'
    directions: null,  // written backup, e.g. 'Blue door on the left of the main gate'
  },

  /* ---------------------------------------------------------------------
     ENROLLMENT
     ---------------------------------------------------------------------
     So you know who is actually coming. Built in phase 3, on the same
     Supabase project as the photos, so it costs you no extra setup.

     `deadline` is what creates the gentle pressure to sign up. It is shown
     on the site and the nudge copy sharpens as it approaches. Set it a few
     days before the party so you can count heads and buy accordingly.

     `showCountFrom` hides the confirmed total until it reaches this number,
     because "2 people are coming" persuades nobody.
     --------------------------------------------------------------------- */

  enrollment: {
    deadline: '2026-09-26T23:59:00+02:00',
    maxGuestsPerPerson: 2,   // how many extra people one guest may bring
    showCountFrom: 8,        // hide the running total until it looks healthy
    showAttendeeList: true,  // first names only, never full names
  },

  /* ---------------------------------------------------------------------
     WHATSAPP GROUP
     ---------------------------------------------------------------------
     Offered the instant someone enrolls, which is the moment they are most
     willing to tap one more thing.

     Get the link in WhatsApp: open the group, Group info, Invite via link.
     It looks like https://chat.whatsapp.com/XXXXXXXXXXXX

     Leave it null and the whole thing stays hidden rather than broken.
     --------------------------------------------------------------------- */

  whatsapp: {
    inviteUrl: null,
  },

  /* ---------------------------------------------------------------------
     THE QUIZ
     ---------------------------------------------------------------------
     Hidden until either the clock reaches `unlockAt`, or someone finds the
     easter egg. Built in phase 4. Configured here so it is ready.

     This is a party quiz, not a secret. Anyone who opens the page source
     can find the link. That is fine and not worth engineering around.
     --------------------------------------------------------------------- */

  quiz: {
    url: null,                            // your Kahoot link
    unlockAt: '2026-10-03T20:00:00+02:00', // reveals itself at this moment
    eggClicks: 7,                          // clicks on the course mark to unlock early
  },

  /* ---------------------------------------------------------------------
     PHOTOS
     ---------------------------------------------------------------------
     Guests upload into a shared album. Built in phase 3.

     Needs a free Supabase account (supabase.com). Create a project, then
     copy the project URL and the anon public key from
     Project Settings > API. Both are safe to publish: the anon key is
     designed to sit in public JavaScript, and access is controlled by
     row level rules rather than by hiding the key.

     Until these are filled in, the photo section says uploads open later.
     --------------------------------------------------------------------- */

  photos: {
    supabaseUrl: null,     // e.g. 'https://abcdefgh.supabase.co'
    supabaseAnonKey: null, // the long "anon public" key
    bucket: 'party-photos',
    table: 'photos',
    maxPerGuest: 5,        // soft limit. Clearing browser data resets it.
    maxFileSizeMb: 12,
  },

  /* ---------------------------------------------------------------------
     THE JOKE
     ---------------------------------------------------------------------
     The course number is the spine of the whole parody. 03102 encodes the
     date, 03/10. If the date moves and you care about that detail, change
     it here. If you do not care, nobody will ever notice.
     --------------------------------------------------------------------- */

  course: {
    number: '03102',
    ects: 5,
    host: 'Sirio',
  },

  /* ---------------------------------------------------------------------
     LANGUAGE
     ---------------------------------------------------------------------
     'auto' guesses from the browser and lets the guest override.
     Force a language by setting 'it' or 'en' instead.
     --------------------------------------------------------------------- */

  defaultLanguage: 'auto',

};
