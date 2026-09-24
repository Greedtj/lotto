// Refresh data/draws.json from myhora.com.
// curl is blocked by Cloudflare, so run this in the browser:
//   1. open https://myhora.com/lottery/  2. DevTools console  3. paste this file
//   -> downloads draws.json, move it to data/draws.json (backtest re-runs on next server start)
(async () => {
  const rows = [], lastYear = new Date().getFullYear() + 543;
  for (let y = 2533; y <= lastYear; y++) {
    let ids = [];
    for (let t = 0; t < 4 && !ids.length; t++) {  // pages sometimes come back empty, retry
      if (t) await new Promise(r => setTimeout(r, 1500));
      const h = await (await fetch(`/lottery/result-${y}.aspx`)).text();
      ids = [...new DOMParser().parseFromString(h, 'text/html').querySelectorAll('.lot-id')];
    }
    for (const e of ids) {
      const m = (e.previousElementSibling?.getAttribute('href') || '').match(/result-(\d\d)-(\d\d)-(\d{4})/);
      if (!m) continue;
      const c = [...e.querySelectorAll('.lot-dr .lot-dc')].map(x => x.textContent.trim());
      const sp = s => s ? s.split(/\s+/).filter(Boolean) : [];
      rows.push({date: `${+m[3] - 543}-${m[2]}-${m[1]}`, first: c[0], front3: sp(c[1]), back3: sp(c[2]), last2: c[3]});
    }
    console.log(y, ids.length);
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([JSON.stringify(rows)], {type: 'application/json'})), download: 'draws.json'});
  a.click();
})();
