(function () {
  const editor = document.getElementById('editor');
  const toolbar = document.getElementById('toolbar');
  let currentText = '';
  let currentHtml = '';
  let isRtl = false;

  function countWords(str) {
    const trimmed = (str || '').trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  let notifyTimer = null;
  function notifyFlutter(immediate = false) {
    if (notifyTimer) {
      clearTimeout(notifyTimer);
      notifyTimer = null;
    }

    const doNotify = () => {
      const text = editor.innerText || '';
      const html = editor.innerHTML || '';
      if (html === currentHtml && text === currentText) return;
      currentHtml = html;
      currentText = text;
      const words = countWords(text);

      const payload = JSON.stringify({
        type: 'content_changed',
        text: text,
        html: html,
        wordCount: words,
      });

      if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage(payload);
      }
      if (window.FlutterBridge) {
        window.FlutterBridge.postMessage(payload);
      }
    };

    if (immediate) {
      doNotify();
    } else {
      notifyTimer = setTimeout(doNotify, 100);
    }
  }

  // --- Toolbar Commands & Active States ---
  let toolbarRaf = null;
  function requestToolbarUpdate() {
    if (toolbarRaf) return;
    toolbarRaf = requestAnimationFrame(() => {
      toolbarRaf = null;
      updateToolbarStates();
    });
  }

  function updateToolbarStates() {
    const buttons = toolbar.querySelectorAll('.toolbar-btn');
    buttons.forEach((btn) => {
      const cmd = btn.getAttribute('data-command');
      const val = btn.getAttribute('data-value');

      try {
        if (cmd === 'formatBlock' && val) {
          const blockVal = document.queryCommandValue('formatBlock');
          if (blockVal && blockVal.toLowerCase() === val.toLowerCase()) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        } else if (cmd && document.queryCommandState) {
          if (document.queryCommandState(cmd)) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        }
      } catch (_) {}
    });
  }

  // Wire up toolbar buttons
  toolbar.addEventListener('mousedown', function (e) {
    // Prevent button click from taking focus away from text editor
    const btn = e.target.closest('.toolbar-btn');
    if (btn) {
      e.preventDefault();
    }
  });

  toolbar.addEventListener('click', function (e) {
    const btn = e.target.closest('.toolbar-btn');
    if (!btn) return;

    const cmd = btn.getAttribute('data-command');
    const val = btn.getAttribute('data-value');

    editor.focus();

    if (cmd === 'formatBlock') {
      const currentBlock = document.queryCommandValue('formatBlock');
      if (currentBlock && currentBlock.toLowerCase() === (val || '').toLowerCase()) {
        document.execCommand('formatBlock', false, '<p>');
      } else {
        document.execCommand('formatBlock', false, val);
      }
    } else if (cmd) {
      document.execCommand(cmd, false, val || null);
    }

    updateToolbarStates();
    notifyFlutter(true);
  });

  let lastMouseX = 0;
  let lastMouseY = 0;
  window.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }, { passive: true });

  editor.addEventListener('input', () => {
    notifyFlutter(false);
    requestToolbarUpdate();
    checkMentionTrigger();
  });
  editor.addEventListener('blur', () => {
    notifyFlutter(true);
    setTimeout(() => {
      if (mentionPopup && mentionPopup.style.display === 'block') {
        const rect = mentionPopup.getBoundingClientRect();
        const isHovered = (
          lastMouseX >= rect.left &&
          lastMouseX <= rect.right &&
          lastMouseY >= rect.top &&
          lastMouseY <= rect.bottom
        );
        if (isHovered) return;
      }
      hideMentionPopup();
    }, 250);
  });
  document.addEventListener('selectionchange', () => {
    requestToolbarUpdate();
  });

  // --- Smart Mentions & Story Bible Engine ---
  const mentionPopup = document.getElementById('mention-popup');
  let cachedEntities = [];
  let currentMentionState = null; // { trigger, query, range, textNode, startIndex, endIndex }
  let selectedMentionIndex = 0;
  let filteredMentionItems = [];

  function getEntityIcon(type) {
    switch (type) {
      case 'character': return '👤';
      case 'scene': return '🎬';
      case 'chapter': return '📖';
      case 'location': return '📍';
      case 'item': return '🗡️';
      case 'faction': return '🛡️';
      case 'lore': return '📜';
      default: return '✨';
    }
  }

  function getEntityCategoryName(type) {
    switch (type) {
      case 'character': return isRtl ? 'شخصية' : 'Character';
      case 'scene': return isRtl ? 'مشهد' : 'Scene';
      case 'chapter': return isRtl ? 'فصل' : 'Chapter';
      case 'location': return isRtl ? 'مكان' : 'Location';
      case 'item': return isRtl ? 'عنصر' : 'Item';
      case 'faction': return isRtl ? 'فصيل' : 'Faction';
      case 'lore': return isRtl ? 'تاريخ / سحر' : 'Lore';
      default: return type;
    }
  }

  function checkMentionTrigger() {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.rangeCount) {
      hideMentionPopup();
      return;
    }

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) {
      hideMentionPopup();
      return;
    }

    const text = node.textContent || '';
    const caretPos = range.startOffset;
    const textBeforeCaret = text.slice(0, caretPos);

    // Look for @ or # trigger with trailing letters/numbers (English & Arabic unicode)
    const match = textBeforeCaret.match(/([@#])([\w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]*)$/);
    if (!match) {
      hideMentionPopup();
      return;
    }

    const trigger = match[1];
    const query = match[2] || '';
    const startIndex = match.index;
    const endIndex = caretPos;

    currentMentionState = {
      trigger: trigger,
      query: query,
      range: range.cloneRange(),
      textNode: node,
      startIndex: startIndex,
      endIndex: endIndex,
    };

    filterAndShowMentionPopup(trigger, query, range);
  }

  function filterAndShowMentionPopup(trigger, query, range) {
    if (!mentionPopup || !cachedEntities || !cachedEntities.length) {
      hideMentionPopup();
      return;
    }

    const q = (query || '').toLowerCase();
    
    // First try: filter by trigger priority
    filteredMentionItems = cachedEntities.filter((item) => {
      if (trigger === '@') {
        // @ prefers characters, but allows scenes/chapters if query matches
        if (item.type !== 'character' && !q) return false;
      } else if (trigger === '#') {
        // # prefers scenes/chapters, but allows characters if query matches
        if (item.type === 'character' && !q) return false;
      }

      return !q || (item.name && item.name.toLowerCase().includes(q)) || (item.summary && item.summary.toLowerCase().includes(q));
    });

    // If preferred type filter yielded 0 items, fallback to searching all cached entities
    if (filteredMentionItems.length === 0) {
      filteredMentionItems = cachedEntities.filter((item) => {
        return !q || (item.name && item.name.toLowerCase().includes(q)) || (item.summary && item.summary.toLowerCase().includes(q));
      });
    }

    if (filteredMentionItems.length === 0) {
      hideMentionPopup();
      return;
    }

    selectedMentionIndex = 0;
    renderMentionPopup();

    // Position popup near the caret
    try {
      let rect = range.getBoundingClientRect();
      if (rect.top === 0 && rect.bottom === 0) {
        const dummy = document.createElement('span');
        dummy.textContent = '\u200b';
        range.insertNode(dummy);
        rect = dummy.getBoundingClientRect();
        dummy.parentNode.removeChild(dummy);
      }

      const popupWidth = 280;
      const popupHeight = Math.min(filteredMentionItems.length * 52 + 16, 250);
      let top = rect.bottom + 6;
      let left;

      if (isRtl) {
        // Align popup right edge with caret right edge in RTL
        left = rect.right - popupWidth;
      } else {
        // Align popup left edge with caret left edge in LTR
        left = rect.left;
      }

      // Check bottom overflow and flip above if necessary
      if (top + popupHeight > window.innerHeight - 10) {
        top = Math.max(10, rect.top - popupHeight - 6);
      }

      // Horizontal clamp: never let popup go out of the left or right screen boundaries
      if (left + popupWidth > window.innerWidth - 12) {
        left = window.innerWidth - popupWidth - 12;
      }
      if (left < 12) {
        left = 12;
      }

      mentionPopup.style.position = 'fixed';
      mentionPopup.style.top = top + 'px';
      mentionPopup.style.left = left + 'px';
      mentionPopup.style.width = popupWidth + 'px';
      mentionPopup.style.display = 'block';
    } catch (_) {
      mentionPopup.style.display = 'none';
    }
  }

  function renderMentionPopup() {
    if (!mentionPopup) return;
    mentionPopup.innerHTML = '';
    filteredMentionItems.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'mention-item' + (idx === selectedMentionIndex ? ' selected' : '');
      div.setAttribute('role', 'option');
      div.setAttribute('data-idx', idx);

      const icon = document.createElement('span');
      icon.className = 'mention-icon';
      icon.textContent = getEntityIcon(item.type);

      const info = document.createElement('div');
      info.className = 'mention-info';

      const name = document.createElement('span');
      name.className = 'mention-name';
      name.textContent = item.name || '';

      const sub = document.createElement('span');
      sub.className = 'mention-subtitle';
      sub.textContent = item.summary || getEntityCategoryName(item.type);

      info.appendChild(name);
      info.appendChild(sub);
      div.appendChild(icon);
      div.appendChild(info);

      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        insertMention(item);
      });

      mentionPopup.appendChild(div);
    });

    const selectedEl = mentionPopup.querySelector('.mention-item.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }

  if (mentionPopup) {
    mentionPopup.addEventListener('mousedown', (e) => {
      // Prevent focus from being stolen from the editor when clicking popup or scrollbar
      e.preventDefault();
    });
    mentionPopup.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
    mentionPopup.addEventListener('wheel', (e) => {
      e.stopPropagation();
      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dy *= 25;
      } else if (Math.abs(dy) >= 100) {
        dy = Math.sign(dy) * 45;
      }
      mentionPopup.scrollTop += dy;
    }, { passive: false });
  }

  document.addEventListener('pointerdown', (e) => {
    if (mentionPopup && mentionPopup.style.display === 'block') {
      if (!mentionPopup.contains(e.target) && e.target !== editor) {
        hideMentionPopup();
      }
    }
  });

  function hideMentionPopup() {
    if (mentionPopup) {
      mentionPopup.style.display = 'none';
    }
    currentMentionState = null;
  }

  function insertMention(item) {
    if (!currentMentionState) return;

    const { textNode, startIndex, endIndex, trigger } = currentMentionState;
    const fullText = textNode.textContent || '';
    const before = fullText.slice(0, startIndex);
    const after = fullText.slice(endIndex);

    // Create mention badge
    const badge = document.createElement('span');
    badge.className = 'crysta-mention';
    badge.setAttribute('contenteditable', 'false');
    badge.setAttribute('data-entity-id', item.id);
    badge.setAttribute('data-entity-type', item.type);
    badge.setAttribute('data-entity-name', item.name);
    badge.textContent = `${trigger}${item.name}`;

    const spaceNode = document.createTextNode('\u00A0'); // Non-breaking space
    const parent = textNode.parentNode;

    if (before) {
      const beforeNode = document.createTextNode(before);
      parent.insertBefore(beforeNode, textNode);
    }
    parent.insertBefore(badge, textNode);
    parent.insertBefore(spaceNode, textNode);

    if (after) {
      const afterNode = document.createTextNode(after);
      parent.insertBefore(afterNode, textNode);
    }
    parent.removeChild(textNode);

    // Position caret after the space node
    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(newRange);

    hideMentionPopup();
    editor.focus();
    notifyFlutter(true);
  }

  // Intercept keyboard navigation for mention popup
  editor.addEventListener('keydown', (e) => {
    if (mentionPopup && mentionPopup.style.display === 'block' && filteredMentionItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedMentionIndex = (selectedMentionIndex + 1) % filteredMentionItems.length;
        renderMentionPopup();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedMentionIndex = (selectedMentionIndex - 1 + filteredMentionItems.length) % filteredMentionItems.length;
        renderMentionPopup();
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredMentionItems[selectedMentionIndex]) {
          insertMention(filteredMentionItems[selectedMentionIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        hideMentionPopup();
        return;
      }
    }
  });

  // Click on .crysta-mention badge triggers Quick Inspector
  editor.addEventListener('click', (e) => {
    const mentionBadge = e.target.closest('.crysta-mention');
    if (mentionBadge) {
      e.preventDefault();
      const entityId = mentionBadge.getAttribute('data-entity-id');
      const entityType = mentionBadge.getAttribute('data-entity-type');
      const entityName = mentionBadge.getAttribute('data-entity-name');

      const payload = JSON.stringify({
        type: 'inspect_entity',
        entityId: entityId ? parseInt(entityId, 10) : null,
        entityType: entityType || 'character',
        entityName: entityName || '',
      });

      if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage(payload);
      }
      if (window.FlutterBridge) {
        window.FlutterBridge.postMessage(payload);
      }
    }
  });

  // --- Global APIs for Flutter ---
  window.setEntities = function (entities) {
    try {
      cachedEntities = typeof entities === 'string' ? JSON.parse(entities) : (entities || []);
    } catch (_) {
      cachedEntities = [];
    }
  };

  window.setContent = function (content) {
    const clean = content || '';
    if (clean === (editor.innerText || '') || clean === editor.innerHTML) return;
    
    // If text contains HTML tags, load as HTML, otherwise set text
    if (clean.includes('<') && clean.includes('>')) {
      editor.innerHTML = clean;
    } else {
      editor.innerText = clean;
    }
    currentHtml = editor.innerHTML || '';
    currentText = editor.innerText || '';
    updateToolbarStates();
  };

  window.getContent = function () {
    return editor.innerText || '';
  };

  window.getHTML = function () {
    return editor.innerHTML || '';
  };

  window.setPlaceholder = function (placeholder) {
    editor.setAttribute('data-placeholder', placeholder || '');
  };

  window.setToolbarVisible = function (visible) {
    if (toolbar) {
      toolbar.style.display = visible ? 'flex' : 'none';
    }
  };

  window.setTheme = function (config) {
    if (!config) return;
    const root = document.documentElement;
    const isDark = config.isDark !== undefined ? config.isDark : true;

    if (config.bgColor) root.style.setProperty('--bg-color', config.bgColor);
    if (config.textColor) root.style.setProperty('--text-color', config.textColor);
    if (config.primaryColor) {
      root.style.setProperty('--primary-color', config.primaryColor);
      root.style.setProperty('--btn-active-bg', config.primaryColor + '33');
    }
    if (config.fontSize) root.style.setProperty('--font-size', config.fontSize + 'px');
    if (config.lineHeight) root.style.setProperty('--line-height', config.lineHeight);

    if (isDark) {
      root.style.setProperty('--popup-bg', '#1c212a');
      root.style.setProperty('--popup-border', 'rgba(255, 255, 255, 0.14)');
      root.style.setProperty('--popup-shadow', '0 12px 32px rgba(0, 0, 0, 0.6)');
      root.style.setProperty('--popup-item-hover', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--popup-item-selected', (config.primaryColor || '#6366f1') + '38');
      root.style.setProperty('--popup-item-text', config.textColor || '#e2e8f0');
      root.style.setProperty('--popup-item-subtext', 'rgba(226, 232, 240, 0.65)');
    } else {
      root.style.setProperty('--popup-bg', '#ffffff');
      root.style.setProperty('--popup-border', 'rgba(0, 0, 0, 0.12)');
      root.style.setProperty('--popup-shadow', '0 12px 30px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.08)');
      root.style.setProperty('--popup-item-hover', 'rgba(0, 0, 0, 0.05)');
      root.style.setProperty('--popup-item-selected', (config.primaryColor || '#6366f1') + '22');
      root.style.setProperty('--popup-item-text', config.textColor || '#0f172a');
      root.style.setProperty('--popup-item-subtext', 'rgba(15, 23, 42, 0.65)');
    }

    if (config.isRtl !== undefined) {
      isRtl = config.isRtl;
      editor.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
      document.body.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
      toolbar.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
      if (mentionPopup) mentionPopup.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    }
  };

  window.focusEditor = function () {
    editor.focus();
  };

  window.scrollEditor = function (dy, dx) {
    // When mention popup is visible, scroll it exclusively
    if (mentionPopup && mentionPopup.style.display === 'block') {
      mentionPopup.scrollTop += dy;
      return;
    }

    const container = document.getElementById('editor-container');
    if (container) {
      container.scrollTop += dy;
      if (dx) container.scrollLeft += dx;
    }
  };


  // Ready signal
  window.addEventListener('DOMContentLoaded', function () {
    const readyPayload = JSON.stringify({ type: 'ready' });
    if (window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage(readyPayload);
    }
    if (window.FlutterBridge) {
      window.FlutterBridge.postMessage(readyPayload);
    }
  });
})();
