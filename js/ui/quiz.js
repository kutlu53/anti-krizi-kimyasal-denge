import { sfx } from '../audio.js';
import { modal } from './modal.js';

/**
 * Soru listesi çalıştırır.
 * mode 'scan'  : ön-test, cevap doğru/yanlış gösterilmez (A.R.I.A. hafıza taraması).
 * mode 'check' : bölüm kontrolü, cevap sonrası açıklama gösterilir.
 * Dönüş: { score, total, answers:{id: idx} }
 */
export function runQuiz({ title, intro, questions, mode = 'check' }) {
  return new Promise((resolve) => {
    const card = modal.open();
    const answers = {};
    let score = 0;
    let i = 0;

    const render = () => {
      const q = questions[i];
      card.innerHTML = `
        <h2>${title}</h2>
        ${intro ? `<div class="hint">${intro}</div>` : ''}
        <div class="quiz-progress">${questions.map((_, k) => `<i class="${k < i ? 'done' : ''}"></i>`).join('')}</div>
        <div class="quiz-q">${i + 1}. ${q.q}</div>
        <div class="quiz-opts">${q.opts.map((o, k) => `<button data-k="${k}">${o}</button>`).join('')}</div>
        <div class="status hidden" id="quiz-status"><div class="mini">🤖</div><span></span></div>
        <div class="modal-foot"><span class="hint">${mode === 'scan' ? 'Tarama kaydı: cevaplar sonradan karşılaştırılır.' : 'Doğru cevap yeşil, seninki mavi çerçeveli.'}</span><button class="btn small hidden" id="quiz-next">Devam →</button></div>
      `;
      const btns = [...card.querySelectorAll('.quiz-opts button')];
      const status = card.querySelector('#quiz-status');
      const next = card.querySelector('#quiz-next');
      btns.forEach((b) => b.addEventListener('click', () => {
        const k = +b.dataset.k;
        answers[q.id] = k;
        const ok = k === q.a;
        if (ok) score += 1;
        btns.forEach((x) => (x.disabled = true));
        b.classList.add('picked');
        if (mode === 'check') {
          btns[q.a].classList.add('correct');
          if (!ok) b.classList.add('wrong');
          status.classList.remove('hidden');
          status.classList.add(ok ? 'ok' : 'bad');
          status.querySelector('span').textContent = (ok ? 'Doğru! ' : 'Hmm. ') + q.why;
          ok ? sfx.collect() : sfx.fail();
        } else {
          status.classList.remove('hidden');
          status.querySelector('span').textContent = 'Kaydedildi.';
          sfx.click();
        }
        next.classList.remove('hidden');
      }));
      next.addEventListener('click', () => {
        i += 1;
        if (i < questions.length) render();
        else finish();
      });
    };

    const finish = () => {
      const total = questions.length;
      card.innerHTML = `
        <h2>${title}</h2>
        <div class="result-big">${mode === 'scan' ? 'Tarama tamam' : `${score} / ${total}`}</div>
        <div class="hint" style="text-align:center">${mode === 'scan'
          ? 'A.R.I.A. hafıza haritanı çıkardı. Macera bitince yeniden tarayacak ve ne kadar öğrendiğini göstereceğiz.'
          : (score === total ? 'Mükemmel! Bu bölümün kimyası sende.' : 'Fena değil. Müzede kartları incelemek pekiştirir.')}</div>
        <div class="modal-foot" style="justify-content:center"><button class="btn" id="quiz-done">Tamam</button></div>
      `;
      if (mode === 'check') sfx.success();
      card.querySelector('#quiz-done').addEventListener('click', () => {
        modal.close();
        resolve({ score, total, answers });
      });
    };

    render();
  });
}
