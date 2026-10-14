import { sfx } from '../audio.js';

export function showTitle({ onStart, onContinue, hasProgress }) {
  const root = document.getElementById('screens');
  const div = document.createElement('div');
  div.className = 'screen';
  div.innerHTML = `
    <div class="title-logo">
      <div class="pre">YIL 2140 · TÜRKİYE</div>
      <h1>A.N.T.İ. <span>KRİZİ</span></h1>
      <div class="sub">Kimyasal Denge</div>
    </div>
    <div class="stack">
      ${hasProgress ? '<button class="btn" id="t-continue">Devam Et ▶</button>' : ''}
      <button class="btn ${hasProgress ? 'secondary' : ''}" id="t-start">${hasProgress ? 'Yeni Oyun' : 'Başla ▶'}</button>
    </div>
    <div class="title-foot">
      Dr. Elif kayıp, moleküller dağılıyor. Yapay zekâ asistanın A.R.I.A. ile beş reaktörü yeniden başlat.<br>
      <b>Prototip:</b> Prolog + Bölüm 1 (Ordu). 7. ve 8. sınıf Fen Bilimleri kazanımlarına uygundur.
    </div>
  `;
  root.appendChild(div);
  div.querySelector('#t-start').addEventListener('click', () => { sfx.unlock(); sfx.click(); onStart(); });
  div.querySelector('#t-continue')?.addEventListener('click', () => { sfx.unlock(); sfx.click(); onContinue(); });
  return () => div.remove();
}
