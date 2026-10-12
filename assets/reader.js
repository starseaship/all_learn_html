(() => {
  'use strict';
  const root = document.currentScript ? new URL('../', document.currentScript.src) : new URL('../', location.href);
  const PREF_KEY = 'zoeReaderPrefs:v1';
  const KINDS = {
    ruby: { label: '假名', hidden: /^(?:no|hide)-ruby$/ },
    zh: { label: '中文', hidden: /^(?:no|hide)-(?:zh|cn)$/ }
  };
  const isHidden = kind => [...document.body.classList].some(name => KINDS[kind].hidden.test(name));
  const kindOf = button => { const text = button.textContent || ''; return text.includes('假名') ? 'ruby' : text.includes('中文') ? 'zh' : null; };
  const readPrefs = () => { try { const value = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; } };
  const writePrefs = prefs => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* 存储不可用时开关仍然可用，只是不记住。 */ } };

  const bar = document.createElement('div');
  bar.className = 'reader-bar'; bar.setAttribute('role', 'navigation'); bar.setAttribute('aria-label', '返回资料库');
  const back = document.createElement('a');
  back.className = 'reader-back'; back.href = root.href;
  const chevron = document.createElement('span'); chevron.setAttribute('aria-hidden', 'true'); chevron.textContent = '‹';
  back.append(chevron, document.createTextNode('资料库'));
  const title = document.createElement('span');
  title.className = 'reader-title'; title.textContent = (document.title || '').replace(/\s+/g, ' ').trim();
  bar.append(back, title);
  document.body.prepend(bar);

  const toolbar = document.querySelector('.toolbar');
  const toggles = toolbar ? [...toolbar.querySelectorAll('button')].map(button => [button, kindOf(button)]).filter(([, kind]) => kind) : [];
  if (!toggles.length) return;

  const dock = document.createElement('div');
  dock.className = 'reader-dock'; dock.setAttribute('role', 'group'); dock.setAttribute('aria-label', '阅读显示设置');
  for (const [button] of toggles) dock.append(button);
  document.body.append(dock);

  const sync = () => {
    for (const [button, kind] of toggles) {
      const hidden = isHidden(kind);
      button.textContent = `${KINDS[kind].label}：${hidden ? '隐藏' : '显示'}`;
      button.setAttribute('aria-pressed', String(!hidden));
    }
  };
  const saved = readPrefs();
  for (const [button, kind] of toggles) if (typeof saved[kind] === 'boolean' && saved[kind] !== isHidden(kind)) button.click();
  sync();
  dock.addEventListener('click', () => setTimeout(() => {
    sync();
    const next = readPrefs();
    for (const [, kind] of toggles) next[kind] = isHidden(kind);
    writePrefs(next);
  }, 0));
  if (!toolbar.querySelector('button')) toolbar.remove();
})();
