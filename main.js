/**
 * Технобокс — клиентские скрипты (общие для всех страниц).
 *
 * Каждая возможность — отдельная функция init*, которая сама проверяет,
 * есть ли нужные элементы на странице. Всё обёрнуто в IIFE: глобальных
 * переменных нет. Сайт работает и без JS (см. класс `.js` в <html>).
 */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = matchMedia('(pointer: fine)').matches;

  /* ---------- Шапка: рамка появляется при прокрутке ---------- */
  function initHeader() {
    const header = $('#siteHeader');
    if (!header) return;

    const update = () => header.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- Мобильное меню ---------- */
  function initNav() {
    const burger = $('#burger');
    const nav = $('#siteNav');
    if (!burger || !nav) return;

    const labels = { open: 'Открыть меню', close: 'Закрыть меню' };

    const setOpen = (open, { restoreFocus = false } = {}) => {
      nav.classList.toggle('open', open);
      burger.classList.toggle('active', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? labels.close : labels.open);
      document.body.classList.toggle('no-scroll', open);
      if (!open && restoreFocus) burger.focus();
    };

    const isOpen = () => nav.classList.contains('open');

    burger.addEventListener('click', () => setOpen(!isOpen()));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) setOpen(false, { restoreFocus: true });
    });
    document.addEventListener('click', (e) => {
      if (isOpen() && !nav.contains(e.target) && !burger.contains(e.target)) setOpen(false);
    });

    // Если окно расширили до десктопа при открытом меню — сбрасываем состояние
    matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false);
    });
  }

  /* ---------- Появление блоков при прокрутке ---------- */
  function initReveal() {
    const targets = $$('.reveal, .num-card');
    if (!targets.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });

    targets.forEach((el) => observer.observe(el));
  }

  /* ---------- 3D-наклон фото в hero за курсором ---------- */
  function initHeroTilt() {
    const hero = $('.hero');
    const tilt = $('#heroTilt');
    if (!hero || !tilt || !hasFinePointer || prefersReducedMotion) return;

    let frame = 0;
    hero.addEventListener('mousemove', (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transform =
          `rotateY(${(dx * 10).toFixed(2)}deg) rotateX(${(-dy * 7).toFixed(2)}deg)`;
      });
    });
    hero.addEventListener('mouseleave', () => {
      cancelAnimationFrame(frame);
      tilt.style.transform = '';
    });
  }

  /* ---------- Калькулятор рассрочки ---------- */
  function initCalculator() {
    const price = $('#calcPrice');
    const term = $('#calcTerm');
    if (!price || !term) return;

    const priceOut = $('#calcPriceOut');
    const termOut = $('#calcTermOut');
    const result = $('#calcResult');
    const rub = (n) => `${n.toLocaleString('ru-RU')} ₽`;

    const update = () => {
      const total = Number(price.value);
      const months = Number(term.value);
      priceOut.textContent = rub(total);
      termOut.textContent = `${months} мес`;
      result.textContent = rub(Math.ceil(total / months));
    };

    price.addEventListener('input', update);
    term.addEventListener('input', update);
    update();
  }

  /* ---------- Телефон: маска +7 (XXX) XXX-XX-XX ---------- */
  const PHONE_LENGTH = 11;

  /** Оставляет только цифры и приводит к формату 7XXXXXXXXXX. */
  const normalizePhone = (value) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
    else if (digits.startsWith('9')) digits = `7${digits}`;
    return digits.slice(0, PHONE_LENGTH);
  };

  const formatPhone = (digits) => {
    if (!digits) return '';
    const [, a = '', b = '', c = '', d = ''] =
      digits.match(/^7(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/) ?? [];
    let out = '+7';
    if (a) out += ` (${a}`;
    if (a.length === 3) out += ')';
    if (b) out += ` ${b}`;
    if (c) out += `-${c}`;
    if (d) out += `-${d}`;
    return out;
  };

  function initPhoneMask() {
    const input = $('#phone');
    if (!input) return;

    input.addEventListener('input', (e) => {
      // При удалении не навязываем маску, иначе нельзя стереть скобку/дефис
      if (e.inputType && e.inputType.startsWith('delete')) {
        const digits = normalizePhone(input.value);
        input.value = digits.length > 1 ? formatPhone(digits) : '';
        return;
      }
      input.value = formatPhone(normalizePhone(input.value));
    });
  }

  /* ---------- Уведомление (toast) ---------- */
  const toast = (() => {
    const el = $('#toast');
    let timer = 0;
    return (message) => {
      if (!el) return;
      el.textContent = message;
      el.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('show'), 4500);
    };
  })();

  /* ---------- Форма заявки ---------- */
  const SEND_URL = 'send.php';
  const SEND_TIMEOUT_MS = 12000;

  function initLeadForm() {
    const form = $('#leadForm');
    if (!form) return;

    const submit = $('#submitBtn');
    const submitLabel = submit.textContent;
    const shownAt = Date.now();

    const fields = {
      name: { wrap: $('#f-name'), input: $('#name') },
      phone: { wrap: $('#f-phone'), input: $('#phone') },
      consent: { wrap: $('#f-consent'), input: $('#consent'), error: $('#err-consent') },
    };

    const setInvalid = (key, invalid) => {
      const { wrap, input, error } = fields[key];
      wrap.classList.toggle('invalid', invalid);
      input.setAttribute('aria-invalid', String(invalid));
      if (error) error.hidden = !invalid;
    };

    const validate = () => {
      const values = {
        name: fields.name.input.value.trim(),
        phone: normalizePhone(fields.phone.input.value),
        consent: fields.consent.input.checked,
      };
      const invalid = {
        name: values.name.length < 2,
        phone: values.phone.length !== PHONE_LENGTH,
        consent: !values.consent,
      };
      for (const key of Object.keys(invalid)) setInvalid(key, invalid[key]);

      const firstBad = Object.keys(invalid).find((key) => invalid[key]);
      if (firstBad) fields[firstBad].input.focus();
      return firstBad ? null : values;
    };

    // Ошибка пропадает, как только человек начал исправлять поле
    fields.name.input.addEventListener('input', () => setInvalid('name', false));
    fields.phone.input.addEventListener('input', () => setInvalid('phone', false));
    fields.consent.input.addEventListener('change', () => setInvalid('consent', false));

    const setBusy = (busy) => {
      submit.disabled = busy;
      submit.textContent = busy ? 'Отправляем…' : submitLabel;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const values = validate();
      if (!values) return;

      // Токен Telegram лежит на сервере (send.php + config.php), здесь его нет
      const payload = {
        name: values.name,
        phone: `+${values.phone}`,
        topic: $('#topic')?.value || 'consult',
        comment: $('#comment')?.value.trim() || '',
        consent: true,
        website: $('#website')?.value || '',   // honeypot
        elapsed: Date.now() - shownAt,          // антиспам: время заполнения формы
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
      setBusy(true);

      try {
        const res = await fetch(SEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const body = await res.json().catch(() => ({}));

        if (res.status === 429) {
          toast('Слишком много заявок подряд. Попробуйте через несколько минут.');
          return;
        }
        if (!res.ok || !body.ok) throw new Error(`HTTP ${res.status}`);

        toast('Заявка отправлена. Перезвоним в течение 15 минут.');
        form.reset();
        Object.keys(fields).forEach((key) => setInvalid(key, false));
      } catch {
        toast('Не удалось отправить заявку. Позвоните нам: +7 (978) 963-49-09.');
      } finally {
        clearTimeout(timeout);
        setBusy(false);
      }
    });
  }

  /* ---------- Год в футере ---------- */
  function initYear() {
    const el = $('#year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------- Запуск ---------- */
  [
    initHeader,
    initNav,
    initReveal,
    initHeroTilt,
    initCalculator,
    initPhoneMask,
    initLeadForm,
    initYear,
  ].forEach((init) => {
    try {
      init();
    } catch (error) {
      // Сбой одного блока не должен ломать остальные
      console.error(`[technobox] ${init.name}:`, error);
    }
  });
})();
