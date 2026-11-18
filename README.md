# Bethlehem Worship Planner

A worship-planning app for Bethlehem Lutheran Church (LCMS), Fort Wayne. It is built on the
church year and the **Lutheran Service Book three-year lectionary**.

- **Church Year** shows every Sunday and principal feast from Advent through the Last Sunday of the Church Year.
  Each entry has its date, liturgical color, series (A/B/C) and LSB readings. Feasts that fall on a Sunday
  (such as St. Timothy and All Saints observed) can be chosen with "Observe".
- **Each weekend** holds the Divine Service setting, the Saturday 4 pm and Sunday 9 am services with their musicians,
  the sermon title, preacher and notes, and an editable order of service. New weekends start from the
  Setting Three or Setting Four defaults, following LCMS custom (no Gloria in Advent or Lent, the Verse for Lent,
  and the Athanasian Creed on Trinity).
- **Hymns** lists every hymn planned and when it was used. The weekend view warns when a hymn repeats within six weeks.
- **Print / PDF** makes a clean sheet for the musicians.

The church-year engine computes any year: 2026–27 is Series B, 2027–28 is Series C and 2028–29 is Series A.
The readings come from the LCMS Commission on Worship calendars. A **verify in LSB** badge marks readings for
days those calendars didn't print (2026–27 Proper 26, 2027–28 Epiphany 4 and Proper 6, 2028–29 Proper 4 and Proper 26).

Starting data was copied (read-only) from Pastor Ben's "Year B Worship Plan 2026-2027" sheet. Imported weekends
show a **Needs a look** note wherever the sheet disagrees with the 2026–27 calendar.

## Setup (one time)

1. Create a Firebase project and enable **Authentication → Google** and **Firestore**.
2. Add a web app, then paste its config into `firebase-config.js`.
3. Edit the team emails in `firestore.rules`, then `firebase deploy --only firestore:rules`.
4. Host it. You can use **Firebase Hosting** (`firebase deploy --only hosting`, free, works with a private repo),
   or GitHub Pages, which needs GitHub Pro for a private repo. Then add the hosting domain under
   Authentication → Settings → Authorized domains.

If `firebase-config.js` is left empty, the app runs in preview mode and saves to the browser only.

## Develop

```
node tests/calendar.test.mjs   # checks dates and readings against the LCMS calendars
python3 tools/bundle.py        # single-file preview → dist/preview.html
```

## Features
- **Hymn numbers fill in their titles** (type `357` → `LSB 357 "O come, O come, Emmanuel"`), from the LCMS Lutheran Hymn Index (`data/lsb-index.json`).
- **Hymn of the Day** from LCMS's LSB Hymn of the Day list, shown on every day and pre-filled as the Sermon Hymn on new weekends.
- **Kept on**: observe a feast on another day; **Observe**: pick a festival that falls on a Sunday.
- **Midweek series** (Advent/Lent) in one step; **special services** any day.
- **Sermon Series** tab: a season side by side with texts, series name, titles and notes.
- **Copy order from…** another service, and **Last time** (same Sunday three years earlier).
- **Volunteers** per service time; included on the print sheet and bulletin.
- **Bulletin (.docx)** draft; **Print / PDF** musician sheet.
- **Mark final** locks a weekend (only Ben or Sam can unlock); every change is kept in **Change history**.
- **Reports**: song usage for OneLicense/CCLI (CSV) and the team **calendar feed**.

## Nightly job
`.github/workflows/deploy.yml` runs on every push and nightly. `scripts/build-feeds.mjs` reads Firestore and publishes
`feeds/<token>.ics` (team calendar, unguessable link shown in Reports) and `public/this-sunday.json`
(readings, sermon title and hymns for the coming Sunday — used by the "This Sunday" box on bethlehemlcms.org).
