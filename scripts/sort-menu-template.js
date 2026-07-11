function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SORT_MENU_ICONS = {
  sort:
    '<svg class="site-sort-menu__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="m8 9 4-4 4 4"/><path d="m8 15 4 4 4-4"/></svg>',
  clock:
    '<svg class="site-sort-menu__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  calendar:
    '<svg class="site-sort-menu__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
  title:
    '<svg class="site-sort-menu__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h6"/></svg>',
  popular:
    '<svg class="site-sort-menu__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 5 5-9"/></svg>',
  chevron:
    '<svg class="site-sort-menu__chevron-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
};

function sortMenuIcon(name) {
  return SORT_MENU_ICONS[name] || SORT_MENU_ICONS.sort;
}

const ARTICLES_SORT_OPTIONS = [
  { value: "newest", label: "Newest", icon: "clock" },
  { value: "oldest", label: "Oldest", icon: "calendar" },
  { value: "title", label: "Title A–Z", icon: "title" },
];

const SERMONS_SORT_OPTIONS = [
  { value: "newest", label: "Latest", icon: "clock" },
  { value: "oldest", label: "Oldest", icon: "calendar" },
  { value: "popular", label: "Popular", icon: "popular" },
  { value: "alphabet", label: "Alphabetically", icon: "title" },
];

function renderSortOption(option, dataAttr, isActive) {
  return `<button type="button" class="site-sort-menu__option${isActive ? " is-active" : ""}" ${dataAttr}="${escapeHtml(option.value)}" role="option" aria-selected="${isActive ? "true" : "false"}">
    <span class="site-sort-menu__option-icon">${sortMenuIcon(option.icon)}</span>
    <span class="site-sort-menu__option-label">${escapeHtml(option.label)}</span>
  </button>`;
}

function renderSiteSortMenu(config) {
  const {
    dataPrefix,
    ariaLabel,
    options,
    defaultValue = options[0] && options[0].value,
    wrapClass = "",
  } = config;

  const valueAttr = `data-${dataPrefix}-sort-value`;
  const toggleAttr = `data-${dataPrefix}-sort-toggle`;
  const menuAttr = `data-${dataPrefix}-sort-menu`;
  const wrapAttr = `data-${dataPrefix}-sort-wrap`;
  const valueLabelAttr = `data-${dataPrefix}-sort-value-label`;
  const defaultOption = options.find((opt) => opt.value === defaultValue) || options[0];
  const optionsHtml = options
    .map((opt) => renderSortOption(opt, valueAttr, opt.value === defaultOption.value))
    .join("");

  return `<div class="site-sort-menu${wrapClass ? " " + wrapClass : ""}" ${wrapAttr}>
    <button type="button" class="site-sort-menu__trigger" ${toggleAttr} aria-haspopup="listbox" aria-expanded="false" aria-label="${escapeHtml(ariaLabel)}">
      <span class="site-sort-menu__trigger-icon">${sortMenuIcon("sort")}</span>
      <span class="site-sort-menu__trigger-text">
        <span class="site-sort-menu__prefix">Sort by</span>
        <span class="site-sort-menu__value" ${valueLabelAttr}>${escapeHtml(defaultOption.label)}</span>
      </span>
      <span class="site-sort-menu__chevron">${sortMenuIcon("chevron")}</span>
    </button>
    <div class="site-sort-menu__menu" ${menuAttr} hidden role="listbox" aria-label="${escapeHtml(ariaLabel)}">
      ${optionsHtml}
    </div>
  </div>`;
}

module.exports = {
  ARTICLES_SORT_OPTIONS,
  SERMONS_SORT_OPTIONS,
  renderSiteSortMenu,
};
