// The unc stat sheet. Every value is a pure function of the birth year Y and the current UTC year.
export const nowYear = () => new Date().getUTCFullYear();

const band = (A, rows) => { for (const [max, v] of rows) if (A <= max) return v; return rows[rows.length - 1][1]; };

function clock(minAfterNoon) {
  if (minAfterNoon === 720) return 'Midnight';
  const m = (12 * 60 + minAfterNoon) % 1440, h24 = Math.floor(m / 60), mm = m % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(mm).padStart(2, '0')}${h24 < 12 ? 'am' : 'pm'}`;
}

export function validate(raw, NOW = nowYear()) {
  const s = String(raw ?? '').trim();
  if (!/^\d{4}$/.test(s)) return { ok: false, msg: 'Four digits. The year, not your age.' };
  const Y = +s;
  if (Y > NOW) return { ok: false, msg: "That year hasn't happened. Even for an unc." };
  if (Y < NOW - 100) return { ok: false, msg: 'The sheet stops at 100. Respect, though.' };
  return { ok: true, Y };
}

export function sheet(Y, NOW = nowYear()) {
  const A = NOW - Y;
  const L = Math.max(0, A - 24);
  const level = L >= 1 ? `LVL ${L}` : `LVL 0 · unlocks ${Y + 25}`;
  const bedtime = A < 18 ? 'Whenever they let you' : clock(Math.min(780, Math.max(450, 780 - 20 * (A - 18))));
  const knee = band(A, [[24, 'Clear skies'], [29, 'Light creaking on stairs'], [34, 'Scattered pops'], [44, 'Rain likely. Your left knee called it'], [59, 'Knows the weather two days early'], [100, 'Your knee is the forecast']]);
  const back = band(A, [[24, 'Hasn\'t. Yet'], [29, 'Reaching for the remote'], [34, 'Sneezing'], [44, 'Picking up one sock'], [59, 'Sleeping. Somehow'], [100, 'It never came back']]);
  const fontPx = A <= 29 ? 12 : 14 + Math.floor((A - 30) / 3);
  const font = A <= 29 ? '12px. For now' : `${fontPx}px`;
  const glasses = band(A, [[29, 'None. You squint and call it a vibe'], [37, 'Phone held at arm\'s length'], [44, 'One pair. Lost'], [54, 'On your head. You\'re looking for them'], [100, 'On a chain round your neck']]);
  const platform = band(A, [[17, 'The one your mom isn\'t on. Yet'], [24, 'The one your mom just joined. That\'s the warning'], [29, 'Facebook, but only for birthdays'], [39, 'Facebook Marketplace. "Is this still available?"'], [49, 'Facebook groups. Four. All about your town'], [100, 'Facebook. You type searches into the comments']]);
  const bimd = A >= 16 ? `${Y + 16}` : `${Y + 16}. Hold on`;
  const slang = A >= 19 ? `${Y + 19}` : 'Still updating';
  const sitting = band(A, [[24, 'None'], [29, 'A small exhale'], [39, '"Oof"'], [49, '"Ooooh-kay"'], [100, 'A full sentence']]);
  const verdict = band(A, [
    [17, ['UNC IN TRAINING.', 'Enjoy the knees. Nobody warned us either.']],
    [24, ['UNC IN TRAINING.', 'Your aunt already found you on Facebook. Clock\'s running.']],
    [29, ['PROVISIONAL UNC.', 'You said "back in my day" this year and meant it.']],
    [39, ['UNC.', 'You\'re unc now. Facebook was the warning.']],
    [59, ['SENIOR UNC.', 'You wrote "Happy birthday!!" on a wall this week.']],
    [100, ['UNC EMERITUS.', 'You are the warning.']],
  ]);
  return {
    Y, A, fontPx,
    rows: [
      ['Unc level', level], ['Bedtime', bedtime], ['Knee forecast', knee], ['Back went out', back],
      ['Font size needed', font], ['Reading glasses', glasses], ['Platform you\'re still on', platform],
      ['"Back in my day" means', bimd], ['Slang last updated', slang], ['Sound when sitting down', sitting],
    ],
    level, bedtime, font, platform, verdict,
  };
}

export function shareText(s, site) {
  return `My unc stat sheet (${s.Y}): ${s.level} · bedtime ${s.bedtime} · font size ${s.font} · ${s.platform}. Facebook was the warning. $UNC ${site}`;
}

export function plainText(s) {
  return [`UNC STAT SHEET · ${s.Y}`, ...s.rows.map(([k, v]) => `${k}: ${v}`), `${s.verdict[0]} ${s.verdict[1]}`, `COMPUTED FROM ${s.Y}. NOTHING MEASURED.`].join('\n');
}
