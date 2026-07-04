/**
 * 🏫 Инспектор сайта ОО — полная клиентская логика
 * Версия: 1.2 (улучшенный загрузчик с резервными прокси и увеличенным таймаутом)
 */

// =========================================================================
// 1. КОНФИГУРАЦИЯ
// =========================================================================
const CONFIG = {
  subsections: [
    { id: 1, name: 'Основные сведения', required: true },
    { id: 2, name: 'Структура и органы управления образовательной организацией', required: true },
    { id: 3, name: 'Документы', required: true },
    { id: 4, name: 'Образование', required: true },
    { id: 5, name: 'Руководство. Педагогический (научно-педагогический) состав', required: true },
    { id: 6, name: 'Материально-техническое обеспечение и оснащенность образовательного процесса', required: true },
    { id: 7, name: 'Платные образовательные услуги', required: true },
    { id: 8, name: 'Финансово-хозяйственная деятельность', required: true },
    { id: 9, name: 'Вакантные места для приема (перевода) обучающихся', required: true },
    { id: 10, name: 'Доступная среда', required: true },
    { id: 11, name: 'Международное сотрудничество', required: true },
  ],
  synonyms: {
    'Основные сведения': ['основные сведения', 'общие сведения', 'основная информация'],
    'Структура и органы управления образовательной организацией': [
      'структура', 'органы управления', 'управление организацией', 'структура и органы управления'
    ],
    'Документы': ['документы', 'нормативные документы', 'локальные акты'],
    'Образование': ['образование', 'образовательные программы', 'реализуемые программы'],
    'Руководство. Педагогический (научно-педагогический) состав': [
      'руководство', 'педагогический состав', 'научно-педагогический состав', 'педагогический коллектив'
    ],
    'Материально-техническое обеспечение и оснащенность образовательного процесса': [
      'материально-техническое обеспечение', 'оснащенность', 'материальная база'
    ],
    'Платные образовательные услуги': ['платные услуги', 'платные образовательные услуги'],
    'Финансово-хозяйственная деятельность': ['финансово-хозяйственная деятельность', 'финансы', 'хозяйственная деятельность'],
    'Вакантные места для приема (перевода) обучающихся': ['вакантные места', 'прием обучающихся', 'перевод обучающихся'],
    'Доступная среда': ['доступная среда', 'безбарьерная среда'],
    'Международное сотрудничество': ['международное сотрудничество', 'международная деятельность'],
  },
  sectionKeywords: [
    'сведения об образовательной организации',
    'сведения об оо',
    'об организации',
    'сведения об организации',
  ],
  visionKeywords: [
    'версия для слабовидящих',
    'для слабовидящих',
    'слабовидящие',
    'увеличительное стекло',
    '👁️',
    'eye',
  ],
};

// =========================================================================
// 2. УТИЛИТЫ
// =========================================================================
const Utils = {
  normalize(str) {
    return str.toLowerCase()
      .replace(/[^\w\sа-яё]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },
  containsAny(text, keywords) {
    if (!text) return false;
    const normalized = this.normalize(text);
    return keywords.some(keyword => normalized.includes(this.normalize(keyword)));
  },
  formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },
  shortId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },
  getText(el) {
    return el ? el.textContent.trim() : '';
  },
  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  },
  getDomain(url) {
    try {
      const u = new URL(url);
      return u.hostname;
    } catch (_) {
      return url;
    }
  }
};

// =========================================================================
// 3. ЗАГРУЗЧИК (Fetcher) с расширенными прокси и увеличенным таймаутом
// =========================================================================
const Fetcher = {
  async fetchPage(url) {
    if (!Utils.isValidUrl(url)) {
      throw new Error('Некорректный URL. Убедитесь, что адрес начинается с http:// или https://');
    }

    // Список прокси-сервисов с различными форматами запросов
    const proxies = [
      // corsproxy.io — иногда требует правильного URL
      { base: 'https://corsproxy.io/?', type: 'simple' },
      // allorigins.win (raw) — часто работает
      { base: 'https://api.allorigins.win/raw?url=', type: 'raw' },
      // allorigins.win (get) — возвращает JSON с полем contents
      { base: 'https://api.allorigins.win/get?url=', type: 'json' },
      // corsproxy.io с параметром url
      { base: 'https://corsproxy.io/?url=', type: 'simple' },
      // thingproxy — часто работает, но может быть медленным
      { base: 'https://thingproxy.freeboard.io/fetch/', type: 'simple' },
      // cors-anywhere (может требовать заголовок Origin)
      { base: 'https://cors-anywhere.herokuapp.com/', type: 'simple' },
    ];

    const timeoutMs = 60000; // 60 секунд
    let lastError = null;

    for (const proxy of proxies) {
      try {
        let proxyUrl;
        if (proxy.type === 'raw' || proxy.type === 'json') {
          proxyUrl = proxy.base + encodeURIComponent(url);
        } else {
          // Для простых прокси добавляем URL напрямую (они сами кодируют)
          proxyUrl = proxy.base + url;
        }

        console.log(`Попытка загрузки через прокси: ${proxy.base}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(proxyUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            // Для cors-anywhere может потребоваться заголовок Origin
            'Origin': window.location.origin || 'https://example.com',
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        let html;
        if (proxy.type === 'json') {
          // allorigins.win/get возвращает JSON с полем contents
          const json = await response.json();
          if (json && json.contents) {
            html = json.contents;
          } else {
            throw new Error('Неожиданный ответ от прокси (get)');
          }
        } else {
          html = await response.text();
        }

        // Проверяем, что HTML не слишком короткий (иначе, возможно, ошибка)
        if (html.length < 100) {
          throw new Error('Получен слишком короткий ответ, возможно, прокси вернул ошибку');
        }

        console.log(`Успешно загружено через ${proxy.base}`);
        return html;

      } catch (error) {
        console.warn(`Ошибка через прокси ${proxy.base}:`, error.message);
        lastError = error;
        // Небольшая задержка перед следующим прокси
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    throw new Error(`Не удалось загрузить сайт через доступные прокси. Последняя ошибка: ${lastError ? lastError.message : 'неизвестная'}`);
  }
};

// =========================================================================
// 4. АНАЛИЗАТОР
// =========================================================================
const Analyzer = {
  analyze(html, url) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const sectionInfo = this.findSection(doc);
    const searchRoot = sectionInfo.element || doc.body;
    const subsections = this.findSubsections(searchRoot, doc);
    const vision = this.findVision(doc);

    const requiredSubsections = CONFIG.subsections.filter(s => s.required);
    const foundCount = requiredSubsections.filter(s => subsections.find(r => r.id === s.id && r.found)).length;
    const totalRequired = requiredSubsections.length;

    let overallStatus;
    if (foundCount === totalRequired && sectionInfo.found) {
      overallStatus = 'success';
    } else if (foundCount === 0 || !sectionInfo.found) {
      overallStatus = 'danger';
    } else {
      overallStatus = 'warning';
    }

    const recommendations = this.generateRecommendations(sectionInfo, subsections, vision);

    return {
      url,
      timestamp: new Date().toISOString(),
      sectionFound: sectionInfo.found,
      sectionElement: sectionInfo.element ? 'найден' : null,
      subsections,
      visionFound: vision.found,
      visionElement: vision.element ? 'найден' : null,
      foundCount,
      totalRequired,
      overallStatus,
      recommendations,
      domain: Utils.getDomain(url),
    };
  },

  findSection(doc) {
    const keywords = CONFIG.sectionKeywords;
    const candidates = [];

    doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
      const text = Utils.getText(el);
      if (Utils.containsAny(text, keywords)) {
        candidates.push({ element: el, source: 'heading', text });
      }
    });

    doc.querySelectorAll('a').forEach(el => {
      const text = Utils.getText(el);
      const title = el.getAttribute('title') || '';
      const href = el.getAttribute('href') || '';
      const combined = text + ' ' + title + ' ' + href;
      if (Utils.containsAny(combined, keywords)) {
        candidates.push({ element: el, source: 'link', text });
      }
    });

    doc.querySelectorAll('[title]').forEach(el => {
      const title = el.getAttribute('title') || '';
      if (Utils.containsAny(title, keywords)) {
        candidates.push({ element: el, source: 'title', text: title });
      }
    });

    if (candidates.length > 0) {
      let bestElement = candidates[0].element;
      let parent = bestElement.closest('section, article, div.content, div.main, div.page, body');
      if (parent && parent !== doc.body) {
        return { found: true, element: parent };
      }
      return { found: true, element: bestElement };
    }

    const bodyText = doc.body ? doc.body.textContent : '';
    if (Utils.containsAny(bodyText, keywords)) {
      return { found: true, element: null };
    }

    return { found: false, element: null };
  },

  findSubsections(root, doc) {
    const results = [];
    const subsections = CONFIG.subsections;

    subsections.forEach(sub => {
      const keywords = CONFIG.synonyms[sub.name] || [sub.name];
      const searchTerms = [sub.name, ...keywords];
      let found = false;
      let comment = 'Не найден';
      let element = null;

      const searchInRoot = (rootEl) => {
        if (!rootEl) return false;
        const textNodes = [];
        const walker = document.createTreeWalker(
          rootEl,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode(node) {
              if (node.textContent.trim() === '') return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );
        let node;
        while (node = walker.nextNode()) {
          const parent = node.parentElement;
          if (parent) {
            const text = node.textContent;
            if (Utils.containsAny(text, searchTerms)) {
              textNodes.push({ node, parent });
            }
          }
        }
        return textNodes.length > 0;
      };

      if (root && root !== doc.body) {
        found = searchInRoot(root);
        if (found) {
          comment = 'Найден в разделе';
        }
      }

      if (!found) {
        const foundInDoc = searchInRoot(doc.body);
        if (foundInDoc) {
          found = true;
          comment = 'Найден на странице (вне основного раздела)';
        }
      }

      if (!found) {
        const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (const h of headings) {
          const text = Utils.getText(h);
          if (Utils.containsAny(text, searchTerms)) {
            found = true;
            comment = 'Найден в заголовке';
            break;
          }
        }
      }

      if (!found) {
        const links = doc.querySelectorAll('a');
        for (const a of links) {
          const text = Utils.getText(a);
          const title = a.getAttribute('title') || '';
          const combined = text + ' ' + title;
          if (Utils.containsAny(combined, searchTerms)) {
            found = true;
            comment = 'Найден в ссылке';
            break;
          }
        }
      }

      if (found && comment === 'Не найден') {
        const exactFound = doc.body.textContent.toLowerCase().includes(sub.name.toLowerCase());
        if (!exactFound) {
          comment = 'Найдено частичное совпадение';
        } else {
          comment = 'Найден';
        }
      }

      results.push({
        id: sub.id,
        name: sub.name,
        required: sub.required,
        found: found,
        comment: found ? comment : 'Не найден',
        element: element,
      });
    });

    return results;
  },

  findVision(doc) {
    const keywords = CONFIG.visionKeywords;
    const candidates = [];

    doc.querySelectorAll('a').forEach(el => {
      const text = Utils.getText(el);
      const title = el.getAttribute('title') || '';
      const href = el.getAttribute('href') || '';
      const combined = text + ' ' + title + ' ' + href;
      if (Utils.containsAny(combined, keywords)) {
        candidates.push(el);
      }
    });

    doc.querySelectorAll('button').forEach(el => {
      const text = Utils.getText(el);
      if (Utils.containsAny(text, keywords)) {
        candidates.push(el);
      }
    });

    doc.querySelectorAll('img').forEach(el => {
      const alt = el.getAttribute('alt') || '';
      if (Utils.containsAny(alt, keywords)) {
        candidates.push(el);
      }
    });

    doc.querySelectorAll('[aria-label]').forEach(el => {
      const label = el.getAttribute('aria-label') || '';
      if (Utils.containsAny(label, keywords)) {
        candidates.push(el);
      }
    });

    if (candidates.length > 0) {
      return { found: true, element: candidates[0] };
    }

    const bodyText = doc.body ? doc.body.textContent : '';
    if (Utils.containsAny(bodyText, keywords)) {
      return { found: true, element: null };
    }

    return { found: false, element: null };
  },

  generateRecommendations(sectionInfo, subsections, vision) {
    const recs = [];

    if (!sectionInfo.found) {
      recs.push('Раздел «Сведения об образовательной организации» не найден. Добавьте его на главной странице или в основном меню.');
    } else {
      recs.push('Раздел «Сведения об образовательной организации» найден.');
    }

    const required = subsections.filter(s => s.required);
    const missing = required.filter(s => !s.found);
    if (missing.length > 0) {
      const names = missing.map(s => `«${s.name}»`).join(', ');
      recs.push(`Отсутствуют обязательные подразделы: ${names}. Добавьте их в раздел.`);
    } else {
      recs.push('Все обязательные подразделы присутствуют.');
    }

    const partial = required.filter(s => s.found && s.comment && s.comment.includes('частичное'));
    if (partial.length > 0) {
      const names = partial.map(s => `«${s.name}» (название может отличаться)`).join(', ');
      recs.push(`Проверьте названия подразделов: ${names}. Рекомендуется использовать точные формулировки из Приказа.`);
    }

    if (!vision.found) {
      recs.push('Версия для слабовидящих не найдена. Добавьте ссылку на неё (например, «Версия для слабовидящих» или иконку с увеличительным стеклом).');
    } else {
      recs.push('Версия для слабовидящих присутствует.');
    }

    recs.push('Убедитесь, что раздел доступен с главной страницы и из основного меню, а страницы доступны без регистрации.');

    return [...new Set(recs)];
  }
};

// =========================================================================
// 5. ГЕНЕРАТОР ОТЧЁТА
// =========================================================================
const ReportGenerator = {
  generateReport(result) {
    return {
      url: result.url,
      timestamp: result.timestamp,
      status: result.overallStatus,
      sectionFound: result.sectionFound,
      visionFound: result.visionFound,
      foundCount: result.foundCount,
      totalRequired: result.totalRequired,
      subsections: result.subsections.map(s => ({
        name: s.name,
        found: s.found,
        comment: s.comment,
      })),
      recommendations: result.recommendations,
    };
  },
  toJSON(result) {
    return JSON.stringify(this.generateReport(result), null, 2);
  },
  toText(result) {
    const lines = [];
    lines.push(`Отчёт о проверке сайта: ${result.url}`);
    lines.push(`Дата проверки: ${Utils.formatDate(result.timestamp)}`);
    lines.push(`Общий статус: ${result.overallStatus}`);
    lines.push(`Раздел «Сведения об ОО»: ${result.sectionFound ? '✅ Найден' : '❌ Не найден'}`);
    lines.push(`Версия для слабовидящих: ${result.visionFound ? '✅ Есть' : '❌ Нет'}`);
    lines.push(`Найдено подразделов: ${result.foundCount} из ${result.totalRequired}`);
    lines.push('--- Подразделы ---');
    result.subsections.forEach(s => {
      const status = s.found ? '✅' : '❌';
      lines.push(`  ${status} ${s.name} — ${s.comment}`);
    });
    lines.push('--- Рекомендации ---');
    result.recommendations.forEach((r, i) => {
      lines.push(`  ${i+1}. ${r}`);
    });
    return lines.join('\n');
  }
};

// =========================================================================
// 6. ХРАНИЛИЩЕ (localStorage)
// =========================================================================
const Storage = {
  KEY: 'inspector_history',
  getAll() {
    try {
      const data = localStorage.getItem(this.KEY);
      return data ? JSON.parse(data) : [];
    } catch (_) {
      return [];
    }
  },
  add(result) {
    const history = this.getAll();
    const entry = {
      id: Utils.shortId(),
      url: result.url,
      domain: result.domain || Utils.getDomain(result.url),
      timestamp: result.timestamp,
      status: result.overallStatus,
      foundCount: result.foundCount,
      totalRequired: result.totalRequired,
      fullResult: result,
    };
    history.unshift(entry);
    if (history.length > 100) history.length = 100;
    localStorage.setItem(this.KEY, JSON.stringify(history));
    return entry;
  },
  clear() {
    localStorage.removeItem(this.KEY);
  },
  remove(id) {
    let history = this.getAll();
    history = history.filter(item => item.id !== id);
    localStorage.setItem(this.KEY, JSON.stringify(history));
  },
  getById(id) {
    const history = this.getAll();
    return history.find(item => item.id === id) || null;
  }
};

// =========================================================================
// 7. UI (рендеринг)
// =========================================================================
const UI = {
  elements: {},
  _lastResult: null,

  init() {
    this.elements = {
      urlInput: document.getElementById('siteUrlInput'),
      checkBtn: document.getElementById('checkBtn'),
      spinner: document.getElementById('spinnerContainer'),
      resultsPanel: document.getElementById('resultsPanel'),
      resultDateBadge: document.getElementById('resultDateBadge'),
      summaryStatus: document.getElementById('summaryStatus'),
      summaryFound: document.getElementById('summaryFound'),
      summaryVision: document.getElementById('summaryVision'),
      summaryUrl: document.getElementById('summaryUrl'),
      subsectionsBody: document.getElementById('subsectionsBody'),
      recommendationList: document.getElementById('recommendationList'),
      historyList: document.getElementById('historyList'),
      historyCount: document.getElementById('historyCount'),
      themeToggle: document.getElementById('themeToggle'),
      clearHistoryBtn: document.getElementById('clearHistoryBtn'),
      exportJsonBtn: document.getElementById('exportJsonBtn'),
      exportTxtBtn: document.getElementById('exportTxtBtn'),
      historyFilters: document.getElementById('historyFilters'),
    };
  },

  showSpinner() {
    this.elements.spinner.classList.add('active');
    this.elements.resultsPanel.classList.add('hidden');
  },
  hideSpinner() {
    this.elements.spinner.classList.remove('active');
  },

  renderResults(result) {
    const el = this.elements;
    el.resultsPanel.classList.remove('hidden');

    el.resultDateBadge.textContent = Utils.formatDate(result.timestamp);

    const statusMap = {
      success: { text: '✅ Соответствует', class: 'status-badge--success' },
      warning: { text: '⚠️ Частично соответствует', class: 'status-badge--warning' },
      danger: { text: '❌ Не соответствует', class: 'status-badge--danger' },
    };
    const statusInfo = statusMap[result.overallStatus] || statusMap.danger;
    el.summaryStatus.innerHTML = `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
    el.summaryFound.textContent = `${result.foundCount} / ${result.totalRequired}`;
    el.summaryVision.textContent = result.visionFound ? '✅ Есть' : '❌ Нет';
    el.summaryUrl.textContent = result.domain || result.url;

    const tbody = el.subsectionsBody;
    tbody.innerHTML = '';
    result.subsections.forEach((sub, index) => {
      const tr = document.createElement('tr');
      const statusIcon = sub.found ? '✅' : '❌';
      const comment = sub.comment || (sub.found ? 'Найден' : 'Не найден');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>${sub.name}</strong></td>
        <td><span class="status-icon">${statusIcon}</span></td>
        <td><span class="comment">${comment}</span></td>
      `;
      tbody.appendChild(tr);
    });

    const recList = el.recommendationList;
    recList.innerHTML = '';
    if (result.recommendations && result.recommendations.length > 0) {
      result.recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        recList.appendChild(li);
      });
    } else {
      recList.innerHTML = '<li>Все требования выполнены.</li>';
    }

    this._lastResult = result;
  },

  renderHistory(filter = 'all') {
    const list = this.elements.historyList;
    const countEl = this.elements.historyCount;
    let history = Storage.getAll();

    if (filter !== 'all') {
      history = history.filter(item => item.status === filter);
    }

    countEl.textContent = `${history.length} записей`;

    if (history.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="icon">📭</span>
          <h3>История пуста</h3>
          <p>Проведите первую проверку, и она появится здесь.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = '';
    history.forEach(item => {
      const div = document.createElement('div');
      const statusClass = item.status === 'success' ? 'history-item--success' :
                          item.status === 'danger' ? 'history-item--danger' :
                          'history-item--warning';
      div.className = `history-item ${statusClass}`;
      div.innerHTML = `
        <span class="history-item__url">${item.domain || item.url}</span>
        <span class="history-item__meta">
          <span>${item.foundCount}/${item.totalRequired}</span>
          <span>${item.status === 'success' ? '✅' : item.status === 'warning' ? '⚠️' : '❌'}</span>
          <span>${Utils.formatDate(item.timestamp)}</span>
        </span>
      `;
      div.style.cursor = 'pointer';
      div.addEventListener('click', () => {
        if (item.fullResult) {
          this.renderResults(item.fullResult);
          this.elements.resultsPanel.scrollIntoView({ behavior: 'smooth' });
        } else {
          alert('Детальная информация недоступна для этой записи.');
        }
      });
      list.appendChild(div);
    });

    document.querySelectorAll('.filter-group .btn').forEach(btn => {
      btn.classList.toggle('active-filter', btn.dataset.filter === filter);
    });
  },

  clearResults() {
    this.elements.resultsPanel.classList.add('hidden');
    this._lastResult = null;
  },

  getLastResult() {
    return this._lastResult || null;
  }
};

// =========================================================================
// 8. ПРИЛОЖЕНИЕ
// =========================================================================
const App = {
  init() {
    UI.init();
    this.loadTheme();
    UI.renderHistory('all');
    this.bindEvents();

    const urlParam = new URLSearchParams(window.location.search).get('url');
    if (urlParam && Utils.isValidUrl(urlParam)) {
      UI.elements.urlInput.value = urlParam;
      this.handleCheck();
    }

    console.log('🏫 Инспектор сайта ОО инициализирован');
  },

  bindEvents() {
    const el = UI.elements;

    el.checkBtn.addEventListener('click', () => this.handleCheck());
    el.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleCheck();
      }
    });

    el.themeToggle.addEventListener('click', () => this.toggleTheme());

    el.clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Вы уверены, что хотите очистить всю историю?')) {
        Storage.clear();
        UI.renderHistory('all');
      }
    });

    el.historyFilters.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn || !btn.dataset.filter) return;
      const filter = btn.dataset.filter;
      UI.renderHistory(filter);
    });

    el.exportJsonBtn.addEventListener('click', () => {
      const result = UI.getLastResult();
      if (!result) {
        alert('Нет результатов для экспорта. Сначала выполните проверку.');
        return;
      }
      const json = ReportGenerator.toJSON(result);
      this.downloadFile(json, 'report.json', 'application/json');
    });

    el.exportTxtBtn.addEventListener('click', () => {
      const result = UI.getLastResult();
      if (!result) {
        alert('Нет результатов для экспорта. Сначала выполните проверку.');
        return;
      }
      const text = ReportGenerator.toText(result);
      this.downloadFile(text, 'report.txt', 'text/plain');
    });
  },

  async handleCheck() {
    const urlInput = UI.elements.urlInput;
    const url = urlInput.value.trim();

    if (!url) {
      alert('Пожалуйста, введите URL сайта.');
      return;
    }

    if (!Utils.isValidUrl(url)) {
      alert('Некорректный URL. Убедитесь, что адрес начинается с http:// или https://');
      return;
    }

    UI.showSpinner();

    try {
      const html = await Fetcher.fetchPage(url);
      const result = Analyzer.analyze(html, url);
      Storage.add(result);
      UI.renderResults(result);
      UI.renderHistory('all');
    } catch (error) {
      console.error('Ошибка проверки:', error);
      alert(`Ошибка: ${error.message}`);
      UI.hideSpinner();
    } finally {
      UI.hideSpinner();
    }
  },

  toggleTheme() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-theme');
    localStorage.setItem('inspector_theme', isDark ? 'dark' : 'light');
    const btn = UI.elements.themeToggle;
    btn.textContent = isDark ? '☀️ Светлая' : '🌙 Тёмная';
  },

  loadTheme() {
    const theme = localStorage.getItem('inspector_theme');
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      UI.elements.themeToggle.textContent = '☀️ Светлая';
    } else {
      document.body.classList.remove('dark-theme');
      UI.elements.themeToggle.textContent = '🌙 Тёмная';
    }
  },

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});