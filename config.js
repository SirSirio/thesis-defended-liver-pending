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
    // Optional. When set it replaces the address in the course fact table, and the two are never shown together.
    name: null,        // e.g. 'Anker Engelunds Vej 1, Bygning 101'
    address: 'Trongårdsvej 46, 2800 Kongens Lyngby, Denmark',
    note: null,        // optional extra line, e.g. 'Second floor, follow the noise'

    /* -----------------------------------------------------------------
       PRACTICAL NOTES
       -----------------------------------------------------------------
       The seven things guests actually message you about. They show up in
       the Building access section, in the order written below, which puts
       the door questions first and the pre-departure ones last.

       Fill in the ones you can answer and leave the rest null. A row left
       null simply does not appear, no empty row and no "n/a", and if all
       seven are null the whole block disappears instead of standing there
       as an empty shell.

       These are shown exactly as you write them, in every language. Keep
       them short and factual. The label on the left is translated for you;
       what you type on the right is not, which is deliberate, because
       "3. sal" and "ring 46" should not be translated anyway.
       ----------------------------------------------------------------- */

    notes: {
      entrance: null,  // e.g. 'Main entrance on Trongårdsvej, staircase C'
      floor:    null,  // e.g. '3rd floor, first door on the right'
      buzzer:   null,  // e.g. 'Ring 46. The name on the buzzer is Sirio'
      parking:  null,  // e.g. 'Free on the street after 18:00'
      transit:  null,  // e.g. 'Bus 300S to Lyngby St., then 6 minutes on foot'
      bring:    null,  // e.g. 'Whatever you want to drink. Indoor shoes help'
      arrive:   null,  // e.g. 'From 16:00. Food is served around 19:00'
    },
  },

  /* ---------------------------------------------------------------------
     THE DOOR
     ---------------------------------------------------------------------
     The single most useful thing on this site. A short clip showing which
     door actually gets people in.

     TO ADD THE VIDEO: drop the file into assets/ and write its path into
     `videoSrc` below. That is the whole job, and nothing else on the site
     needs touching. Until you do, the section shows a panel saying the access
     documentation is pending, in a box the exact size and shape the player
     will be, so nothing moves on the page the day you add it.

     Keep it small, under about 10 MB, since guests will load it outdoors on
     mobile data. MP4 (H.264) plays everywhere. A poster frame is optional but
     stops the player being a black rectangle while it loads.

     `directions` is the written version of the same thing, and it is always
     shown, above the video, rather than only when the video is missing.
     Someone standing outside on a weak signal reads it long before a clip
     finishes loading.

     You can write it two ways. One clean sentence in quotes, or a list of
     short steps in square brackets, which the site numbers 01, 02, 03 and
     lays out as a walking sequence. Use the list if getting in takes more
     than one instruction, because a numbered list is much easier to follow
     in the dark than a sentence is.

     Leave it null and the section says the door instructions are still being
     confirmed, which is a normal thing for an invitation to say.
     --------------------------------------------------------------------- */

  door: {
    videoSrc: 'assets/door.mp4',          // Set 2026-08-27. 21s, 960x540, 3.3 MB
    posterSrc: 'assets/door-poster.jpg',  // The courtyard the clip arrives at

    /* The shape of the clip, wide by tall. Almost every phone films upright,
       so IF YOU FILMED IT UPRIGHT ON YOUR PHONE, CHANGE THIS TO '9/16' and the
       box on the page turns tall and narrow to match it. Leave it as it is for
       anything filmed sideways. Getting it wrong costs you grey bars down the
       sides of the video, nothing worse. */
    aspect: '16/9',

    // A list looks like this, and the numbering is added for you:
    // ['Blue gate on the left', 'Staircase C, at the back', 'Third floor, ring 46']
    directions: null,  // or one sentence, e.g. 'Blue door left of the main gate, ring 46'
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

     `maxGuestsPerPerson` is also enforced in the database, which allows up to
     4 (section 10 of supabase/schema.sql). That is the floor under this
     number, not a second opinion: set this above 4 and registrations start
     failing with a constraint error rather than being quietly accepted. If you
     need more than 4, raise the bound in the schema file, re-run it in the
     Supabase SQL editor, and then raise this.
     --------------------------------------------------------------------- */

  enrollment: {
    deadline: '2026-09-26T23:59:00+02:00',
    maxGuestsPerPerson: 1,   // one named plus one. The owner removed the +2 option on 2026-08-31
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
    inviteUrl: 'https://chat.whatsapp.com/LyLq84bmmfr7r0vHuXV23c',
  },

  /* ---------------------------------------------------------------------
     THE QUIZ
     ---------------------------------------------------------------------
     Hidden until either the clock reaches `unlockAt`, or someone finds the
     easter egg. Built in phase 5. Configured here so it is ready.

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
     Guests upload into a shared album. Built in phase 4.

     Needs a free Supabase account (supabase.com). Run supabase/schema.sql
     once in the SQL editor, then copy two values from Project Settings > API.

     `supabaseUrl` and `supabaseKey` are shared. Registration uses exactly the
     same two values, on the same Supabase project, even though they sit under
     photos. They live here because photos asked for them first, and moving
     them now would switch registration off, so they stay put and this note
     explains why rather than the naming being a small mystery forever.

     The key below is the client side one. Newer projects call it the
     "publishable" key and it starts sb_publishable_. Older projects call it
     the "anon public" key and it is a long JWT. Either works here.

     It is safe to publish. That is what it is for, and access is controlled
     by the row level rules in supabase/schema.sql rather than by keeping the
     key hidden. A key starting sb_secret_ is the opposite: it must never go
     in this file.

     Both are filled in and live. The waiting message is what the site falls
     back to if either is ever blank: registration and the album say they are
     being set up rather than breaking, so the link stays shareable.
     --------------------------------------------------------------------- */

  photos: {
    supabaseUrl: 'https://aplaxdplwnnlezffatal.supabase.co',
    supabaseKey: 'sb_publishable_Z6Cq5vFRqyUhXueQGevrYQ__j0pNRrc',
    bucket: 'party-photos',
    table: 'photos',
    /* Changing this number is a three file job, not a one line one, and two
       of the three files will not complain if you forget them.

       The site reads it here and nowhere else, so the count, the refusal and
       the limit are all correct the moment you change it. The other two are
       not:

         supabase/schema.sql section 4 holds the same number in the trigger
         that enforces it. JavaScript alone is a suggestion. Change it there
         and run the file again, or the database keeps the old ceiling.

         copy.js spells the number out as a WORD, in three languages, in
         photos.lede, photos.refuse.extra and photos.full.body. Lower this to
         three and the site refuses the fourth photograph while telling the
         guest, in English, Italian and Danish, that the limit is five.

       Left as words on purpose: they are jokes and sentences rather than
       fields, and "5 photographs are on record in your name" is not the line
       that was written. So the number is not substituted into them, and this
       note is here instead, because a trap nobody is warned about is worse
       than a sentence nobody has to read. */
    maxPerGuest: 5,

    /* The biggest file a phone is allowed to hand over, before the site
       shrinks it. This number and the bucket's own ceiling in
       supabase/schema.sql section 6 are two different numbers doing two
       different jobs: this one protects the phone's memory before the
       shrink, that one protects the bucket after it. Do not reconcile them
       into one.

       RAISED FROM 12 TO 40 ON 2026-08-28, because 12 was refusing real
       photographs. A modern phone writes 8 to 15 MB for an ordinary shot, a
       panorama or a night-mode composite goes well past that, and Apple
       ProRAW starts around 25. Guests were being told "Larger than 12 MB"
       about pictures they had just taken, which is a refusal they cannot act
       on and the site's fault rather than theirs.

       IT COSTS THE BUCKET NOTHING. Whatever arrives is decoded, drawn at
       maxEdgePx and re-encoded as JPEG before a byte is uploaded, so the
       stored object is a few hundred kilobytes whether the source was 2 MB or
       40. This number only decides how large a file the phone is asked to
       decode, and the decode already has a 20 second timeout and a clean
       refusal if it fails. */
    maxFileSizeMb: 40,

    /* When the phone cannot decode a JPEG at all, or runs out of memory
       re-encoding it, the original bytes are sent as they are instead of the
       picture being refused. This is the ceiling for that: above it the
       refusal stands, because the album has to carry whatever lands here at
       full size. Fifteen covers every camera JPEG a phone writes by default. */
    originalMaxMb: 15,

    /* VIDEO.

       Owner decision, 2026-08-27: one video per guest, up to one minute, and
       it spends one of the five slots above rather than being a sixth thing.
       Recorded in full as D-1 to D-5 in
       .planning/phases/04.1-.../04.1-CONTEXT.md.

       enabled is the switch the rules strip reads. While it is false the
       strip says nothing about video, which is the only honest thing it can
       say until the validator, the upload path and the database all accept
       one. Flipping this to true before those exist would put a promise on
       the page that the next picked file breaks.

       maxSeconds is checked in the browser and NOWHERE ELSE. There is no
       server side duration check and there cannot be a cheap one, so this is
       a courtesy to a guest who picked the wrong clip, not a control. Anyone
       talking to the API directly can ignore it.

       maxFileSizeMb here is a different number from the one above and they
       must not be reconciled. That one protects the phone's memory before a
       canvas decode; a video is never decoded to a canvas, so this one exists
       only to refuse a file before it is sent. The number that actually holds
       is the bucket's file_size_limit in supabase/schema.sql, counted on the
       bytes that arrive.

       Fifty is not a round number picked for looks. One minute of 1080p phone
       video is roughly 60 to 90 MB and 4K is roughly 350 MB, so 50 accepts
       most 1080p and refuses 4K, and the refusal has to say "film at a lower
       quality" rather than "too large" or it is not something a guest can act
       on at a party. Nothing is re-encoded in the browser: there is no build
       step in this project and ffmpeg.wasm is a thirty megabyte dependency.

       The ceiling is also a bill. Supabase's free tier is 1 GB of storage and
       5 GB of egress a month, so 50 MB per guest is roughly twenty videos
       before the tier is spent. Raising this number raises that bill. */
    video: {
      enabled: true,
      maxSeconds: 60,
      maxFileSizeMb: 50,

      /* THE CONTAINERS ACCEPTED, and the extension each is stored under.
         Added 2026-08-28 because the first version accepted only mp4 and
         quicktime, and refused everything else with "This video format is not
         accepted". That was wrong about real phone output: Android writes
         video/3gpp for lower resolution capture, and plenty of apps hand back
         webm.

         NOTHING IS TRANSCODED. There is no build step in this project and
         ffmpeg.wasm is a thirty megabyte dependency that would take minutes on
         a phone for a fifty megabyte clip, so a container is either stored as
         it arrived or refused. Widening this list is therefore the only way to
         accept more video, and it is a real trade: webm does not play in
         Safari and 3gp does not play in Chrome, so a guest may upload
         something another guest cannot watch. mp4 and mov, which is what
         almost every phone camera actually writes, play everywhere.

         Changing this list is a THREE PLACE job. The same extensions must
         appear in STORAGE_PATH_RE in app.js AND album.js, and the matching
         mime types in the bucket's allowed_mime_types in supabase/schema.sql,
         or the upload is accepted here and refused on the wire. */
      containers: {
        'video/mp4':        'mp4',
        'video/quicktime':  'mov',
        'video/3gpp':       '3gp',
        'video/webm':       'webm',
      },
    },

    /* When the album starts accepting photographs. Written the same way as
       the party time above, with the country's offset on the end, so it is
       compared as a moment rather than as a wall clock: a guest whose phone
       is set to another country still gets the same instant.

       Set this to null to open uploads immediately. That is the one line
       to change on the night if a phone is showing the wrong date and
       guests are being told the portal is shut.

       Keep it earlier than startsAt above. The countdown's closing state
       tells guests to go and upload their photographs, and it must never
       point them at a portal that is still closed. */
    /* Restored 2026-08-31 at the owner's chosen moment: uploads open at
       16:00 on the day. admin.html can override this in either direction on
       the night without a deploy, and null still means open immediately,
       which stays the one line recovery if a phone shows the wrong date. */
    opensAt: '2026-10-03T16:00:00+02:00',

    /* The longest edge of a photograph after the site shrinks it, in
       pixels. Bigger is prettier and roughly doubles the bytes on a
       connection that will already be busy. */
    maxEdgePx: 1600,

    /* JPEG quality, between 0 and 1. A number outside that range is
       silently ignored by the browser, so a typo here makes larger files
       and no error message anywhere. */
    jpegQuality: 0.82,
  },

  /* ---------------------------------------------------------------------
     THE JOKE
     ---------------------------------------------------------------------
     The course number is the spine of the whole parody. 31026 encodes the
     whole date, 3/10/26, where the original 03102 encoded only the day and
     month. If the date moves and you care about that detail, change it here.
     If you do not care, nobody will ever notice.

     CHANGING THIS DOES NOT CHANGE THE STORAGE PREFIX, and it must not. Every
     guest's identity lives under the c03102. key in their browser: their
     guest_id, their name, their photo paths. Rename that prefix and every
     registration and every uploaded photograph becomes unreachable to the
     person who made it, with no way back. The prefix is an internal key that
     happens to contain a number, not the number itself. Same for the
     c03102: event names motion.js listens for.
     --------------------------------------------------------------------- */

  course: {
    number: '31026',
    ects: 5,
    host: 'Sirio',

    /* The course responsible's photograph, shown beside the name under the
       hero title, the way a real course page shows a lecturer.

       Optional. Left null it degrades to the initial in a disc, which reads as
       deliberate rather than as a missing image, so the page is correct today
       and better the moment a file exists. Drop one in assets/ and put its
       path here, for example 'assets/host.jpg'. Square crops best: it is
       displayed in a circle at 48px, so anything wider is centre cropped.

       Nothing else changes anywhere when this is set. */
    photo: null,
  },

  /* ---------------------------------------------------------------------
     LANGUAGE
     ---------------------------------------------------------------------
     English, Italian and Danish are all complete. English is primary, so
     every new visitor lands on it and can switch from the header.

     Set this to 'auto' instead if you would rather guess from the browser,
     which sends Italian phones to Italian and Danish phones to Danish. A
     guest's own choice always wins over both, and is remembered.
     --------------------------------------------------------------------- */

  defaultLanguage: 'en',

};
