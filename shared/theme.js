/* ============================================================
   FreedomAIOS Theme Toggle — theme.js
   RULES:
     - Light theme is the DEFAULT.
     - Theme is stored on <html data-theme="...">.
     - Preference persists in localStorage.
     - This file contains ALL toggle logic. Pages only load it.
   LOAD ORDER: reference with a plain (non-deferred) <script> tag
   in <head> so the saved theme applies before first paint and
   there is no flash of the wrong theme.
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'freedomaios-theme';
  var THEME_LIGHT = 'light';
  var THEME_DARK = 'dark';
  var ICON_SUN = '\u2600\uFE0F';   // ☀️ shown when current theme is light
  var ICON_MOON = '\uD83C\uDF19';  // 🌙 shown when current theme is dark

  /* ---------- 1. Apply saved theme immediately (pre-paint) ---------- */

  function getSavedTheme() {
    try {
      var saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === THEME_DARK || saved === THEME_LIGHT) {
        return saved;
      }
    } catch (err) {
      /* localStorage unavailable (private mode, etc.) — fall through */
    }
    return THEME_LIGHT; // Light is ALWAYS the default
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  var currentTheme = getSavedTheme();
  applyTheme(currentTheme);

  /* ---------- 2. Build and wire the toggle button ---------- */

  function saveTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      /* Persistence failed — toggle still works for this session */
    }
  }

  function updateButton(button, theme) {
    var icon = button.querySelector('.theme-toggle-icon');
    var label = button.querySelector('.theme-toggle-label');

    if (theme === THEME_DARK) {
      icon.textContent = ICON_MOON;
      label.textContent = 'Dark';
      button.setAttribute('aria-label', 'Switch to light theme');
      button.setAttribute('title', 'Switch to light theme');
    } else {
      icon.textContent = ICON_SUN;
      label.textContent = 'Light';
      button.setAttribute('aria-label', 'Switch to dark theme');
      button.setAttribute('title', 'Switch to dark theme');
    }
  }

  function createToggle() {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.id = 'theme-toggle';

    var icon = document.createElement('span');
    icon.className = 'theme-toggle-icon';
    icon.setAttribute('aria-hidden', 'true');

    var label = document.createElement('span');
    label.className = 'theme-toggle-label';

    button.appendChild(icon);
    button.appendChild(label);

    updateButton(button, currentTheme);

    button.addEventListener('click', function () {
      currentTheme = (currentTheme === THEME_DARK) ? THEME_LIGHT : THEME_DARK;
      applyTheme(currentTheme);
      saveTheme(currentTheme);
      updateButton(button, currentTheme);
    });

    document.body.appendChild(button);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createToggle);
  } else {
    createToggle();
  }
})();
