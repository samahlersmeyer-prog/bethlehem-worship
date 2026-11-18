/*
 * Lutheran Service Book — Three-Year Lectionary (Series A, B, C)
 *
 * Source: LCMS Commission on Worship church-year calendars
 *   2026–27 Series B, 2024–25 Series C, 2025–26 Series A (files.lcms.org).
 * Feasts and festivals: LSB readings as listed by the Wartburg Project (LSB occasions).
 * Entries marked `verify: true` were not printed in those three calendars
 * (the day did not fall in that year) and were filled from LSB; confirm
 * against the LSB pew edition (pp. xiv–xix) before printing a bulletin.
 *
 * Each reading set: [First Reading, Psalm, Epistle, Gospel]
 */
(function (root) {
  const R = (s) => s.split('|').map((x) => x.trim());

  // Propers that vary by series
  const SERIES = {
    advent1: {
      A: R('Isaiah 2:1–5 | Psalm 122 | Rom. 13:(8–10) 11–14 | Matt. 21:1–11 or Matt. 24:36–44'),
      B: R('Isaiah 64:1–9 | Psalm 80:1–7 | 1 Cor. 1:3–9 | Mark 11:1–10 or Mark 13:24–37'),
      C: R('Jer. 33:14–16 | Psalm 25:1–10 | 1 Thess. 3:9–13 | Luke 19:28–40 or Luke 21:25–36'),
    },
    advent2: {
      A: R('Isaiah 11:1–10 | Psalm 72:1–7 | Rom. 15:4–13 | Matt. 3:1–12'),
      B: R('Isaiah 40:1–11 | Psalm 85 | 2 Peter 3:8–14 | Mark 1:1–8'),
      C: R('Mal. 3:1–7b | Psalm 66:1–12 | Phil. 1:2–11 | Luke 3:1–14 (15–20)'),
    },
    advent3: {
      A: R('Isaiah 35:1–10 | Psalm 146 | James 5:7–11 | Matt. 11:2–15'),
      B: R('Isaiah 61:1–4, 8–11 | Psalm 126 | 1 Thess. 5:16–24 | John 1:6–8, 19–28'),
      C: R('Zeph. 3:14–20 | Psalm 85 | Phil. 4:4–7 | Luke 7:18–28 (29–35)'),
    },
    advent4: {
      A: R('Isaiah 7:10–17 | Psalm 24 | Rom. 1:1–7 | Matt. 1:18–25'),
      B: R('2 Sam. 7:1–11, 16 | Psalm 89:1–5 (19–29) | Rom. 16:25–27 | Luke 1:26–38'),
      C: R('Micah 5:2–5a | Psalm 80:1–7 | Heb. 10:5–10 | Luke 1:39–45 (46–56)'),
    },
    christmas1: {
      A: R('Isaiah 63:7–14 | Psalm 111 | Gal. 4:4–7 | Matt. 2:13–23'),
      B: R('Isaiah 61:10–62:3 | Psalm 111 | Gal. 4:4–7 | Luke 2:22–40'),
      C: R('Ex. 13:1–3a, 11–15 | Psalm 111 | Col. 3:12–17 | Luke 2:22–40'),
    },
    baptism: {
      A: R('Isaiah 42:1–9 | Psalm 29 | Rom. 6:1–11 | Matt. 3:13–17'),
      B: R('Gen. 1:1–5 | Psalm 29 | Rom. 6:1–11 | Mark 1:4–11'),
      C: R('Isaiah 43:1–7 | Psalm 29 | Rom. 6:1–11 | Luke 3:15–22'),
    },
    epiphany2: {
      A: R('Isaiah 49:1–7 | Psalm 40:1–11 | 1 Cor. 1:1–9 | John 1:29–42a'),
      B: R('1 Sam. 3:1–10 (11–20) | Psalm 139:1–10 | 1 Cor. 6:12–20 | John 1:43–51'),
      C: R('Isaiah 62:1–5 | Psalm 128 | 1 Cor. 12:1–11 | John 2:1–11'),
    },
    epiphany3: {
      A: R('Isaiah 9:1–4 | Psalm 27:1–9 (10–14) | 1 Cor. 1:10–18 | Matt. 4:12–25'),
      B: R('Jonah 3:1–5, 10 | Psalm 62 | 1 Cor. 7:29–31 (32–35) | Mark 1:14–20'),
      C: R('Neh. 8:1–3, 5–6, 8–10 | Psalm 19:(1–6) 7–14 | 1 Cor. 12:12–31a | Luke 4:16–30'),
    },
    epiphany4: {
      A: R('Micah 6:1–8 | Psalm 15 | 1 Cor. 1:18–31 | Matt. 5:1–12'),
      B: R('Deut. 18:15–20 | Psalm 111 | 1 Cor. 8:1–13 | Mark 1:21–28'),
      C: R('Jer. 1:4–10 (17–19) | Psalm 71:1–6 (7–11) | 1 Cor. 12:31b–13:13 | Luke 4:31–44'),
    },
    epiphany5: {
      A: R('Isaiah 58:3–9a | Psalm 112:1–9 | 1 Cor. 2:1–12 (13–16) | Matt. 5:13–20'),
      B: { r: R('Isaiah 40:21–31 | Psalm 147:1–11 | 1 Cor. 9:16–27 | Mark 1:29–39'), verify: true },
      C: R('Isaiah 6:1–8 (9–13) | Psalm 138 | 1 Cor. 14:12b–20 | Luke 5:1–11'),
    },
    epiphany6: {
      C: R('Jer. 17:5–8 | Psalm 1 | 1 Cor. 15:(1–11) 12–20 | Luke 6:17–26'),
    },
    epiphany7: {
      C: R('Gen. 45:3–15 | Psalm 103:1–13 | 1 Cor. 15:21–26, 30–42 | Luke 6:27–38'),
    },
    transfiguration: {
      A: R('Ex. 24:8–18 | Psalm 2:6–12 | 2 Peter 1:16–21 | Matt. 17:1–9'),
      B: R('2 Kings 2:1–12 or Ex. 34:29–35 | Psalm 50:1–6 | 2 Cor. 3:12–13 (14–18); 4:1–6 | Mark 9:2–9'),
      C: R('Deut. 34:1–12 | Psalm 99 | Heb. 3:1–6 | Luke 9:28–36'),
    },
    ashWednesday: {
      A: R('Joel 2:12–19 | Psalm 51:1–13 (14–19) | 2 Cor. 5:20b–6:10 | Matt. 6:1–6, 16–21'),
      B: R('Joel 2:12–19 | Psalm 51:1–13 (14–19) | 2 Cor. 5:20b–6:10 | Matt. 6:1–6, 16–21'),
      C: R('Joel 2:12–19 | Psalm 51:1–13 (14–19) | 2 Cor. 5:20b–6:10 | Matt. 6:(1–6) 16–21'),
    },
    lent1: {
      A: R('Gen. 3:1–21 | Psalm 32:1–7 | Rom. 5:12–19 | Matt. 4:1–11'),
      B: R('Gen. 22:1–18 | Psalm 25:1–10 | James 1:12–18 | Mark 1:9–15'),
      C: R('Deut. 26:1–11 | Psalm 91:1–13 | Rom. 10:8b–13 | Luke 4:1–13'),
    },
    lent2: {
      A: R('Gen. 12:1–9 | Psalm 121 | Rom. 4:1–8, 13–17 | John 3:1–17'),
      B: R('Gen. 17:1–7, 15–16 | Psalm 22:23–31 | Rom. 5:1–11 | Mark 8:27–38'),
      C: R('Jer. 26:8–15 | Psalm 4 | Phil. 3:17–4:1 | Luke 13:31–35'),
    },
    lent3: {
      A: R('Ex. 17:1–7 | Psalm 95:1–9 | Rom. 5:1–8 | John 4:5–26 (27–30, 39–42)'),
      B: R('Ex. 20:1–17 | Psalm 19 | 1 Cor. 1:18–31 | John 2:13–22 (23–25)'),
      C: R('Ezek. 33:7–20 | Psalm 85 | 1 Cor. 10:1–13 | Luke 13:1–9'),
    },
    lent4: {
      A: R('Isaiah 42:14–21 | Psalm 142 | Eph. 5:8–14 | John 9:1–41 or John 9:1–7, 13–17, 34–39'),
      B: R('Num. 21:4–9 | Psalm 107:1–9 | Eph. 2:1–10 | John 3:14–21'),
      C: R('Isaiah 12:1–6 | Psalm 32 | 2 Cor. 5:16–21 | Luke 15:1–3, 11–32'),
    },
    lent5: {
      A: R('Ezek. 37:1–14 | Psalm 130 | Rom. 8:1–11 | John 11:1–45 (46–53) or John 11:17–27, 38–53'),
      B: R('Jer. 31:31–34 | Psalm 119:9–16 | Heb. 5:1–10 | Mark 10:(32–34) 35–45'),
      C: R('Isaiah 43:16–21 | Psalm 126 | Phil. 3:(4b–7) 8–14 | Luke 20:9–20'),
    },
    palmSunday: {
      A: R('Isaiah 50:4–9a | Psalm 118:19–29 or Psalm 31:9–16 | Phil. 2:5–11 | Procession: John 12:12–19; Matt. 26:1–27:66 or Matt. 27:11–66 or John 12:20–43'),
      B: R('Zech. 9:9–12 | Psalm 118:19–29 or Psalm 31:9–16 | Phil. 2:5–11 | Mark 14:1–15:47 or Mark 15:1–47 or John 12:20–43'),
      C: R('Deut. 32:36–39 | Psalm 118:19–29 or Psalm 31:9–16 | Phil. 2:5–11 | Procession: John 12:12–19; Luke 22:1–23:56 or Luke 23:1–56 or John 12:20–43'),
    },
    maundyThursday: {
      A: R('Ex. 24:3–11 | Psalm 116:12–19 | Heb. 9:11–22 | Matt. 26:17–30'),
      B: R('Ex. 24:3–11 | Psalm 116:12–19 | 1 Cor. 10:16–17 | Mark 14:12–26'),
      C: R('Jer. 31:31–34 or Ex. 12:1–14 | Psalm 116:12–19 | Heb. 10:15–25 or 1 Cor. 11:23–32 | Luke 22:7–20 or John 13:1–17, 31b–35'),
    },
    easterSunrise: {
      A: R('Ex. 14:10–15:1 | Psalm 118:15–29 or The Song of Moses and Israel | 1 Cor. 15:1–11 | John 20:1–18'),
      B: R('Ex. 15:1–11 | Psalm 118:15–29 | 1 Cor. 5:6b–8 | John 20:1–18'),
      C: R('Job 19:23–27 | Psalm 118:15–29 | 1 Cor. 15:51–57 | John 20:1–18'),
    },
    easter: {
      A: R('Acts 10:34–43 or Jer. 31:1–6 | Psalm 16 | Col. 3:1–4 | Matt. 28:1–10'),
      B: R('Isaiah 25:6–9 | Psalm 16 | 1 Cor. 15:1–11 | Mark 16:1–8'),
      C: R('Isaiah 65:17–25 | Psalm 16 | 1 Cor. 15:19–26 | Luke 24:1–12'),
    },
    easter2: {
      A: R('Acts 5:29–42 | Psalm 148 | 1 Peter 1:3–9 | John 20:19–31'),
      B: R('Acts 4:32–35 | Psalm 148 | 1 John 1:1–2:2 | John 20:19–31'),
      C: R('Acts 5:12–20 (21–32) | Psalm 148 | Rev. 1:4–18 | John 20:19–31'),
    },
    easter3: {
      A: R('Acts 2:14a, 36–41 | Psalm 116:1–14 | 1 Peter 1:17–25 | Luke 24:13–35'),
      B: R('Acts 3:11–21 | Psalm 4 | 1 John 3:1–7 | Luke 24:36–49'),
      C: R('Acts 9:1–22 | Psalm 30 | Rev. 5:(1–7) 8–14 | John 21:1–14 (15–19)'),
    },
    easter4: {
      A: R('Acts 2:42–47 | Psalm 23 | 1 Peter 2:19–25 | John 10:1–10'),
      B: R('Acts 4:1–12 | Psalm 23 | 1 John 3:16–24 | John 10:11–18'),
      C: R('Acts 20:17–35 | Psalm 23 | Rev. 7:9–17 | John 10:22–33'),
    },
    easter5: {
      A: R('Acts 6:1–9; 7:2a, 51–60 | Psalm 146 | 1 Peter 2:2–10 | John 14:1–14'),
      B: R('Acts 8:26–40 | Psalm 150 | 1 John 4:1–11 (12–21) | John 15:1–8'),
      C: R('Acts 11:1–18 | Psalm 148 | Rev. 21:1–7 | John 16:12–22 or John 13:31–35'),
    },
    easter6: {
      A: R('Acts 17:16–31 | Psalm 66:8–20 | 1 Peter 3:13–22 | John 14:15–21'),
      B: R('Acts 10:34–48 | Psalm 98 | 1 John 5:1–8 | John 15:9–17'),
      C: R('Acts 16:9–15 | Psalm 67 | Rev. 21:9–14, 21–27 | John 16:23–33 or John 5:1–9'),
    },
    easter7: {
      A: R('Acts 1:12–26 | Psalm 68:1–10 | 1 Peter 4:12–19; 5:6–11 | John 17:1–11'),
      B: R('Acts 1:12–26 | Psalm 1 | 1 John 5:9–15 | John 17:11b–19'),
      C: R('Acts 1:12–26 | Psalm 133 | Rev. 22:1–6 (7–11) 12–20 | John 17:20–26'),
    },
    pentecost: {
      A: R('Num. 11:24–30 | Psalm 25:1–15 | Acts 2:1–21 | John 7:37–39'),
      B: R('Ezek. 37:1–14 | Psalm 139:1–12 (13–16) | Acts 2:1–21 | John 15:26–27; 16:4b–15'),
      C: R('Gen. 11:1–9 | Psalm 143 | Acts 2:1–21 | John 14:23–31'),
    },
    trinity: {
      A: R('Gen. 1:1–2:4a | Psalm 8 | Acts 2:14a, 22–36 | Matt. 28:16–20'),
      B: R('Isaiah 6:1–8 | Psalm 29 | Acts 2:14a, 22–36 | John 3:1–17'),
      C: R('Prov. 8:1–4, 22–31 | Psalm 8 | Acts 2:14a, 22–36 | John 8:48–59'),
    },
    proper4: {
      A: { r: R('Deut. 11:18–21, 26–28 | Psalm 4 | Rom. 3:21–28 | Matt. 7:(15–20) 21–29'), verify: true },
      B: R('Deut. 5:12–15 | Psalm 81:1–10 | 2 Cor. 4:5–12 | Mark 2:23–28 (3:1–6)'),
    },
    proper5: {
      A: R('Hosea 5:15–6:6 | Psalm 119:65–72 | Rom. 4:13–25 | Matt. 9:9–13'),
      B: R('Gen. 3:8–15 | Psalm 130 | 2 Cor. 4:13–5:1 | Mark 3:20–35'),
    },
    proper6: {
      A: R('Ex. 19:2–8 | Psalm 100 | Rom. 5:6–15 | Matt. 9:35–10:8 (9–20)'),
      B: R('Ezek. 17:22–24 | Psalm 1 | 2 Cor. 5:1–10 (11–17) | Mark 4:26–34'),
      C: { r: R('2 Sam. 11:26–12:10, 13–14 | Psalm 32:1–7 | Gal. 2:15–21; 3:10–14 | Luke 7:36–8:3'), verify: true },
    },
    proper7: {
      A: R('Jer. 20:7–13 | Psalm 91:1–10 (11–16) | Rom. 6:12–23 | Matt. 10:5a, 21–33'),
      B: R('Job 38:1–11 | Psalm 124 | 2 Cor. 6:1–13 | Mark 4:35–41'),
      C: R('Isaiah 65:1–9 | Psalm 3 | Gal. 3:23–4:7 | Luke 8:26–39'),
    },
    proper8: {
      A: R('Jer. 28:5–9 | Psalm 119:153–160 | Rom. 7:1–13 | Matt. 10:34–42'),
      B: R('Lam. 3:22–33 | Psalm 30 | 2 Cor. 8:1–9, 13–15 | Mark 5:21–43'),
      C: R('1 Kings 19:9b–21 | Psalm 16 | Gal. 5:1, 13–25 | Luke 9:51–62'),
    },
    proper9: {
      A: R('Zech. 9:9–12 | Psalm 145:1–14 | Rom. 7:14–25a | Matt. 11:25–30'),
      B: R('Ezek. 2:1–5 | Psalm 123 | 2 Cor. 12:1–10 | Mark 6:1–13'),
      C: R('Isaiah 66:10–14 | Psalm 66:1–7 | Gal. 6:1–10, 14–18 | Luke 10:1–20'),
    },
    proper10: {
      A: R('Isaiah 55:10–13 | Psalm 65:(1–8) 9–13 | Rom. 8:12–17 | Matt. 13:1–9, 18–23'),
      B: R('Amos 7:7–15 | Psalm 85:(1–7) 8–13 | Eph. 1:3–14 | Mark 6:14–29'),
      C: R('Lev. (18:1–5) 19:9–18 | Psalm 41 | Col. 1:1–14 | Luke 10:25–37'),
    },
    proper11: {
      A: R('Isaiah 44:6–8 | Psalm 119:57–64 | Rom. 8:18–27 | Matt. 13:24–30, 36–43'),
      B: R('Jer. 23:1–6 | Psalm 23 | Eph. 2:11–22 | Mark 6:30–44'),
      C: R('Gen. 18:1–10a (10b–14) | Psalm 27:(1–6) 7–14 | Col. 1:21–29 | Luke 10:38–42'),
    },
    proper12: {
      A: R('Deut. 7:6–9 | Psalm 125 | Rom. 8:28–39 | Matt. 13:44–52'),
      B: R('Gen. 9:8–17 | Psalm 136:1–9 | Eph. 3:14–21 | Mark 6:45–56'),
      C: R('Gen. 18:(17–19) 20–33 | Psalm 138 | Col. 2:6–15 (16–19) | Luke 11:1–13'),
    },
    proper13: {
      A: R('Isaiah 55:1–5 | Psalm 136:1–9 (23–26) | Rom. 9:1–5 (6–13) | Matt. 14:13–21'),
      B: R('Ex. 16:2–15 | Psalm 145:10–21 | Eph. 4:1–16 | John 6:22–35'),
      C: R('Eccl. 1:2, 12–14; 2:18–26 | Psalm 100 | Col. 3:1–11 | Luke 12:13–21'),
    },
    proper14: {
      A: R('Job 38:4–18 | Psalm 18:1–6 (7–16) | Rom. 10:5–17 | Matt. 14:22–33'),
      B: R('1 Kings 19:1–8 | Psalm 34:1–8 | Eph. 4:17–5:2 | John 6:35–51'),
      C: R('Gen. 15:1–6 | Psalm 33:12–22 | Heb. 11:1–16 | Luke 12:22–34 (35–40)'),
    },
    proper15: {
      A: R('Isaiah 56:1, 6–8 | Psalm 67 | Rom. 11:1–2a, 13–15, 28–32 | Matt. 15:21–28'),
      B: R('Prov. 9:1–10 or Josh. 24:1–2a, 14–18 | Psalm 34:12–22 | Eph. 5:6–21 | John 6:51–69'),
      C: R('Jer. 23:16–29 | Psalm 119:81–88 | Heb. 11:17–31 (32–40); 12:1–3 | Luke 12:49–53 (54–56)'),
    },
    proper16: {
      A: R('Isaiah 51:1–6 | Psalm 138 | Rom. 11:33–12:8 | Matt. 16:13–20'),
      B: R('Isaiah 29:11–19 | Psalm 14 | Eph. 5:22–33 | Mark 7:1–13'),
      C: R('Isaiah 66:18–23 | Psalm 50:1–15 | Heb. 12:4–24 (25–29) | Luke 13:22–30'),
    },
    proper17: {
      A: R('Jer. 15:15–21 | Psalm 26 | Rom. 12:9–21 | Matt. 16:21–28'),
      B: R('Deut. 4:1–2, 6–9 | Psalm 119:129–136 | Eph. 6:10–20 | Mark 7:14–23'),
      C: R('Prov. 25:2–10 | Psalm 131 | Heb. 13:1–17 | Luke 14:1–14'),
    },
    proper18: {
      A: R('Ezek. 33:7–9 | Psalm 32:1–7 | Rom. 13:1–10 | Matt. 18:1–20'),
      B: R('Isaiah 35:4–7a | Psalm 146 | James 2:1–10, 14–18 | Mark 7:(24–30) 31–37'),
      C: R('Deut. 30:15–20 | Psalm 1 | Philemon 1–21 | Luke 14:25–35'),
    },
    proper19: {
      A: R('Gen. 50:15–21 | Psalm 103:1–12 | Rom. 14:1–12 | Matt. 18:21–35'),
      B: R('Isaiah 50:4–10 | Psalm 116:1–9 | James 3:1–12 | Mark 9:14–29'),
      C: R('Ezek. 34:11–24 | Psalm 119:169–176 | 1 Tim. 1:(5–11) 12–17 | Luke 15:1–10'),
    },
    proper20: {
      A: R('Isaiah 55:6–9 | Psalm 27:1–9 | Phil. 1:12–14, 19–30 | Matt. 20:1–16'),
      B: R('Jer. 11:18–20 | Psalm 54 | James 3:13–4:10 | Mark 9:30–37'),
      C: R('Amos 8:4–7 | Psalm 113 | 1 Tim. 2:1–15 | Luke 16:1–15'),
    },
    proper21: {
      A: R('Ezek. 18:1–4, 25–32 | Psalm 25:1–10 | Phil. 2:1–4 (5–13) 14–18 | Matt. 21:23–27 (28–32)'),
      B: R('Num. 11:4–6, 10–16, 24–29 | Psalm 104:27–35 | James 5:(1–12) 13–20 | Mark 9:38–50'),
      C: R('Amos 6:1–7 | Psalm 146 | 1 Tim. 3:1–13 or 1 Tim. 6:6–19 | Luke 16:19–31'),
    },
    proper22: {
      A: R('Isaiah 5:1–7 | Psalm 80:7–19 | Phil. 3:4b–14 | Matt. 21:33–46'),
      B: R('Gen. 2:18–25 | Psalm 128 | Heb. 2:1–13 (14–18) | Mark 10:2–16'),
      C: R('Hab. 1:1–4; 2:1–4 | Psalm 62 | 2 Tim. 1:1–14 | Luke 17:1–10'),
    },
    proper23: {
      A: R('Isaiah 25:6–9 | Psalm 23 | Phil. 4:4–13 | Matt. 22:1–14'),
      B: R('Amos 5:6–7, 10–15 | Psalm 90:12–17 | Heb. 3:12–19 | Mark 10:17–22'),
      C: R('Ruth 1:1–19a | Psalm 111 | 2 Tim. 2:1–13 | Luke 17:11–19'),
    },
    proper24: {
      A: R('Isaiah 45:1–7 | Psalm 96:1–9 (10–13) | 1 Thess. 1:1–10 | Matt. 22:15–22'),
      B: R('Eccl. 5:10–20 | Psalm 119:9–16 | Heb. 4:1–13 (14–16) | Mark 10:23–31'),
      C: R('Gen. 32:22–30 | Psalm 121 | 2 Tim. 3:14–4:5 | Luke 18:1–8'),
    },
    proper25: {
      A: R('Lev. 19:1–2, 15–18 | Psalm 1 | 1 Thess. 2:1–13 | Matt. 22:34–46'),
      B: R('Jer. 31:7–9 | Psalm 126 | Heb. 7:23–28 | Mark 10:46–52'),
      C: R('Gen. 4:1–15 | Psalm 5 | 2 Tim. 4:6–8, 16–18 | Luke 18:9–17'),
    },
    proper26: {
      A: R('Micah 3:5–12 | Psalm 43 | 1 Thess. 4:1–12 | Matt. 23:1–12'),
      B: { r: R('Deut. 6:1–9 | Psalm 119:1–8 | Heb. 9:11–14 (15–22) | Mark 12:28–37'), verify: true },
      C: R('Isaiah 1:10–18 | Psalm 130 | 2 Thess. 1:1–5 (6–10) 11–12 | Luke 19:1–10'),
    },
    proper27: {
      A: R('Amos 5:18–24 | Psalm 70 | 1 Thess. 4:13–18 | Matt. 25:1–13'),
      B: R('1 Kings 17:8–16 | Psalm 146 | Heb. 9:24–28 | Mark 12:38–44'),
      C: R('Ex. 3:1–15 | Psalm 148 | 2 Thess. 2:1–8, 13–17 | Luke 20:27–40'),
    },
    proper28: {
      A: R('Zeph. 1:7–16 | Psalm 90:1–12 | 1 Thess. 5:1–11 | Matt. 25:14–30'),
      B: R('Dan. 12:1–3 | Psalm 16 | Heb. 10:11–25 | Mark 13:1–13'),
      C: R('Mal. 4:1–6 | Psalm 98 | 2 Thess. 3:(1–5) 6–13 | Luke 21:5–28 (29–36)'),
    },
    lastSunday: {
      A: R('Ezek. 34:11–16, 20–24 | Psalm 95:1–7a | 1 Cor. 15:20–28 | Matt. 25:31–46'),
      B: R('Isaiah 51:4–6 | Psalm 93 | Jude 20–25 | Mark 13:24–37'),
      C: R('Mal. 3:13–18 | Psalm 46 | Col. 1:13–20 | Luke 23:27–43'),
    },
  };

  // Same readings every year
  const FIXED = {
    christmasEve: R('Isaiah 7:10–14 | Psalm 110:1–4 | 1 John 4:7–16 | Matt. 1:18–25'),
    christmasMidnight: R('Isaiah 9:2–7 | Psalm 96 | Titus 2:11–14 | Luke 2:1–14 (15–20)'),
    christmasDawn: R('Isaiah 62:10–12 | Psalm 98 | Titus 3:4–7 | Luke 2:(1–14) 15–20'),
    christmasDay: R('Isaiah 52:7–10 | Psalm 2 | Heb. 1:1–6 (7–12) | John 1:1–14 (15–18)'),
    christmas2: R('1 Kings 3:4–15 | Psalm 119:97–104 | Eph. 1:3–14 | Luke 2:40–52'),
    newYearsEve: R('Isaiah 30:(8–14) 15–17 | Psalm 90:1–12 | Rom. 8:31b–39 | Luke 12:35–40'),
    circumcision: R('Num. 6:22–27 | Psalm 8 | Gal. 3:23–29 | Luke 2:21'),
    epiphany: R('Isaiah 60:1–6 | Psalm 72:1–11 (12–15) | Eph. 3:1–12 | Matt. 2:1–12'),
    goodFriday: R('Isaiah 52:13–53:12 | Psalm 22 or Psalm 31 | Heb. 4:14–16; 5:7–9 | John 18:1–19:42 or John 19:17–30'),
    ascension: R('Acts 1:1–11 | Psalm 47 | Eph. 1:15–23 | Luke 24:44–53'),
    reformation: R('Rev. 14:6–7 | Psalm 46 | Rom. 3:19–28 | Matt. 11:12–19 or John 8:31–36'),
    allSaints: R('Rev. 7:(2–8) 9–17 | Psalm 149 | 1 John 3:1–3 | Matt. 5:1–12'),
    thanksgiving: R('Deut. 8:1–10 | Psalm 67 | Phil. 4:6–20 or 1 Tim. 2:1–4 | Luke 17:11–19'),
    // Feasts and festivals (fixed dates)
    stJohn: R('Rev. 1:1–6 | Psalm 11 | 1 John 1:1–2:2 | John 21:20–25'),
    holyInnocents: R('Jer. 31:15–17 | Psalm 54 | Rev. 14:1–5 | Matt. 2:13–18'),
    confessionPeter: R('Acts 4:8–13 | Psalm 118:19–29 | 2 Peter 1:1–15 | Mark 8:27–35 (36–9:1)'),
    timothy: R('Acts 16:1–5 | Psalm 71:15–24 | 1 Tim. 6:11–16 | Matt. 24:42–47'),
    conversionPaul: R('Acts 9:1–22 | Psalm 67 | Gal. 1:11–24 | Matt. 19:27–30'),
    presentation: R('1 Sam. 1:21–28 | Psalm 84 | Heb. 2:14–18 | Luke 2:22–32 (33–40)'),
    stMark: R('Isaiah 52:7–10 | Psalm 146 | 2 Tim. 4:5–18 | Mark 16:14–20'),
    peterPaul: R('Acts 15:1–12 (13–21) | Psalm 46 | Gal. 2:1–10 | Matt. 16:13–19'),
    jamesElder: R('Acts 11:27–12:5 | Psalm 56 | Rom. 8:28–39 | Mark 10:35–45'),
    stMary: R('Isaiah 61:7–11 | Psalm 45:10–17 | Gal. 4:4–7 | Luke 1:(39–45) 46–55'),
    bartholomew: R('Prov. 3:1–8 | Psalm 121 | 2 Cor. 4:7–10 | Luke 22:24–30 or John 1:43–51'),
    martyrdomJohn: R('Rev. 6:9–11 | Psalm 71:1–8 | Rom. 6:1–5 | Mark 6:14–29'),
    holyCross: R('Num. 21:4–9 | Psalm 40:1–11 | 1 Cor. 1:18–25 | John 12:20–33'),
    stMatthew: R('Ezek. 2:8–3:11 | Psalm 119:33–40 | Eph. 4:7–16 | Matt. 9:9–13'),
    michael: R('Dan. 10:10–14; 12:1–3 | Psalm 91 | Rev. 12:7–12 | Matt. 18:1–11 or Luke 10:17–20'),
    stLuke: R('Isaiah 35:5–8 | Psalm 147:1–11 | 2 Tim. 4:5–18 | Luke 10:1–9'),
    // Psalms for these are in the LSB Altar Book
    andrew: R('Ezek. 3:16–21 | see LSB | Rom. 10:8b–18 | John 1:35–42a'),
    thomas: R('Judges 6:36–40 | see LSB | Eph. 4:7, 11–16 | John 20:24–29'),
    stephen: R('2 Chron. 24:17–22 | see LSB | Acts 6:8–7:2a, 51–60 | Matt. 23:34–39'),
    titus: R('Acts 20:28–35 | see LSB | Titus 1:1–9 | Luke 10:1–9'),
    matthias: R('Isaiah 66:1–2 | see LSB | Acts 1:15–26 | Matt. 11:25–30'),
    joseph: R('2 Sam. 7:4–16 | see LSB | Rom. 4:13–18 | Matt. 2:13–15, 19–23'),
    annunciation: R('Isaiah 7:10–14 | see LSB | Heb. 10:4–10 | Luke 1:26–38'),
    philipJames: R('Isaiah 30:18–21 | see LSB | Eph. 2:19–22 | John 14:1–14'),
    visitation: R('Isaiah 11:1–5 | see LSB | Rom. 12:9–16 | Luke 1:39–45 (46–56)'),
    barnabas: R('Isaiah 42:5–12 | see LSB | Acts 11:19–30; 13:1–3 | Mark 6:7–13'),
    nativityJohn: R('Isaiah 40:1–5 | see LSB | Acts 13:13–26 | Luke 1:57–80'),
    maryMagdalene: R('Prov. 31:10–31 | see LSB | Acts 13:26–31 | John 20:1–2, 10–18'),
    jamesJerusalem: R('Acts 15:12–22a | see LSB | James 1:1–12 | Matt. 13:54–58'),
    simonJude: R('Jer. 26:1–16 | see LSB | 1 Peter 1:3–9 | John 15:(12–16) 17–21'),
  };

  // Fixed-date feasts that can displace or sit alongside a Sunday.
  // [month, day, key, name, color]  (readings null => see LSB)
  const FEASTS = [
    [11, 30, 'andrew', 'St. Andrew, Apostle', 'red'],
    [12, 21, 'thomas', 'St. Thomas, Apostle', 'red'],
    [12, 26, 'stephen', 'St. Stephen, Martyr', 'red'],
    [12, 27, 'stJohn', 'St. John, Apostle and Evangelist', 'white'],
    [12, 28, 'holyInnocents', 'The Holy Innocents, Martyrs', 'red'],
    [1, 18, 'confessionPeter', 'The Confession of St. Peter', 'white'],
    [1, 24, 'timothy', 'St. Timothy, Pastor and Confessor', 'white'],
    [1, 25, 'conversionPaul', 'The Conversion of St. Paul', 'white'],
    [1, 26, 'titus', 'St. Titus, Pastor and Confessor', 'white'],
    [2, 2, 'presentation', 'The Purification of Mary and the Presentation of Our Lord', 'white'],
    [2, 24, 'matthias', 'St. Matthias, Apostle', 'red'],
    [3, 19, 'joseph', 'St. Joseph, Guardian of Jesus', 'white'],
    [3, 25, 'annunciation', 'The Annunciation of Our Lord', 'white'],
    [4, 25, 'stMark', 'St. Mark, Evangelist', 'red'],
    [5, 1, 'philipJames', 'St. Philip and St. James, Apostles', 'red'],
    [5, 31, 'visitation', 'The Visitation', 'white'],
    [6, 11, 'barnabas', 'St. Barnabas, Apostle', 'red'],
    [6, 24, 'nativityJohn', 'The Nativity of St. John the Baptist', 'white'],
    [6, 29, 'peterPaul', 'St. Peter and St. Paul, Apostles', 'red'],
    [7, 22, 'maryMagdalene', 'St. Mary Magdalene', 'white'],
    [7, 25, 'jamesElder', 'St. James the Elder, Apostle', 'red'],
    [8, 15, 'stMary', 'St. Mary, Mother of Our Lord', 'white'],
    [8, 24, 'bartholomew', 'St. Bartholomew, Apostle', 'red'],
    [8, 29, 'martyrdomJohn', 'The Martyrdom of St. John the Baptist', 'red'],
    [9, 14, 'holyCross', 'Holy Cross Day', 'red'],
    [9, 21, 'stMatthew', 'St. Matthew, Apostle and Evangelist', 'red'],
    [9, 29, 'michael', 'St. Michael and All Angels', 'white'],
    [10, 18, 'stLuke', 'St. Luke, Evangelist', 'red'],
    [10, 23, 'jamesJerusalem', 'St. James of Jerusalem, Brother of Our Lord', 'red'],
    [10, 28, 'simonJude', 'St. Simon and St. Jude, Apostles', 'red'],
  ];

  function readings(key, series) {
    if (FIXED[key]) return { r: FIXED[key], verify: false };
    const e = SERIES[key] && SERIES[key][series];
    if (!e) return null;
    return Array.isArray(e) ? { r: e, verify: false } : e;
  }

  root.LECTIONARY = { SERIES, FIXED, FEASTS, readings };
})(typeof window !== 'undefined' ? window : globalThis);
