/**
 * TugasIn - Form Controls Design System & Custom Components
 * Premium Dropdown Select (Combobox/Listbox), Mobile Bottom Sheet,
 * Custom Switches, Custom Checkboxes, Tag Multi-Select, and Validation.
 * Complies with Tasks 1-5 in task-form-control.md
 */

(function (window, document) {
  'use strict';

  // Global registry of active CustomSelect instances
  const selectRegistry = new Map();
  let activeOpenSelect = null;
  let scrollListenerAttached = false;

  /**
   * Helper: Escape HTML
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Helper: Check if mobile viewport
   */
  function isMobileViewport() {
    return window.innerWidth <= 640;
  }

  /**
   * Helper: Check prefers-reduced-motion
   */
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // --- COLOR CONFIG FOR STATUS & PRIORITY DOTS ---
  const COLOR_TOKENS = {
    // Statuses
    'st_todo': '#64748B',        // Belum Mulai (Slate)
    'st_prog': '#2563EB',        // Sedang Dikerjakan (Blue)
    'st_rev': '#D97706',         // Butuh Review (Amber)
    'st_done': '#16A34A',        // Selesai (Green)
    'Belum Mulai': '#64748B',
    'Sedang Dikerjakan': '#2563EB',
    'Butuh Review': '#D97706',
    'Selesai': '#16A34A',
    // Priorities
    'Mendesak': '#DC2626',       // Red / Crimson
    'Tinggi': '#EA580C',         // Orange
    'Sedang': '#2C5EF5',         // Blue
    'Rendah': '#64748B',         // Neutral Slate
    // Projects
    'Perencanaan': '#64748B',
    'Sedang Berjalan': '#2563EB',
    'Tahap Uji': '#D97706'
  };

  // --- GLOBAL SINGLETON FOR MOBILE BOTTOM SHEET (TASK 4) ---
  let sharedSheetEl = null;
  let sharedBackdropEl = null;
  let sharedSheetTitleEl = null;
  let sharedSheetContentEl = null;
  let sharedSheetSearchWrap = null;
  let sharedSheetSearchInput = null;

  function initSharedBottomSheet() {
    if (sharedSheetEl) return;

    sharedBackdropEl = document.createElement('div');
    sharedBackdropEl.className = 'custom-select-backdrop';
    sharedBackdropEl.id = 'custom-select-global-backdrop';

    sharedSheetEl = document.createElement('div');
    sharedSheetEl.className = 'custom-select-sheet';
    sharedSheetEl.id = 'custom-select-global-sheet';

    const handleBar = document.createElement('div');
    handleBar.className = 'sheet-handle-bar';
    handleBar.innerHTML = '<div class="sheet-handle-pill"></div>';

    const header = document.createElement('div');
    header.className = 'sheet-header';
    header.innerHTML = `
      <span class="sheet-title" id="custom-select-global-sheet-title">Pilih Opsi</span>
      <button type="button" class="btn btn-ghost btn-icon-sm sheet-close-btn" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>
    `;
    sharedSheetTitleEl = header.querySelector('.sheet-title');

    header.querySelector('.sheet-close-btn').addEventListener('click', () => {
      if (activeOpenSelect) activeOpenSelect.close();
    });
    sharedBackdropEl.addEventListener('click', () => {
      if (activeOpenSelect) activeOpenSelect.close();
    });

    sharedSheetEl.appendChild(handleBar);
    sharedSheetEl.appendChild(header);

    // Search wrap
    sharedSheetSearchWrap = document.createElement('div');
    sharedSheetSearchWrap.className = 'custom-select-search-wrap';
    sharedSheetSearchWrap.innerHTML = `
      <i class="fa-solid fa-magnifying-glass custom-select-search-icon"></i>
      <input type="search" class="custom-select-search-input" placeholder="Cari..." autocomplete="off">
    `;
    sharedSheetSearchInput = sharedSheetSearchWrap.querySelector('input');
    sharedSheetSearchInput.addEventListener('input', (e) => {
      if (activeOpenSelect) {
        activeOpenSelect.searchQuery = e.target.value.toLowerCase().trim();
        activeOpenSelect.filterOptions();
      }
    });
    sharedSheetEl.appendChild(sharedSheetSearchWrap);

    // Content container
    sharedSheetContentEl = document.createElement('div');
    sharedSheetContentEl.className = 'sheet-content-wrap';
    sharedSheetContentEl.style.cssText = 'overflow-y: auto; flex: 1; display: flex; flex-direction: column;';
    sharedSheetEl.appendChild(sharedSheetContentEl);

    // Touch drag down on handle to dismiss
    let touchStartY = 0;
    let currentTranslateY = 0;

    handleBar.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      sharedSheetEl.style.transition = 'none';
    }, { passive: true });

    handleBar.addEventListener('touchmove', (e) => {
      const deltaY = e.touches[0].clientY - touchStartY;
      if (deltaY > 0) {
        currentTranslateY = deltaY;
        sharedSheetEl.style.transform = `translateY(${deltaY}px)`;
      }
    }, { passive: true });

    handleBar.addEventListener('touchend', () => {
      sharedSheetEl.style.transition = '';
      if (currentTranslateY > 80) {
        if (activeOpenSelect) activeOpenSelect.close();
      } else {
        sharedSheetEl.style.transform = '';
      }
      currentTranslateY = 0;
    });

    document.body.appendChild(sharedBackdropEl);
    document.body.appendChild(sharedSheetEl);
  }

  /**
   * CustomSelect Component
   */
  class CustomSelect {
    /**
     * @param {HTMLSelectElement|string} target - Native select or selector
     * @param {Object} options - Configuration options
     */
    constructor(target, options = {}) {
      this.targetEl = typeof target === 'string' ? document.querySelector(target) : target;
      if (!this.targetEl) return;

      // Avoid double-enhancement
      if (selectRegistry.has(this.targetEl)) {
        const existing = selectRegistry.get(this.targetEl);
        existing.updateOptions(options);
        return existing;
      }

      this.id = 'cs-' + Math.random().toString(36).substring(2, 9);
      this.options = Object.assign({
        placeholder: this.targetEl.getAttribute('placeholder') || 'Pilih opsi...',
        size: this.targetEl.getAttribute('data-size') || (this.targetEl.classList.contains('filter-select') ? 'sm' : 'md'),
        searchable: this.targetEl.hasAttribute('data-searchable') || false,
        clearable: this.targetEl.hasAttribute('data-clearable') || false,
        disabled: this.targetEl.disabled || false,
        customClass: this.targetEl.getAttribute('data-custom-class') || '',
        onChange: null
      }, options);

      this.isOpen = false;
      this.highlightedIndex = -1;
      this.searchQuery = '';
      this.items = [];
      this.selectedItem = null;

      // Typeahead buffer
      this.typeaheadBuffer = '';
      this.typeaheadTimeout = null;

      this.init();
      selectRegistry.set(this.targetEl, this);
    }

    init() {
      // Parse initial options from native select
      this.parseOptionsFromTarget();

      // Build DOM elements
      this.buildWrapper();
      this.buildPortalPanel();

      // Hide native select
      this.targetEl.classList.add('custom-select-native-hidden');
      this.targetEl.setAttribute('tabindex', '-1');
      this.targetEl.setAttribute('aria-hidden', 'true');

      // Insert wrapper right after native select
      if (this.targetEl.parentNode) {
        this.targetEl.parentNode.insertBefore(this.wrapper, this.targetEl.nextSibling);
      }

      // Attach event listeners
      this.attachEvents();

      // Mutation observer to watch if native select options or value changes programmatically
      this.observer = new MutationObserver(() => {
        this.syncFromTarget();
      });
      this.observer.observe(this.targetEl, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'value']
      });

      // Global scroll & resize handler
      if (!scrollListenerAttached) {
        window.addEventListener('resize', () => {
          if (activeOpenSelect && activeOpenSelect.isOpen) {
            activeOpenSelect.updatePosition();
          }
        }, { passive: true });

        window.addEventListener('scroll', (e) => {
          if (activeOpenSelect && activeOpenSelect.isOpen) {
            // If scroll occurred outside the dropdown panel or sheet, update position or close
            if (!activeOpenSelect.panel.contains(e.target)) {
              if (isMobileViewport()) {
                // Keep bottom sheet
              } else {
                activeOpenSelect.updatePosition();
              }
            }
          }
        }, { passive: true, capture: true });

        document.addEventListener('pointerdown', (e) => {
          if (activeOpenSelect && activeOpenSelect.isOpen) {
            if (!activeOpenSelect.wrapper.contains(e.target) &&
                !activeOpenSelect.panel.contains(e.target) &&
                !(sharedSheetEl && sharedSheetEl.contains(e.target)) &&
                !(sharedBackdropEl && sharedBackdropEl.contains(e.target))) {
              activeOpenSelect.close();
            }
          }
        });

        scrollListenerAttached = true;
      }
    }

    parseOptionsFromTarget() {
      const options = Array.from(this.targetEl.options || []);
      this.items = options.map((opt, idx) => {
        const val = opt.value;
        const text = opt.text || opt.innerText;
        const dotColor = opt.getAttribute('data-dot') || COLOR_TOKENS[val] || COLOR_TOKENS[text] || null;
        const badge = opt.getAttribute('data-badge') || null;
        const icon = opt.getAttribute('data-icon') || null;

        return {
          index: idx,
          value: val,
          label: text,
          selected: opt.selected,
          disabled: opt.disabled,
          dotColor: dotColor,
          badge: badge,
          icon: icon
        };
      });

      // Detect current selected item
      const currentVal = this.targetEl ? this.targetEl.value : '';
      const sel = (currentVal !== undefined && currentVal !== '')
        ? this.items.find(i => String(i.value) === String(currentVal))
        : (this.items.find(i => i.selected) || this.items[0] || null);
      this.selectedItem = sel;

      // Auto-enable search for long lists (e.g. > 7 items) if not explicitly set to false
      if (this.items.length >= 8 && this.options.searchable === undefined) {
        this.options.searchable = true;
      }
    }

    buildWrapper() {
      this.wrapper = document.createElement('div');
      this.wrapper.className = `custom-select custom-select-${this.options.size} ${this.options.customClass}`;
      this.wrapper.id = `${this.id}-wrapper`;

      // Trigger button (WAI-ARIA combobox)
      this.trigger = document.createElement('button');
      this.trigger.type = 'button';
      this.trigger.className = 'custom-select-trigger';
      this.trigger.id = `${this.id}-trigger`;
      this.trigger.setAttribute('role', 'combobox');
      this.trigger.setAttribute('aria-haspopup', 'listbox');
      this.trigger.setAttribute('aria-expanded', 'false');
      this.trigger.setAttribute('aria-controls', `${this.id}-listbox`);
      if (this.options.disabled) {
        this.trigger.disabled = true;
        this.wrapper.classList.add('is-disabled');
      }

      // Value display
      this.valueContainer = document.createElement('span');
      this.valueContainer.className = 'custom-select-value';

      // Actions / Chevron
      this.actions = document.createElement('div');
      this.actions.className = 'custom-select-actions';

      if (this.options.clearable) {
        this.clearBtn = document.createElement('button');
        this.clearBtn.type = 'button';
        this.clearBtn.className = 'custom-select-clear';
        this.clearBtn.setAttribute('aria-label', 'Hapus pilihan');
        this.clearBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        this.clearBtn.style.display = this.selectedItem && this.selectedItem.value ? 'flex' : 'none';
        this.clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setValue('');
        });
        this.actions.appendChild(this.clearBtn);
      }

      this.chevron = document.createElement('span');
      this.chevron.className = 'custom-select-chevron';
      this.chevron.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
      this.actions.appendChild(this.chevron);

      this.trigger.appendChild(this.valueContainer);
      this.trigger.appendChild(this.actions);
      this.wrapper.appendChild(this.trigger);

      this.renderTriggerValue();
    }

    renderTriggerValue() {
      if (!this.selectedItem || !this.selectedItem.value) {
        const placeholderText = (this.selectedItem && this.selectedItem.label) || this.options.placeholder || 'Pilih opsi...';
        this.valueContainer.innerHTML = `<span class="custom-select-placeholder">${escapeHtml(placeholderText)}</span>`;
        if (this.clearBtn) this.clearBtn.style.display = 'none';
        return;
      }

      let html = '';
      if (this.selectedItem.dotColor) {
        html += `<span class="option-dot" style="background-color: ${this.selectedItem.dotColor};"></span> `;
      }
      if (this.selectedItem.icon) {
        if (this.selectedItem.icon.includes('fa-')) {
          html += `<i class="${this.selectedItem.icon}" style="font-size: 0.9em; opacity: 0.85; margin-right: 6px;"></i> `;
        } else {
          html += `<span style="font-size: 0.85em; opacity: 0.8; margin-right: 6px;">${this.selectedItem.icon}</span> `;
        }
      }

      if (this.selectedItem.badge) {
        html += `<span class="option-badge">${escapeHtml(this.selectedItem.badge)}</span> `;
      }

      html += `<span class="custom-select-option-label">${escapeHtml(this.selectedItem.label || this.options.placeholder)}</span>`;
      this.valueContainer.innerHTML = html;

      if (this.clearBtn) {
        this.clearBtn.style.display = this.selectedItem.value ? 'flex' : 'none';
      }
    }

    buildPortalPanel() {
      // Desktop Floating Panel
      this.panel = document.createElement('div');
      this.panel.className = 'custom-select-panel';
      this.panel.id = `${this.id}-panel`;
      this.panel.setAttribute('role', 'listbox');
      this.panel.setAttribute('aria-labelledby', `${this.id}-trigger`);

      // Search wrap (Combobox mode)
      this.searchWrap = document.createElement('div');
      this.searchWrap.className = 'custom-select-search-wrap';
      this.searchWrap.innerHTML = `
        <i class="fa-solid fa-magnifying-glass custom-select-search-icon"></i>
        <input type="search" class="custom-select-search-input" placeholder="Cari..." autocomplete="off">
      `;
      this.searchInput = this.searchWrap.querySelector('input');

      // Options list container
      this.listEl = document.createElement('ul');
      this.listEl.className = 'custom-select-list';
      this.listEl.id = `${this.id}-listbox`;

      // Append to panel
      if (this.options.searchable) {
        this.panel.appendChild(this.searchWrap);
      }
      this.panel.appendChild(this.listEl);

      // Append desktop panel to document.body
      document.body.appendChild(this.panel);
    }

    renderOptionsList(filteredItems = this.items) {
      this.listEl.innerHTML = '';

      // Skip disabled empty placeholder options from appearing in selectable options list
      const itemsToRender = (filteredItems || []).filter(item => !(item.disabled && item.value === ''));

      if (!itemsToRender || itemsToRender.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'custom-select-empty';
        empty.innerHTML = '<i class="fa-regular fa-folder-open"></i><span>Tidak ada hasil ditemukan</span>';
        this.listEl.appendChild(empty);
        return;
      }

      itemsToRender.forEach((item, idx) => {
        const isSelected = this.selectedItem && String(this.selectedItem.value) === String(item.value);
        const isHighlighted = idx === this.highlightedIndex;

        const li = document.createElement('li');
        li.className = `custom-select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''} ${item.disabled ? 'is-disabled' : ''}`;
        li.setAttribute('role', 'option');
        li.setAttribute('id', `${this.id}-opt-${idx}`);
        li.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        let leftHtml = '';
        if (item.dotColor) {
          leftHtml += `<span class="option-dot" style="background-color: ${item.dotColor};"></span>`;
        }
        if (item.icon) {
          if (item.icon.includes('fa-')) {
            leftHtml += `<i class="${item.icon}" style="font-size: 0.9em; opacity: 0.85; margin-right: 6px;"></i>`;
          } else {
            leftHtml += `<span style="font-size: 0.85em; opacity: 0.85; margin-right: 6px;">${item.icon}</span>`;
          }
        }

        if (item.badge) {
          leftHtml += `<span class="option-badge">${escapeHtml(item.badge)}</span>`;
        }

        leftHtml += `<span class="custom-select-option-label">${escapeHtml(item.label)}</span>`;

        li.innerHTML = `
          <div class="custom-select-option-left">${leftHtml}</div>
          <span class="custom-select-check"><i class="fa-solid fa-check"></i></span>
        `;

        li.addEventListener('click', (e) => {
          e.stopPropagation();
          if (item.disabled) return;
          this.setValue(item.value);
          this.close();
          this.trigger.focus();
        });

        li.addEventListener('mouseenter', () => {
          this.setHighlightedIndex(idx, false);
        });

        this.listEl.appendChild(li);
      });
    }

    attachEvents() {
      // Trigger click
      this.trigger.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.options.disabled) return;
        this.toggle();
      });

      // Trigger Keyboard Accessibility (WAI-ARIA Combobox)
      this.trigger.addEventListener('keydown', (e) => {
        if (this.options.disabled) return;

        switch (e.key) {
          case 'Enter':
          case ' ':
            e.preventDefault();
            if (!this.isOpen) {
              this.open();
            } else if (this.highlightedIndex >= 0) {
              const visibleItems = this.getVisibleItems();
              if (visibleItems[this.highlightedIndex]) {
                this.setValue(visibleItems[this.highlightedIndex].value);
                this.close();
              }
            }
            break;

          case 'ArrowDown':
            e.preventDefault();
            if (!this.isOpen) {
              this.open();
            } else {
              this.moveHighlight(1);
            }
            break;

          case 'ArrowUp':
            e.preventDefault();
            if (!this.isOpen) {
              this.open();
            } else {
              this.moveHighlight(-1);
            }
            break;

          case 'Home':
            if (this.isOpen) {
              e.preventDefault();
              this.setHighlightedIndex(0);
            }
            break;

          case 'End':
            if (this.isOpen) {
              e.preventDefault();
              const visible = this.getVisibleItems();
              this.setHighlightedIndex(visible.length - 1);
            }
            break;

          case 'Escape':
            if (this.isOpen) {
              e.preventDefault();
              this.close();
            }
            break;

          case 'Tab':
            if (this.isOpen) {
              this.close();
            }
            break;

          default:
            // Typeahead jumping
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
              this.handleTypeahead(e.key);
            }
            break;
        }
      });

      // Search input typing
      if (this.searchInput) {
        this.searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.toLowerCase().trim();
          this.filterOptions();
        });

        this.searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.moveHighlight(1);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.moveHighlight(-1);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const visible = this.getVisibleItems();
            if (visible.length > 0) {
              const target = this.highlightedIndex >= 0 ? visible[this.highlightedIndex] : visible[0];
              if (target) {
                this.setValue(target.value);
                this.close();
                this.trigger.focus();
              }
            }
          } else if (e.key === 'Escape') {
            this.close();
            this.trigger.focus();
          }
        });
      }
    }

    getVisibleItems() {
      if (!this.searchQuery) return this.items;
      return this.items.filter(item => {
        const text = (item.label || '').toLowerCase();
        const badge = (item.badge || '').toLowerCase();
        return text.includes(this.searchQuery) || badge.includes(this.searchQuery);
      });
    }

    filterOptions() {
      const visible = this.getVisibleItems();
      this.highlightedIndex = visible.length > 0 ? 0 : -1;
      this.renderOptionsList(visible);
    }

    setHighlightedIndex(idx, scroll = true) {
      const visible = this.getVisibleItems();
      if (idx < 0) idx = 0;
      if (idx >= visible.length) idx = visible.length - 1;
      this.highlightedIndex = idx;

      const options = this.listEl.querySelectorAll('.custom-select-option');
      options.forEach((opt, i) => {
        if (i === idx) {
          opt.classList.add('is-highlighted');
          this.trigger.setAttribute('aria-activedescendant', opt.id);
          if (scroll) {
            opt.scrollIntoView({ block: 'nearest' });
          }
        } else {
          opt.classList.remove('is-highlighted');
        }
      });
    }

    moveHighlight(direction) {
      const visible = this.getVisibleItems();
      if (visible.length === 0) return;
      let next = this.highlightedIndex + direction;
      if (next < 0) next = visible.length - 1;
      if (next >= visible.length) next = 0;
      this.setHighlightedIndex(next, true);
    }

    handleTypeahead(char) {
      clearTimeout(this.typeaheadTimeout);
      this.typeaheadBuffer += char.toLowerCase();
      this.typeaheadTimeout = setTimeout(() => {
        this.typeaheadBuffer = '';
      }, 700);

      const matchIdx = this.items.findIndex(item =>
        (item.label || '').toLowerCase().startsWith(this.typeaheadBuffer)
      );

      if (matchIdx !== -1) {
        this.setValue(this.items[matchIdx].value);
        if (this.isOpen) {
          this.setHighlightedIndex(matchIdx, true);
        }
      }
    }

    open() {
      if (this.isOpen || this.options.disabled) return;

      // Close any other open CustomSelect
      if (activeOpenSelect && activeOpenSelect !== this) {
        activeOpenSelect.close(true); // immediate
      }

      this.isOpen = true;
      activeOpenSelect = this;
      this.wrapper.classList.add('is-open');
      this.trigger.setAttribute('aria-expanded', 'true');

      // Reset search
      this.searchQuery = '';
      if (this.searchInput) {
        this.searchInput.value = '';
      }

      // Initial Highlight on current selected item
      const selIdx = this.items.findIndex(i => this.selectedItem && String(i.value) === String(this.selectedItem.value));
      this.highlightedIndex = selIdx >= 0 ? selIdx : 0;

      this.renderOptionsList(this.items);

      if (isMobileViewport()) {
        // MOBILE BOTTOM SHEET
        this.openBottomSheet();
      } else {
        // DESKTOP FLOATING PORTAL PANEL
        this.openFloatingPanel();
      }
    }

    openBottomSheet() {
      initSharedBottomSheet();

      // Configure title
      const labelEl = this.wrapper.closest('.form-group')
        ? this.wrapper.closest('.form-group').querySelector('.form-label')
        : null;
      if (sharedSheetTitleEl) {
        sharedSheetTitleEl.textContent = (labelEl ? labelEl.textContent.trim() : '') || this.options.placeholder || 'Pilih Opsi';
      }

      // Show/hide search
      if (sharedSheetSearchWrap) {
        sharedSheetSearchWrap.style.display = this.options.searchable ? 'flex' : 'none';
        if (sharedSheetSearchInput) {
          sharedSheetSearchInput.value = this.searchQuery || '';
        }
      }

      // Move listEl into sheet body
      if (sharedSheetContentEl) {
        sharedSheetContentEl.innerHTML = '';
        sharedSheetContentEl.appendChild(this.listEl);
      }

      // Lock body scroll
      document.body.style.overflow = 'hidden';

      if (sharedBackdropEl) sharedBackdropEl.classList.add('is-open');
      if (sharedSheetEl) {
        sharedSheetEl.classList.remove('is-closing');
        sharedSheetEl.classList.add('is-open');
      }

      if (this.options.searchable && sharedSheetSearchInput) {
        setTimeout(() => sharedSheetSearchInput.focus(), 150);
      }

      this.scrollToSelected();
    }

    openFloatingPanel() {
      // Ensure search and list are inside panel
      if (this.options.searchable && this.searchWrap) {
        this.panel.insertBefore(this.searchWrap, this.panel.firstChild);
      }
      this.panel.appendChild(this.listEl);

      this.updatePosition();

      this.panel.classList.remove('is-closing');
      this.panel.classList.add('is-open');

      if (this.options.searchable && this.searchInput) {
        setTimeout(() => this.searchInput.focus(), 100);
      }

      this.scrollToSelected();
    }

    updatePosition() {
      if (!this.isOpen || isMobileViewport()) return;

      const triggerRect = this.trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const panelHeight = Math.min(290, this.panel.offsetHeight || 250);

      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      let placement = 'bottom';
      let top = triggerRect.bottom + 4;

      // Auto-placement: flip to top if space below is too tight and above has more space
      if (spaceBelow < panelHeight && spaceAbove > spaceBelow) {
        placement = 'top';
        top = triggerRect.top - panelHeight - 4;
      }

      let left = triggerRect.left;
      let width = Math.max(triggerRect.width, 170);

      // Prevent offscreen horizontally
      if (left + width > viewportWidth - 12) {
        left = viewportWidth - width - 12;
      }
      if (left < 12) left = 12;

      this.panel.classList.toggle('placement-top', placement === 'top');
      this.panel.style.top = `${Math.round(top)}px`;
      this.panel.style.left = `${Math.round(left)}px`;
      this.panel.style.width = `${Math.round(width)}px`;
    }

    scrollToSelected() {
      setTimeout(() => {
        const selectedEl = this.listEl.querySelector('.custom-select-option.is-selected');
        if (selectedEl) {
          selectedEl.scrollIntoView({ block: 'nearest' });
        }
      }, 50);
    }

    close(immediate = false) {
      if (!this.isOpen) return;

      this.isOpen = false;
      if (activeOpenSelect === this) {
        activeOpenSelect = null;
      }

      this.wrapper.classList.remove('is-open');
      this.trigger.setAttribute('aria-expanded', 'false');

      // Unlock body scroll
      document.body.style.overflow = '';

      // Always restore listEl back to desktop panel if it was moved to mobile sheet
      if (this.listEl && this.panel && !this.panel.contains(this.listEl)) {
        this.panel.appendChild(this.listEl);
      }

      if (immediate || prefersReducedMotion()) {
        this.panel.classList.remove('is-open', 'is-closing');
        if (sharedSheetEl) sharedSheetEl.classList.remove('is-open', 'is-closing');
        if (sharedBackdropEl) sharedBackdropEl.classList.remove('is-open');
      } else {
        // Desktop panel animation
        this.panel.classList.add('is-closing');
        this.panel.classList.remove('is-open');

        // Mobile sheet animation
        if (sharedSheetEl && sharedSheetEl.classList.contains('is-open')) {
          sharedSheetEl.classList.add('is-closing');
          sharedSheetEl.classList.remove('is-open');
          if (sharedBackdropEl) sharedBackdropEl.classList.remove('is-open');

          setTimeout(() => {
            if (sharedSheetEl) sharedSheetEl.classList.remove('is-closing');
          }, 140);
        }

        setTimeout(() => {
          this.panel.classList.remove('is-closing');
        }, 140);
      }
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    setValue(value, triggerEvents = true) {
      const match = this.items.find(i => String(i.value) === String(value));
      this.selectedItem = match || (this.items[0] || null);

      // Update Native Select
      if (this.targetEl) {
        const prevVal = this.targetEl.value;
        this.targetEl.value = this.selectedItem ? this.selectedItem.value : '';

        // Only trigger event if value actually changed and requested
        if (triggerEvents && prevVal !== this.targetEl.value) {
          const changeEvent = new Event('change', { bubbles: true });
          const inputEvent = new Event('input', { bubbles: true });
          this.targetEl.dispatchEvent(changeEvent);
          this.targetEl.dispatchEvent(inputEvent);

          if (typeof this.options.onChange === 'function') {
            this.options.onChange(this.selectedItem ? this.selectedItem.value : '', this.selectedItem);
          }
        }
      }

      this.renderTriggerValue();
    }

    syncFromTarget() {
      this.parseOptionsFromTarget();
      this.renderTriggerValue();
      if (this.targetEl.disabled !== this.options.disabled) {
        this.options.disabled = this.targetEl.disabled;
        this.trigger.disabled = this.options.disabled;
        this.wrapper.classList.toggle('is-disabled', this.options.disabled);
      }
    }

    updateOptions(newOptions = {}) {
      Object.assign(this.options, newOptions);
      this.syncFromTarget();
    }

    destroy() {
      if (this.observer) this.observer.disconnect();
      if (this.wrapper && this.wrapper.parentNode) {
        this.wrapper.parentNode.removeChild(this.wrapper);
      }
      if (this.panel && this.panel.parentNode) {
        this.panel.parentNode.removeChild(this.panel);
      }
      this.targetEl.classList.remove('custom-select-native-hidden');
      this.targetEl.removeAttribute('tabindex');
      this.targetEl.removeAttribute('aria-hidden');
      selectRegistry.delete(this.targetEl);
    }

    /**
     * Static helper: Enhance all selects matching selector or in container
     */
    static enhance(selectorOrEl, options = {}) {
      if (typeof selectorOrEl === 'string') {
        const els = document.querySelectorAll(selectorOrEl);
        return Array.from(els).map(el => new CustomSelect(el, options));
      } else if (selectorOrEl instanceof HTMLElement) {
        return new CustomSelect(selectorOrEl, options);
      }
      return null;
    }

    /**
     * Static helper: Get instance for an element
     */
    static getInstance(el) {
      return selectRegistry.get(el) || null;
    }

    /**
     * Static helper: Sync all registered selects
     */
    static syncAll() {
      selectRegistry.forEach(inst => inst.syncFromTarget());
    }
  }

  /**
   * TagInput Component (Task 5.5)
   * Multi-select chips editor with interactive badge chips and add/remove
   */
  class TagInput {
    constructor(targetInput, options = {}) {
      this.targetInput = typeof targetInput === 'string' ? document.querySelector(targetInput) : targetInput;
      if (!this.targetInput) return;

      this.options = Object.assign({
        placeholder: 'Ketik tag lalu tekan Enter...',
        onChange: null
      }, options);

      this.tags = [];
      this.init();
    }

    init() {
      this.parseInitialTags();

      this.container = document.createElement('div');
      this.container.className = 'custom-tag-input-container';

      this.textInput = document.createElement('input');
      this.textInput.type = 'text';
      this.textInput.className = 'tag-text-input';
      this.textInput.placeholder = this.tags.length === 0 ? this.options.placeholder : '';

      // Hide target original input
      this.targetInput.style.display = 'none';

      // Insert container
      if (this.targetInput.parentNode) {
        this.targetInput.parentNode.insertBefore(this.container, this.targetInput.nextSibling);
      }

      this.render();
      this.attachEvents();
    }

    parseInitialTags() {
      const val = this.targetInput.value || '';
      this.tags = val.split(',').map(t => t.trim()).filter(Boolean);
    }

    render() {
      this.container.innerHTML = '';
      this.tags.forEach((tag, idx) => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = `
          <span>${escapeHtml(tag)}</span>
          <button type="button" class="tag-chip-remove" aria-label="Hapus tag ${escapeHtml(tag)}" data-idx="${idx}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        `;
        chip.querySelector('.tag-chip-remove').addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeTag(idx);
        });
        this.container.appendChild(chip);
      });

      this.textInput.placeholder = this.tags.length === 0 ? this.options.placeholder : '';
      this.container.appendChild(this.textInput);
    }

    attachEvents() {
      this.container.addEventListener('click', () => {
        this.textInput.focus();
      });

      this.textInput.addEventListener('focus', () => {
        this.container.classList.add('is-focused');
      });

      this.textInput.addEventListener('blur', () => {
        this.container.classList.remove('is-focused');
        const val = this.textInput.value.trim();
        if (val) {
          this.addTag(val);
          this.textInput.value = '';
        }
      });

      this.textInput.addEventListener('keydown', (e) => {
        const val = this.textInput.value.trim();
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          if (val) {
            this.addTag(val);
            this.textInput.value = '';
          }
        } else if (e.key === 'Backspace' && !this.textInput.value && this.tags.length > 0) {
          this.removeTag(this.tags.length - 1);
        }
      });
    }

    addTag(tag) {
      const clean = tag.replace(/,/g, '').trim();
      if (!clean) return;
      if (!this.tags.includes(clean)) {
        this.tags.push(clean);
        this.sync();
        this.render();
        this.textInput.focus();
      }
    }

    removeTag(idx) {
      if (idx >= 0 && idx < this.tags.length) {
        this.tags.splice(idx, 1);
        this.sync();
        this.render();
        this.textInput.focus();
      }
    }

    setTags(tagsArray) {
      this.tags = Array.isArray(tagsArray) ? [...tagsArray] : [];
      this.sync();
      this.render();
    }

    sync() {
      const str = this.tags.join(', ');
      this.targetInput.value = str;
      const changeEvent = new Event('change', { bubbles: true });
      this.targetInput.dispatchEvent(changeEvent);
      if (typeof this.options.onChange === 'function') {
        this.options.onChange(this.tags);
      }
    }
  }

  /**
   * CustomSwitch Helper (Task 5.3)
   * Wraps checkboxes with clean toggle switch markup
   */
  function enhanceSwitch(checkboxEl, labelText = '') {
    if (!checkboxEl || checkboxEl.hasAttribute('data-enhanced-switch')) return;

    checkboxEl.setAttribute('data-enhanced-switch', 'true');
    const wrapper = document.createElement('label');
    wrapper.className = 'custom-switch';

    const track = document.createElement('span');
    track.className = 'custom-switch-track';
    track.innerHTML = '<span class="custom-switch-thumb"></span>';

    // Insert label text
    const labelSpan = document.createElement('span');
    labelSpan.className = 'custom-switch-label';
    labelSpan.textContent = labelText || checkboxEl.getAttribute('aria-label') || '';

    const parent = checkboxEl.parentNode;
    if (parent) {
      parent.insertBefore(wrapper, checkboxEl);
      wrapper.appendChild(checkboxEl);
      wrapper.appendChild(track);
      if (labelText) {
        wrapper.appendChild(labelSpan);
      }
    }
  }

  /**
   * Form Error Helper (Task 5.6)
   */
  const FormValidator = {
    setError(inputEl, message) {
      if (!inputEl) return;
      inputEl.classList.add('input-error');
      const parent = inputEl.closest('.form-group') || inputEl.parentNode;
      if (!parent) return;

      let err = parent.querySelector('.form-error-msg');
      if (!err) {
        err = document.createElement('div');
        err.className = 'form-error-msg';
        parent.appendChild(err);
      }
      err.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${escapeHtml(message)}</span>`;
    },

    clearError(inputEl) {
      if (!inputEl) return;
      inputEl.classList.remove('input-error');
      const parent = inputEl.closest('.form-group') || inputEl.parentNode;
      if (!parent) return;
      const err = parent.querySelector('.form-error-msg');
      if (err) err.remove();
    }
  };

  // Expose to window
  window.CustomSelect = CustomSelect;
  window.TagInput = TagInput;
  window.enhanceSwitch = enhanceSwitch;
  window.FormValidator = FormValidator;

})(window, document);
