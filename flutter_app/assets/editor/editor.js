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

  editor.addEventListener('input', () => {
    notifyFlutter(false);
    requestToolbarUpdate();
  });
  editor.addEventListener('blur', () => {
    notifyFlutter(true);
  });
  document.addEventListener('selectionchange', requestToolbarUpdate);

  // --- Global APIs for Flutter ---
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

    if (config.bgColor) root.style.setProperty('--bg-color', config.bgColor);
    if (config.textColor) root.style.setProperty('--text-color', config.textColor);
    if (config.primaryColor) {
      root.style.setProperty('--primary-color', config.primaryColor);
      root.style.setProperty('--btn-active-bg', config.primaryColor + '33');
    }
    if (config.fontSize) root.style.setProperty('--font-size', config.fontSize + 'px');
    if (config.lineHeight) root.style.setProperty('--line-height', config.lineHeight);

    if (config.isRtl !== undefined) {
      isRtl = config.isRtl;
      editor.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
      document.body.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
      toolbar.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    }
  };

  window.focusEditor = function () {
    editor.focus();
  };

  window.scrollEditor = function (dy, dx) {
    const container = document.getElementById('editor-container');
    if (container) {
      container.scrollTop += dy;
      if (dx) container.scrollLeft += dx;
    }
  };

  // Native mouse wheel / trackpad scroll handler
  window.addEventListener('wheel', function (e) {
    const container = document.getElementById('editor-container');
    if (container) {
      let dy = e.deltaY;
      let dx = e.deltaX;
      if (e.deltaMode === 1) {
        // Line-based scrolling: ~25px per line
        dy *= 25;
        dx *= 25;
      } else if (Math.abs(dy) >= 100) {
        // Discrete mouse wheel notches (100px - 120px) scaled to ~3 lines (60px)
        dy = Math.sign(dy) * 60;
      }
      container.scrollTop += dy;
      container.scrollLeft += dx;
    }
  }, { passive: true });

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
