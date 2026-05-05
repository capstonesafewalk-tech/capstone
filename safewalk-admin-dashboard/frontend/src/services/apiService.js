import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiService = {
  // Crime endpoints
  getCrimes: async () => {
    const response = await axios.get(`${API_BASE_URL}/crimes`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  getAllCrimes: async () => {
    const response = await axios.get(`${API_BASE_URL}/crimes/all`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  getArchivedCrimes: async () => {
    const response = await axios.get(`${API_BASE_URL}/crimes/archived`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  getStatistics: async () => {
    const response = await axios.get(`${API_BASE_URL}/crimes/statistics`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  createCrime: async (crimeData) => {
    const response = await axios.post(`${API_BASE_URL}/crimes`, crimeData, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  updateCrime: async (id, crimeData) => {
    const response = await axios.put(`${API_BASE_URL}/crimes/${id}`, crimeData, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  archiveCrime: async (id) => {
    const response = await axios.patch(`${API_BASE_URL}/crimes/${id}/archive`, {}, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  restoreCrime: async (id) => {
    const response = await axios.patch(`${API_BASE_URL}/crimes/${id}/restore`, {}, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  // Incident endpoints
  getIncidents: async () => {
    const response = await axios.get(`${API_BASE_URL}/incidents`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  getIncidentById: async (id) => {
    const response = await axios.get(`${API_BASE_URL}/incidents/${id}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  updateIncident: async (id, status) => {
    const response = await axios.patch(`${API_BASE_URL}/incidents/${id}`, { status }, {
      headers: getAuthHeader(),
    });
    return response.data;
  },
};
