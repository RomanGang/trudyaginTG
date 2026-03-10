// Frontend UI module
// Handles all UI-related functions

const UI = {
  // Toast notifications
  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    if (type === 'loading') {
      toast.innerHTML = `<div class="spinner" style="width: 16px; height: 16px; margin-right: 8px;"></div>${message}`;
      toast.style.display = 'flex';
      toast.style.alignItems = 'center';
      toast.style.justifyContent = 'center';
    }

    container.appendChild(toast);

    if (type !== 'loading') {
      setTimeout(() => {
        toast.remove();
      }, 3000);
    }

    return toast;
  },

  showSuccess(message) {
    return this.showToast(message, 'success');
  },

  showError(message) {
    return this.showToast(message, 'error');
  },

  showWarning(message) {
    return this.showToast(message, 'warning');
  },

  showLoading(message) {
    return this.showToast(message, 'loading');
  },

  // Loading states
  showLoadingInElement(element) {
    if (!element) return;
    element.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  },

  // Format helpers
  formatPayment(amount) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  },

  formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  },

  // Time ago
  timeAgo(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    const intervals = [
      { label: 'год', seconds: 31536000 },
      { label: 'мес', seconds: 2592000 },
      { label: 'день', seconds: 86400 },
      { label: 'час', seconds: 3600 },
      { label: 'мин', seconds: 60 }
    ];

    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) {
        return `${count} ${interval.label} назад`;
      }
    }

    return 'только что';
  },

  // Rating stars
  renderStars(rating) {
    const fullStars = Math.floor(rating || 0);
    const hasHalf = (rating || 0) % 1 >= 0.5;
    let html = '';

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        html += '<svg viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
      } else if (i === fullStars + 1 && hasHalf) {
        html += '<svg viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700"><defs><linearGradient id="half"><stop offset="50%" stop-color="#FFD700"/><stop offset="50%" stop-color="#E2E8F0"/></linearGradient></defs><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="url(#half)"></polygon></svg>';
      } else {
        html += '<svg viewBox="0 0 24 24" fill="#E2E8F0" stroke="#E2E8F0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
      }
    }

    return html;
  },

  // Truncate text
  truncate(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  },

  // Generate initials
  getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  },

  // Debounce
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UI;
}
