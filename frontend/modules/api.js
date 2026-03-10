// Frontend API module
// Handles all API calls to the backend

const API_BASE = '/api';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // User endpoints
  async register(userData) {
    return this.request('/register', {
      method: 'POST',
      body: userData
    });
  }

  async login(credentials) {
    return this.request('/login', {
      method: 'POST',
      body: credentials
    });
  }

  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async getUserByPhone(phone) {
    return this.request(`/users/phone/${phone}`);
  }

  async updateUser(id, data) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  // Job endpoints
  async getJobs(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/jobs${params ? '?' + params : ''}`);
  }

  async getJob(id) {
    return this.request(`/jobs/${id}`);
  }

  async createJob(jobData) {
    return this.request('/jobs', {
      method: 'POST',
      body: jobData
    });
  }

  async updateJob(id, data) {
    return this.request(`/jobs/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  async deleteJob(id) {
    return this.request(`/jobs/${id}`, {
      method: 'DELETE'
    });
  }

  async getMyJobs(userId, role) {
    return this.request(`/my-jobs?user_id=${userId}&role=${role}`);
  }

  // Response endpoints
  async respondToJob(jobId, workerId) {
    return this.request('/respond', {
      method: 'POST',
      body: { job_id: jobId, worker_id: workerId }
    });
  }

  async getResponses(jobId) {
    return this.request(`/responses?job_id=${jobId}`);
  }

  // Rating endpoints
  async rateUser(data) {
    return this.request('/rate', {
      method: 'POST',
      body: data
    });
  }

  async getReviews(userId) {
    return this.request(`/reviews/${userId}`);
  }

  // Stats
  async getStats() {
    return this.request('/stats');
  }
}

// Create singleton instance
const api = new ApiClient(API_BASE);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { api, ApiClient };
}
