  /* =========================================================================
   * Core application JS - shared across all pages in the SPA shell.
   * Handles: session storage, google.script.run wrapper, routing between
   * pages, toasts, loading overlay, and sidebar/mobile nav behaviour.
   * ========================================================================= */

  const APP = {
    token: null,
    sessionType: null,   // 'client' or 'admin'
    businessName: null,
    username: null
  };

  /* ---------------- google.script.run PROMISE WRAPPER ---------------- */
  function callServer(fnName, ...args) {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((err) => reject(err))
        [fnName](...args);
    });
  }

  /* ---------------- TOAST / LOADING ---------------- */
  function showToast(message, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  function showLoading() { document.getElementById('globalLoading').classList.remove('hidden'); }
  function hideLoading() { document.getElementById('globalLoading').classList.add('hidden'); }

  /* ---------------- SESSION HANDLING ---------------- */
  function saveSession(token, type, businessName, username) {
    APP.token = token;
    APP.sessionType = type;
    APP.businessName = businessName;
    APP.username = username;
    sessionStorage.setItem('oms_token', token);
    sessionStorage.setItem('oms_type', type);
    sessionStorage.setItem('oms_business', businessName || '');
    sessionStorage.setItem('oms_username', username || '');
  }

  function clearSession() {
    APP.token = null; APP.sessionType = null; APP.businessName = null; APP.username = null;
    sessionStorage.clear();
  }

  function restoreSession() {
    APP.token = sessionStorage.getItem('oms_token');
    APP.sessionType = sessionStorage.getItem('oms_type');
    APP.businessName = sessionStorage.getItem('oms_business');
    APP.username = sessionStorage.getItem('oms_username');
    return !!APP.token;
  }

  async function bootstrapApp() {
    if (restoreSession()) {
      try {
        showLoading();
        const res = await callServer('validateSession', APP.token);
        hideLoading();
        if (res.success) {
          enterApp();
          return;
        }
      } catch (e) { hideLoading(); }
      clearSession();
    }
    showLoginScreen();
  }

  function logoutUser() {
    if (APP.token) callServer('logout', APP.token).catch(() => {});
    clearSession();
    showLoginScreen();
  }

  /* ---------------- SCREEN / ROUTING ---------------- */
  function showLoginScreen() {
    document.getElementById('shellApp').classList.add('hidden');
    document.getElementById('page-login').classList.remove('hidden');
  }

  function enterApp() {
    document.getElementById('page-login').classList.add('hidden');
    document.getElementById('shellApp').classList.remove('hidden');

    document.getElementById('sidebarBusinessName').textContent = APP.businessName || APP.username || 'Account';

    // Show correct nav set depending on account type
    const isAdmin = APP.sessionType === 'admin';
    document.querySelectorAll('[data-role="client"]').forEach(el => el.classList.toggle('hidden', isAdmin));
    document.querySelectorAll('[data-role="admin"]').forEach(el => el.classList.toggle('hidden', !isAdmin));

    navigateTo(isAdmin ? 'admindashboard' : 'dashboard');
  }

  function navigateTo(pageKey, params) {
    params = params || {};
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('page-' + pageKey);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.querySelector('.nav-item[data-page="' + pageKey + '"]');
    if (navEl) navEl.classList.add('active');

    closeMobileSidebar();

    // Fire page-specific load function if it exists
    const loaderName = 'load_' + pageKey;
    if (typeof window[loaderName] === 'function') {
      window[loaderName](params);
    }
  }

  function toggleMobileSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
  }
  function closeMobileSidebar() {
    document.querySelector('.sidebar').classList.remove('open');
  }

  /* ---------------- INIT ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    bootstrapApp();

    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.addEventListener('click', () => navigateTo(el.getAttribute('data-page')));
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) menuToggle.addEventListener('click', toggleMobileSidebar);
  });
