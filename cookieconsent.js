(function () {
    // Register Service Worker for offline caching and performance
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
    }

    var STORAGE_KEY = 'cookieConsent';
    var consent = null;
    try { consent = localStorage.getItem(STORAGE_KEY); } catch (e) {}

    // Update Google Analytics consent state based on choice.
    function setConsent(granted) {
        if (typeof gtag === 'function') {
            gtag('consent', 'update', {
                analytics_storage: granted ? 'granted' : 'denied',
                ad_storage: granted ? 'granted' : 'denied',
                ad_user_data: granted ? 'granted' : 'denied',
                ad_personalization: granted ? 'granted' : 'denied'
            });
        }
    }

    // Default denial until the user chooses.
    if (typeof gtag === 'function') {
        gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500
        });
    }

    if (consent === 'granted' || consent === 'denied') {
        setConsent(consent === 'granted');
        return;
    }

    // Build and show banner.
    var banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
        '<div class="cookie-text">' +
            'We use cookies for analytics (Google Analytics) and to show personalized ads (Google AdSense). ' +
            'See our <a href="/privacy.html">Privacy Policy</a>.' +
        '</div>' +
        '<div class="cookie-buttons">' +
            '<button type="button" class="cookie-btn cookie-btn-deny">Decline</button>' +
            '<button type="button" class="cookie-btn cookie-btn-accept">Accept</button>' +
        '</div>';

    function close(value) {
        try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
        setConsent(value === 'granted');
        if (banner.parentNode) banner.parentNode.removeChild(banner);
    }

    banner.querySelector('.cookie-btn-accept').addEventListener('click', function () { close('granted'); });
    banner.querySelector('.cookie-btn-deny').addEventListener('click', function () { close('denied'); });

    function insert() {
        if (!document.body) { setTimeout(insert, 50); return; }
        document.body.appendChild(banner);
    }
    insert();
})();
