/*
 * Starting data copied (read-only) from Ben's Google Sheet
 * "Year B Worship Plan 2026-2027" on Nov 18, 2026. The sheet itself was not changed.
 * Flags note where the sheet and the 2026–27 church year disagree.
 */
(function (root) {
  const S = (label, value = '', note = '') => ({ label, value, note });
  const WEEKEND = (k = '', j = '') => [
    { label: 'Saturday 4:00 pm', musician: k },
    { label: 'Sunday 9:00 am', musician: j },
  ];

  const advent = (hymns) => [
    S('Prelude'),
    S('Passing of the Peace (9 am)', '2–3 min'),
    S('Opening Hymn', hymns.opening || ''),
    S('Hymn of Praise', 'None'),
    S('Candle Lighting Ceremony', 'TFBF 37 "He Came Down"', hymns.candleNote || ''),
    S('First Reading'),
    S('Epistle Reading'),
    S('Gospel Alleluia', 'TFBF 45 "Emmanuel"'),
    S('Gospel Reading'),
    S('Sermon Hymn', hymns.sermon || ''),
    S('Creed', 'Nicene — LSB 206'),
    S('Prayer of the Church'),
    ...(hymns.musicalOffering ? [S('Musical Offering (9 am)')] : []),
    S('Offertory', 'LSB 159–160'),
    S('Sanctus / Agnus Dei', 'LSB 208 Sanctus, 210 Agnus Dei'),
    S('Distribution', 'Prayerful Meditation', 'Using Offering/Distribution melodies — familiar tunes'),
    S('Post-Communion', 'LSB 211'),
    S('Closing Hymn', hymns.closing || ''),
    S('Postlude'),
  ];

  const ds3 = (h) => [
    S('Opening Hymn', h.opening || ''),
    S('Hymn of Praise', h.praise || ''),
    S('Gospel Alleluia', '190 Alleluia & Verse'),
    ...(h.psalm ? [S('Responsive Psalm (before sermon)', h.psalm, h.psalmNote || '')] : []),
    S('Sermon Hymn', h.sermon || ''),
    ...(h.offertory ? [S('Offertory', '192–193')] : []),
    S('Sanctus / Agnus Dei', 'Sanctus 195, Agnus Dei 198'),
    S('Distribution', h.distribution || 'Prayerful Meditation'),
    S('Nunc Dimittis', '199'),
    S('Closing Hymn', h.closing || ''),
  ];

  const PLANS = {
    '2026-11-29': {
      setting: 'Divine Service, Setting Four',
      services: WEEKEND('Kasey', 'Janelle'),
      preacher: 'Steve Ahlersmeyer',
      slots: advent({
        opening: 'LSB 332 "Savior of the Nations, Come"',
        sermon: 'LSB 357 "O Come, O Come, Emmanuel"',
        closing: 'LSB 336 "Lo! He Comes with Clouds Descending"',
        candleNote: 'Kasey — Ben forgot which Sunday Dave Schult is singing; fine to swap if needed.',
      }),
      flags: ['Readings were blank in the sheet — filled from the LSB Series B calendar.'],
    },
    '2026-12-06': {
      setting: 'Divine Service, Setting Four',
      services: WEEKEND('Kasey', 'Janelle'),
      sermonTitle: 'War Is Over',
      slots: advent({ sermon: 'LSB 347 "Comfort, Comfort Ye My People"', musicalOffering: true }),
    },
    '2026-12-13': {
      setting: 'Divine Service, Setting Four',
      services: WEEKEND('Kasey', 'Janelle'),
      sermonTitle: 'Good News',
      slots: advent({ sermon: 'LSB 349 "Hark the Glad Sound"', musicalOffering: true }),
      flags: ['Sheet lists "Dec 13/Dec 14" — the weekend is Sat Dec 12 / Sun Dec 13.'],
    },
    '2026-12-20': {
      setting: 'Divine Service, Setting Four',
      services: [
        { label: 'Saturday Dec 19, 4:00 pm — Advent 4', musician: 'Kasey' },
        { label: 'Sunday Dec 20 — Special Service', musician: '' },
      ],
      slots: advent({ sermon: 'LSB 359 "Lo, How a Rose E\'er Blooming"', musicalOffering: true }),
      flags: ['Sheet has Advent 4 on Saturday only; Sunday Dec 20 is marked "Special Service".'],
    },
    '2027-01-06': {
      setting: 'Divine Service, Setting Three',
      services: [{ label: 'Service', musician: '' }],
      slots: ds3({ offertory: true }),
      flags: ['Sheet date says only "January" — confirm whether Epiphany is kept Wed Jan 6 or on a Sunday.'],
    },
    '2027-01-24': {
      setting: 'Divine Service, Setting Three',
      services: WEEKEND(),
      sermonTitle: 'The Light Defined',
      sermonNotes: 'Gospel text',
      slots: ds3({
        opening: '839 "O Christ, Our True and Only Light"',
        praise: '816 "From All That Dwell Below the Skies"',
        psalm: 'The Stone Rejected by the Builders — chanted Psalm 118',
        psalmNote: 'Music © 2021 Francesca LaRosa. Congregation sings the chorus; Kasey chants.',
        closing: '849 "Praise the One Who Breaks the Darkness"',
      }),
      flags: [
        'Sheet readings are Series A (Isaiah 9:1–4; 1 Cor. 1:10–18; Matt. 4:12–25). Series B for this Sunday is Jonah 3; 1 Cor. 7; Mark 1:14–20.',
        'Sheet date "Jan 24/25" is from 2026 — in 2027 the weekend is Sat Jan 23 / Sun Jan 24.',
      ],
    },
    '2027-01-31': {
      setting: 'Divine Service, Setting Three',
      services: WEEKEND(),
      sermonTitle: 'The Light at Work',
      sermonNotes: 'Micah text, God working through us',
      slots: ds3({
        opening: '904 "Blessed Jesus, at Your Word"',
        praise: 'TFBF 291 "I Will Enter"',
        sermon: '851 "Lord of Glory, You Have Bought Us"',
        closing: '837 "Lift High the Cross"',
      }),
      flags: [
        'Sheet readings are Series A (Micah 6:1–8; 1 Cor. 1:18–31; Matt. 5:1–12) and the sermon notes cite Micah. Series B is Deut. 18:15–20; 1 Cor. 8:1–13; Mark 1:21–28.',
        'Sheet date "Jan 31/Feb 1" is from 2026 — in 2027 the weekend is Sat Jan 30 / Sun Jan 31.',
      ],
    },
    '2027-02-07': {
      setting: 'Divine Service, Setting Three',
      services: WEEKEND(),
      sermonTitle: 'Shine Your Light',
      sermonNotes: "Gospel text — don't hide what you believe!",
      slots: ds3({
        opening: 'TFBF 65 "This Little Light of Mine"',
        praise: 'TFBF 291 "I Will Enter"',
        sermon: '578 "Thy Strong Word"',
        distribution: 'Handbells play; Prayerful Meditation',
      }),
      flags: [
        'Sheet calls this the 5th Sunday after the Epiphany (Series A: Isaiah 58; Matt. 5:13–20). In 2027 Ash Wednesday is Feb 10, so Feb 7 is The Transfiguration of Our Lord (Mark 9:2–9).',
      ],
    },
  };

  const CUSTOM = {
    'custom-2026-12-21-darkest-night': {
      custom: true, date: '2026-12-21', name: 'Darkest Night', color: 'blue',
      services: [{ label: 'Service', musician: '' }], slots: [],
      flags: ['Listed in the sheet with no details yet.'],
    },
  };

  root.SEED = { PLANS, CUSTOM, version: '2026-11-18' };
})(typeof window !== 'undefined' ? window : globalThis);
