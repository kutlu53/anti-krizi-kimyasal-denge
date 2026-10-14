import { runQuiz } from '../ui/quiz.js';
import { dialog } from '../ui/dialog.js';
import { preTest } from '../data/questions.js';
import { state, save } from '../state.js';
import { sfx } from '../audio.js';

const CHAPTERS = [['ordu', 'Ordu'], ['izmir', 'İzmir'], ['konya', 'Konya'], ['zonguldak', 'Zonguldak']];

/** Sertifika görselini canvas'a çizer. */
export function drawCertificate(canvas, { name, pre, post, gain, ending, date }) {
  const W = 1200, H = 850;
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  g.fillStyle = '#fdfaf2'; g.fillRect(0, 0, W, H);
  // çerçeve
  g.strokeStyle = '#1aa3b8'; g.lineWidth = 10; g.strokeRect(30, 30, W - 60, H - 60);
  g.strokeStyle = '#ffb347'; g.lineWidth = 3; g.strokeRect(48, 48, W - 96, H - 96);
  // köşe atomları
  const atom = (x, y) => { g.strokeStyle = '#3ee8ff'; g.lineWidth = 3; [0, 1, 2].forEach((i) => { g.beginPath(); g.ellipse(x, y, 34, 12, (i * Math.PI) / 3, 0, Math.PI * 2); g.stroke(); }); g.fillStyle = '#ff5d6c'; g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); };
  atom(95, 95); atom(W - 95, 95); atom(95, H - 95); atom(W - 95, H - 95);
  g.textAlign = 'center'; g.fillStyle = '#9aa6d1'; g.font = '800 18px Nunito'; g.fillText('A.N.T.İ. KRİZİ: KİMYASAL DENGE · YIL 2140', W / 2, 110);
  g.fillStyle = '#0b1020'; g.font = "800 54px 'Baloo 2', Nunito"; g.fillText('KUANTUM KİMYA SERTİFİKASI', W / 2, 185);
  g.fillStyle = '#555'; g.font = '700 22px Nunito'; g.fillText('Bu belge', W / 2, 250);
  g.fillStyle = '#0b1020'; g.font = "800 48px 'Baloo 2', Nunito"; g.fillText(name || 'Genç Simyacı', W / 2, 310);
  g.strokeStyle = '#ffb347'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 260, 325); g.lineTo(W / 2 + 260, 325); g.stroke();
  g.fillStyle = '#333'; g.font = '700 22px Nunito';
  g.fillText('adlı öğrencinin beş reaktörü yeniden başlatarak Dr. Elif Yılmaz\'ı kurtardığını ve', W / 2, 375);
  g.fillText('MEB 7. ve 8. Sınıf Fen Bilimleri "Madde ve Kimya" kazanımlarını tamamladığını onaylar.', W / 2, 408);
  // puan kutuları
  const box = (x, big, lbl, color) => { g.fillStyle = '#eef2ff'; g.beginPath(); g.roundRect(x - 110, 450, 220, 110, 16); g.fill(); g.fillStyle = color; g.font = "800 44px 'Baloo 2', Nunito"; g.fillText(big, x, 508); g.fillStyle = '#666'; g.font = '800 16px Nunito'; g.fillText(lbl, x, 540); };
  box(W / 2 - 300, `${pre.score} / ${pre.total}`, 'ÖN-TEST', '#9aa6d1');
  box(W / 2, `${post.score} / ${post.total}`, 'SON-TEST', '#1aa3b8');
  box(W / 2 + 300, (gain >= 0 ? '+' : '') + gain + '%', 'KAZANIM ARTIŞI', gain > 0 ? '#2e9e4f' : '#c77f1d');
  if (ending === 'green') { g.fillStyle = '#2e9e4f'; g.font = "800 26px 'Baloo 2', Nunito"; g.fillText('🌿 YEŞİL KİMYA ROZETİ · Sıfır emisyonlu çözüm', W / 2, 615); }
  else { g.fillStyle = '#c77f1d'; g.font = '800 22px Nunito'; g.fillText('Hızlı Yol tercih edildi · Yeşil kimya için ikinci bir şans her zaman var', W / 2, 615); }
  g.fillStyle = '#333'; g.font = '700 18px Nunito';
  g.fillText('Dr. Elif Yılmaz', W / 2 - 300, 740); g.fillText('A.R.I.A.', W / 2 + 300, 740);
  g.font = '600 14px Nunito'; g.fillStyle = '#777'; g.fillText('Baş Araştırmacı', W / 2 - 300, 762); g.fillText('Laboratuvar Yapay Zekâsı', W / 2 + 300, 762);
  g.strokeStyle = '#999'; g.lineWidth = 1; [W / 2 - 300, W / 2 + 300].forEach((x) => { g.beginPath(); g.moveTo(x - 120, 715); g.lineTo(x + 120, 715); g.stroke(); });
  g.fillStyle = '#666'; g.font = '700 16px Nunito'; g.fillText(date, W / 2, 755);
}

export function runEpilog(ctx) {
  const root = document.getElementById('screens');
  const div = document.createElement('div');
  div.className = 'screen';
  root.appendChild(div);
  let alive = true;

  const render = () => {
    const pre = state.preTest || { score: 0, total: preTest.length };
    const post = state.postTest;
    const gain = Math.round(((post.score - pre.score) / pre.total) * 100);
    const date = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    const checks = CHAPTERS.map(([id, name]) => ({ name, c: state.checks[id] }));
    div.innerHTML = `
      <div class="panel" style="width:min(100%,900px)">
        <h2 style="color:var(--gold);font-size:28px">Epilog: Geleceğin Simyacıları</h2>
        <p>Türkiye haritası temizlendi, Dr. Elif güvende. A.R.I.A. hafıza taramasını yeniledi; işte sonuç:</p>
        <div class="epilog-grid">
          <div class="stat"><div class="big" style="color:var(--muted)">${pre.score}/${pre.total}</div><div class="lbl">ÖN-TEST (Prolog)</div></div>
          <div class="stat"><div class="big">${post.score}/${post.total}</div><div class="lbl">SON-TEST (Epilog)</div></div>
          <div class="stat"><div class="big gold">${gain >= 0 ? '+' : ''}${gain}%</div><div class="lbl">KAZANIM ARTIŞI</div></div>
          <div class="stat"><div class="big">${state.cards.length}</div><div class="lbl">MOLEKÜL KARTI</div></div>
        </div>
        <div class="kv" style="margin-top:12px">
          ${checks.map((x) => `<span>${x.name} bölüm kontrolü</span><span>${x.c ? `${x.c.score} / ${x.c.total}` : '—'}</span>`).join('')}
          <span>Final kararı</span><span>${state.ending === 'green' ? '🌿 Yeşil Kimya' : '⚡ Hızlı Yol'}</span>
        </div>
        <div class="name-row" style="margin-top:14px">
          <input id="cert-name" placeholder="Adın Soyadın (sertifika için)" maxlength="40" value="${state.playerName || ''}">
          <button class="btn small" id="cert-make">Sertifikayı Oluştur</button>
        </div>
        <canvas id="cert-canvas" class="hidden"></canvas>
        <div class="row" style="margin-top:12px">
          <a class="btn orange small hidden" id="cert-dl" download="kuantum-kimya-sertifikasi.png">Sertifikayı İndir (PNG)</a>
          <button class="btn secondary small" id="rep-copy">Öğretmen raporunu kopyala</button>
          <button class="btn secondary small" id="ep-map">Haritaya dön</button>
        </div>
      </div>
    `;
    const cv = div.querySelector('#cert-canvas'), dl = div.querySelector('#cert-dl');
    const make = () => {
      const name = div.querySelector('#cert-name').value.trim();
      state.playerName = name; save();
      drawCertificate(cv, { name, pre, post, gain, ending: state.ending, date });
      cv.classList.remove('hidden'); dl.classList.remove('hidden');
      dl.href = cv.toDataURL('image/png'); sfx.card();
    };
    div.querySelector('#cert-make').addEventListener('click', make);
    div.querySelector('#rep-copy').addEventListener('click', async () => {
      const rep = [
        `A.N.T.İ. Krizi raporu · ${state.playerName || 'isimsiz'} · ${date}`,
        `Ön-test: ${pre.score}/${pre.total} · Son-test: ${post.score}/${post.total} · Artış: ${gain}%`,
        ...checks.map((x) => `${x.name}: ${x.c ? `${x.c.score}/${x.c.total}` : '-'}`),
        `Final: ${state.ending === 'green' ? 'Yeşil Kimya' : 'Hızlı Yol'} · Kartlar: ${state.cards.join(', ')}`,
        `Soru bazında son-test: ${Object.entries(post.answers || {}).map(([id, a]) => `${id}=${a}`).join(' ')}`,
      ].join('\n');
      try { await navigator.clipboard.writeText(rep); sfx.collect(); div.querySelector('#rep-copy').textContent = 'Kopyalandı ✓'; } catch (e) { alert(rep); }
    });
    div.querySelector('#ep-map').addEventListener('click', () => { sfx.click(); ctx.go('map'); });
    if (state.playerName) make();
  };

  (async () => {
    if (!state.postTest) {
      try {
        await dialog.say('aria', 'Laboratuvara hoş geldin. Prologdaki 5 soruyu tekrar soruyorum; bu kez cevapların açıklamalı. Hazır mısın?');
        if (!alive) return;
        const res = await runQuiz({ title: 'A.R.I.A. Son Hafıza Taraması', intro: 'Aynı 5 soru. Bakalım ne değişmiş.', questions: preTest, mode: 'check' });
        if (!alive) return;
        state.postTest = res; save();
        await dialog.say('aria', 'Tarama tamam. Sertifikan hazırlanıyor...');
      } catch (e) { return; }
    }
    if (alive) render();
  })();

  return () => { alive = false; div.remove(); };
}
