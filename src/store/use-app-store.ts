import { create } from 'zustand';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../context/auth-context';

interface AppState {
  stats: { total: number; glp1: number; lipedema: number; weightManagement: number; hormonalBalance: number };
  todayDiet: any;
  notifications: any[];
  unreadCount: number;
  pendingAppointments: any[];
  approvedAppointments: any[];
  myAppointments: any[];
  applications: any[];
  cohortsData: any[];
  complianceData: any[];
  weightLossRates: any[];
  predictionData: any;
  correlationData: any;
  dietitians: any[];
  connectionRequests: any[];
  isOnline: boolean;

  setOnlineStatus: (status: boolean) => void;
  loadStats: (token: string) => Promise<void>;
  loadNotifications: (token: string) => Promise<void>;
  loadAppointments: (token: string, isDietitian: boolean) => Promise<void>;
  loadApplications: (token: string) => Promise<void>;
  loadConnectionRequests: (token: string, isDietitian: boolean) => Promise<void>;
  loadTodayDiet: (token: string) => Promise<void>;
  loadClientAnalytics: (token: string, userId: number) => Promise<void>;
  loadClinicAnalytics: (token: string) => Promise<void>;
  loadDietitiansAndRequests: (token: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  stats: { total: 0, glp1: 0, lipedema: 0, weightManagement: 0, hormonalBalance: 0 },
  todayDiet: null,
  notifications: [],
  unreadCount: 0,
  pendingAppointments: [],
  approvedAppointments: [],
  myAppointments: [],
  applications: [],
  cohortsData: [],
  complianceData: [],
  weightLossRates: [],
  predictionData: null,
  correlationData: null,
  dietitians: [],
  connectionRequests: [],
  isOnline: true,

  setOnlineStatus: (status) => set({ isOnline: status }),

  loadStats: async (token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/clients/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ stats: res.data });
      await SecureStore.setItemAsync('cached_stats', JSON.stringify(res.data));
    } catch (e) {
      const cached = await SecureStore.getItemAsync('cached_stats');
      if (cached) set({ stats: JSON.parse(cached) });
    }
  },

  loadNotifications: async (token) => {
    try {
      const [resNotifs, resCount] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/v1/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/api/v1/notifications/unread/count`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      set({ notifications: resNotifs.data, unreadCount: resCount.data });
      await SecureStore.setItemAsync('cached_notifications', JSON.stringify(resNotifs.data));
      await SecureStore.setItemAsync('cached_unread_count', String(resCount.data));
    } catch (e) {
      const cachedNotifs = await SecureStore.getItemAsync('cached_notifications');
      const cachedCount = await SecureStore.getItemAsync('cached_unread_count');
      set({
        notifications: cachedNotifs ? JSON.parse(cachedNotifs) : [],
        unreadCount: cachedCount ? Number(cachedCount) : 0
      });
    }
  },

  loadAppointments: async (token, isDietitian) => {
    try {
      if (isDietitian) {
        const [resPending, resApproved] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/v1/appointments/dietitian?status=PENDING`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_BASE_URL}/api/v1/appointments/dietitian?status=APPROVED`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        set({ pendingAppointments: resPending.data, approvedAppointments: resApproved.data });
        await SecureStore.setItemAsync('cached_pending_apps', JSON.stringify(resPending.data));
        await SecureStore.setItemAsync('cached_approved_apps', JSON.stringify(resApproved.data));
      } else {
        const resApps = await axios.get(`${API_BASE_URL}/api/v1/appointments/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        set({ myAppointments: resApps.data });
        await SecureStore.setItemAsync('cached_my_appointments', JSON.stringify(resApps.data));
      }
    } catch (e) {
      if (isDietitian) {
        const cachedPending = await SecureStore.getItemAsync('cached_pending_apps');
        const cachedApproved = await SecureStore.getItemAsync('cached_approved_apps');
        set({
          pendingAppointments: cachedPending ? JSON.parse(cachedPending) : [],
          approvedAppointments: cachedApproved ? JSON.parse(cachedApproved) : []
        });
      } else {
        const cachedApps = await SecureStore.getItemAsync('cached_my_appointments');
        if (cachedApps) set({ myAppointments: JSON.parse(cachedApps) });
      }
    }
  },

  loadApplications: async (token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/admin/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ applications: res.data });
      await SecureStore.setItemAsync('cached_applications', JSON.stringify(res.data));
    } catch (e) {
      const cached = await SecureStore.getItemAsync('cached_applications');
      if (cached) set({ applications: JSON.parse(cached) });
    }
  },

  loadConnectionRequests: async (token, isDietitian) => {
    try {
      if (isDietitian) {
        const res = await axios.get(`${API_BASE_URL}/api/v1/connections/pending-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        set({ connectionRequests: res.data });
      } else {
        const res = await axios.get(`${API_BASE_URL}/api/v1/connections/my-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        set({ connectionRequests: res.data });
      }
    } catch (e) {
      console.error('Failed to load connection requests:', e);
    }
  },

  loadTodayDiet: async (token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/diets/my/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (typeof res.data === 'object' && res.data !== null) {
        set({ todayDiet: res.data });
        await SecureStore.setItemAsync('cached_today_diet', JSON.stringify(res.data));
      } else {
        set({ todayDiet: null });
        await SecureStore.deleteItemAsync('cached_today_diet');
      }
    } catch (e) {
      const cached = await SecureStore.getItemAsync('cached_today_diet');
      if (cached) set({ todayDiet: JSON.parse(cached) });
    }
  },

  loadClientAnalytics: async (token, userId) => {
    try {
      const [resPred, resCorr] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/v1/analytics/client/${userId}/prediction`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/api/v1/analytics/client/${userId}/correlation`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      set({ predictionData: resPred.data, correlationData: resCorr.data });
      await SecureStore.setItemAsync('cached_prediction', JSON.stringify(resPred.data));
      await SecureStore.setItemAsync('cached_correlation', JSON.stringify(resCorr.data));
    } catch (e) {
      const cachedPred = await SecureStore.getItemAsync('cached_prediction');
      const cachedCorr = await SecureStore.getItemAsync('cached_correlation');
      set({
        predictionData: cachedPred ? JSON.parse(cachedPred) : null,
        correlationData: cachedCorr ? JSON.parse(cachedCorr) : null
      });
    }
  },

  loadClinicAnalytics: async (token) => {
    try {
      const [resCohorts, resComp, resWeight] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/v1/analytics/dietitian/cohorts`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/api/v1/analytics/dietitian/compliance`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/api/v1/analytics/dietitian/weight-loss`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      set({
        cohortsData: resCohorts.data,
        complianceData: resComp.data,
        weightLossRates: resWeight.data
      });
      await SecureStore.setItemAsync('cached_cohorts', JSON.stringify(resCohorts.data));
      await SecureStore.setItemAsync('cached_compliance', JSON.stringify(resComp.data));
      await SecureStore.setItemAsync('cached_weight_loss', JSON.stringify(resWeight.data));
    } catch (e) {
      const cachedCohorts = await SecureStore.getItemAsync('cached_cohorts');
      const cachedComp = await SecureStore.getItemAsync('cached_compliance');
      const cachedWeight = await SecureStore.getItemAsync('cached_weight_loss');
      set({
        cohortsData: cachedCohorts ? JSON.parse(cachedCohorts) : [],
        complianceData: cachedComp ? JSON.parse(cachedComp) : [],
        weightLossRates: cachedWeight ? JSON.parse(cachedWeight) : []
      });
    }
  },

  loadDietitiansAndRequests: async (token) => {
    try {
      const [resDietitians, resMyReqs] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/v1/connections/dietitians`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/api/v1/connections/my-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      set({ dietitians: resDietitians.data, connectionRequests: resMyReqs.data });
      await SecureStore.setItemAsync('cached_dietitians', JSON.stringify(resDietitians.data));
      await SecureStore.setItemAsync('cached_connection_reqs', JSON.stringify(resMyReqs.data));
    } catch (e) {
      const cachedDietitians = await SecureStore.getItemAsync('cached_dietitians');
      const cachedReqs = await SecureStore.getItemAsync('cached_connection_reqs');
      set({
        dietitians: cachedDietitians ? JSON.parse(cachedDietitians) : [],
        connectionRequests: cachedReqs ? JSON.parse(cachedReqs) : []
      });
    }
  }
}));
