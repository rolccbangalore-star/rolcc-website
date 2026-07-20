/**
 * Shared mega-menu markup for ROLCC header.
 * Contained split layout: nav + resources left; visit CTA right (compact on mobile).
 */

const SOCIAL_ICONS = {
  facebook: `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  youtube: `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  instagram: `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
};

function getMegaMenuPanelHtml() {
  return `      <!-- @mega-menu:start -->
      <div id="nav-menu" class="mega-menu" aria-hidden="true" hidden>
        <div class="mega-menu__backdrop" data-mega-close tabindex="-1" aria-hidden="true"></div>
        <div class="mega-menu__frame">
          <div class="mega-menu__shell">
            <button type="button" class="mega-menu__close" data-mega-close aria-label="Close menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            <div class="mega-menu__main">
              <div class="mega-menu__nav-block">
                <ul class="mega-menu__primary" role="list">
                  <li><a href="/" class="mega-menu__primary-link" data-nav="index">Home</a></li>
                  <li><a href="/about" class="mega-menu__primary-link" data-nav="about">About Us</a></li>
                  <li><a href="/services" class="mega-menu__primary-link" data-nav="services">Worship Services</a></li>
                  <li><a href="/giving" class="mega-menu__primary-link" data-nav="giving">Giving</a></li>
                  <li><a href="/contact" class="mega-menu__primary-link" data-nav="contact">Contact Us</a></li>
                </ul>
              </div>

              <div class="mega-menu__columns">
                <div class="mega-menu__col">
                  <p class="mega-menu__col-title">Ministries</p>
                  <ul class="mega-menu__links" role="list">
                    <li><a href="/services" data-nav="services">Worship Services</a></li>
                    <li><a href="/river-kids" data-nav="river-kids">River Kids</a></li>
                    <li><a href="/fellowship" data-nav="fellowship">Cell Fellowship</a></li>
                    <li><a href="/pmd" data-nav="pmd">PMD</a></li>
                    <li><a href="/counselling" data-nav="counselling">Counselling</a></li>
                    <li><a href="/rolf" data-nav="rolf">ROLF</a></li>
                  </ul>
                </div>
                <div class="mega-menu__col">
                  <p class="mega-menu__col-title">Connect</p>
                  <ul class="mega-menu__links" role="list">
                    <li><a href="/events" data-nav="events">Events</a></li>
                    <li><a href="/membership" data-nav="membership">Membership</a></li>
                    <li><a href="/giving" data-nav="giving">Giving</a></li>
                    <li><a href="/contact" data-nav="contact">Contact</a></li>
                  </ul>
                </div>
                <div class="mega-menu__col">
                  <p class="mega-menu__col-title">Resources</p>
                  <ul class="mega-menu__links" role="list">
                    <li><a href="/faq" data-nav="faq">FAQ</a></li>
                    <li><a href="/articles" data-nav="articles">Articles</a></li>
                    <li><a href="/bible-study" data-nav="bible-study">Bible Study</a></li>
                    <li><a href="/gallery" data-nav="gallery">Gallery</a></li>
                    <li><a href="/sermons" data-nav="sermons">Latest Sermon</a></li>
                  </ul>
                </div>
              </div>

              <div class="mega-menu__footer">
                <div class="mega-menu__social">
                  <a href="https://www.facebook.com/rolccindia/" target="_blank" rel="noopener noreferrer" class="mega-menu__social-link" aria-label="Facebook">${SOCIAL_ICONS.facebook}</a>
                  <a href="https://www.youtube.com/@rolccindia" target="_blank" rel="noopener noreferrer" class="mega-menu__social-link" aria-label="YouTube">${SOCIAL_ICONS.youtube}</a>
                  <a href="https://www.instagram.com/rolccindia" target="_blank" rel="noopener noreferrer" class="mega-menu__social-link" aria-label="Instagram">${SOCIAL_ICONS.instagram}</a>
                </div>
              </div>
            </div>

            <aside class="mega-menu__aside" aria-label="Visit invitation">
              <div class="mega-menu__aside-body">
                <h2 class="mega-menu__aside-title">Come worship with us</h2>
                <ul class="mega-menu__schedule" role="list">
                  <li>
                    <span class="mega-menu__schedule-time">8:00 AM</span>
                    <span class="mega-menu__schedule-label">Tamil</span>
                  </li>
                  <li>
                    <span class="mega-menu__schedule-time">10:00 AM</span>
                    <span class="mega-menu__schedule-label">English</span>
                  </li>
                </ul>
                <p class="mega-menu__aside-place">HSR Layout, Bengaluru</p>
                <a href="/contact#location" class="mega-menu__aside-cta">Plan Your Visit</a>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <!-- @mega-menu:end -->`;
}

function getHamburgerButtonHtml() {
  return `<button id="nav-toggle" type="button" class="header-top__hamburger mega-menu__toggle inline-flex items-center justify-center w-10 h-10 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100" aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu">
          <span class="mega-menu__toggle-icon mega-menu__toggle-icon--open" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></span>
          <span class="mega-menu__toggle-icon mega-menu__toggle-icon--close" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span>
        </button>`;
}

module.exports = {
  getMegaMenuPanelHtml,
  getHamburgerButtonHtml,
};
