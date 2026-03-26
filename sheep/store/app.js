import DiyApi from '@/sheep/api/promotion/diy';
import AuthApi from '@/sheep/api/member/auth';
import { getTenantByWebsite } from '@/sheep/api/infra/tenant';
import { getTenantId } from '@/sheep/request';
import { defineStore } from 'pinia';
import $platform from '@/sheep/platform';
import $router from '@/sheep/router';
import user from './user';
import sys from './sys';
import { baseUrl, h5Url } from '@/sheep/config';

const app = defineStore({
  id: 'app',
  state: () => ({
    paramsForTabbar: {},
    info: {
      name: '',
      logo: '',
      version: '',
      copyright: '',
      copytime: '',
      cdnurl: '',
      filesystem: '',
    },
    platform: {
      share: {
        methods: [],
        forwardInfo: {},
        posterInfo: {},
        linkAddress: '',
      },
      bind_mobile: 0,
    },
    template: {
      basic: {},
      home: { style: {}, data: [] },
      user: { style: {}, data: [] },
    },
    shareInfo: {},
    has_wechat_trade_managed: 0,

    // 全局登录 / 启动流程状态
    agreementAccepted: false,
    locationAuthStatus: 'unknown', // unknown | granted | denied
    loginStatus: !!uni.getStorageSync('token'),
    pendingLoginAction: null,
    currentRoute: '',
    currentCity: '',
    loginSessionId: '',
    locationInfo: {
      latitude: null,
      longitude: null,
    },
    preloginLoaded: false,
  }),
  actions: {
    async init(templateId = null) {
      const networkStatus = await $platform.checkNetwork();
      if (!networkStatus) {
        $router.error('NetworkError');
      }

      if (typeof baseUrl === 'undefined') {
        $router.error('EnvError');
      }

      await adaptTenant();
      await adaptTemplate(this.template, templateId);

      this.info = {
        name: '芋道商城',
        logo: 'https://static.iocoder.cn/ruoyi-vue-pro-logo.png',
        version: '2026.01',
        copyright: '全部开源，个人与企业可 100% 免费使用',
        copytime: 'Copyright© 2018-2025',
        cdnurl: 'https://file.sheepjs.com',
        filesystem: 'qcloud',
      };
      this.platform = {
        share: {
          methods: ['forward', 'poster', 'link'],
          linkAddress: h5Url,
          posterInfo: {
            user_bg: '/static/img/shop/config/user-poster-bg.png',
            goods_bg: '/static/img/shop/config/goods-poster-bg.png',
            groupon_bg: '/static/img/shop/config/groupon-poster-bg.png',
          },
          forwardInfo: {
            title: '',
            image: '',
            desc: '',
          },
        },
        bind_mobile: 0,
      };
      this.has_wechat_trade_managed = 0;

      const sysStore = sys();
      sysStore.setTheme();

      const userStore = user();
      if (userStore.isLogin) {
        userStore.loginAfter();
      }

      await this.prepareWechatPrelogin();
      return Promise.resolve(true);
    },

    setParamsForTabbar(params = {}) {
      this.paramsForTabbar = params;
    },
    clearParamsForTabbar() {
      this.paramsForTabbar = {};
    },

    setAgreementAccepted(value = false) {
      this.agreementAccepted = !!value;
    },
    setLoginStatus(status = false) {
      this.loginStatus = !!status;
    },
    setPendingLoginAction(action = null) {
      this.pendingLoginAction = action;
    },
    setCurrentRoute(route = '') {
      this.currentRoute = route || '';
    },
    clearPendingLoginAction() {
      this.pendingLoginAction = null;
    },
    setLoginSessionId(sessionId = '') {
      this.loginSessionId = sessionId || '';
      this.preloginLoaded = !!sessionId;
    },
    setCurrentCity(city = '') {
      this.currentCity = city || '';
    },
    setLocationAuthStatus(status = 'unknown') {
      this.locationAuthStatus = status;
    },

    async acceptAgreement() {
      this.agreementAccepted = true;
      await this.requestLocationAuthorization(false);
      await this.prepareWechatPrelogin(true);
    },

    async prepareWechatPrelogin(force = false) {
      // #ifdef MP-WEIXIN
      if (!force && this.preloginLoaded && this.loginSessionId) {
        return this.loginSessionId;
      }
      try {
        const loginRes = await uni.login();
        if (loginRes.errMsg !== 'login:ok' || !loginRes.code) {
          return '';
        }
        const { code, data } = await AuthApi.wechatPrelogin(loginRes.code);
        if (code === 0) {
          const loginSessionId =
            data?.loginSessionId || data?.sessionId || data?.id || data?.key || '';
          this.setLoginSessionId(loginSessionId);
          return loginSessionId;
        }
      } catch (error) {
        console.log('wechat prelogin failed', error);
      }
      this.preloginLoaded = false;
      return '';
      // #endif

      // #ifndef MP-WEIXIN
      return '';
      // #endif
    },

    async requestLocationAuthorization(showToast = true) {
      // #ifdef MP-WEIXIN
      return new Promise((resolve) => {
        uni.authorize({
          scope: 'scope.userLocation',
          success: async () => {
            this.locationAuthStatus = 'granted';
            try {
              const location = await uni.getLocation({ type: 'gcj02' });
              this.locationInfo = {
                latitude: location.latitude,
                longitude: location.longitude,
              };
              if (!this.currentCity) {
                this.currentCity = uni.getStorageSync('current-city') || '当前城市';
              }
            } catch (error) {
              console.log('getLocation failed', error);
            }
            resolve(true);
          },
          fail: () => {
            this.locationAuthStatus = 'denied';
            if (showToast) {
              uni.showToast({
                title: '未开启定位，将以游客态浏览',
                icon: 'none',
              });
            }
            resolve(false);
          },
        });
      });
      // #endif

      // #ifndef MP-WEIXIN
      this.locationAuthStatus = 'denied';
      return false;
      // #endif
    },

    async resumePendingAction() {
      const action = this.pendingLoginAction;
      this.clearPendingLoginAction();
      if (!action) return;
      if (action.kind === 'navigate' && action.path) {
        $router.go(action.path, action.params || {});
      }
    },
  },
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'app-store',
      },
    ],
  },
});

const adaptTenant = async () => {
  const oldTenantId = getTenantId();
  let newTenantId = null;

  try {
    // #ifdef H5
    if (window?.location) {
      const urlParams = new URLSearchParams(window.location.search);
      newTenantId = urlParams.get('tenantId');

      if (!newTenantId && window.location.host) {
        const { data } = await getTenantByWebsite(window.location.host);
        newTenantId = data?.id;
      }
    }
    // #endif

    // #ifdef MP
    const appId = uni.getAccountInfoSync()?.miniProgram?.appId;
    if (appId) {
      const { data } = await getTenantByWebsite(appId);
      newTenantId = data?.id;
    }
    // #endif

    if (newTenantId && newTenantId != oldTenantId) {
      const userStore = user();
      userStore.setToken();
      uni.setStorageSync('tenant-id', newTenantId);
      console.log('租户 ID 已更新:', `${oldTenantId} -> ${newTenantId}`);
    }
  } catch (error) {
    console.error('adaptTenant 执行失败:', error);
  }
};

const adaptTemplate = async (appTemplate, templateId) => {
  const { data: diyTemplate } = templateId
    ? await DiyApi.getDiyTemplate(templateId)
    : await DiyApi.getUsedDiyTemplate();
  if (!diyTemplate) {
    $router.error('TemplateError');
    return;
  }

  const tabBar = diyTemplate?.property?.tabBar;
  if (tabBar) {
    appTemplate.basic.tabbar = tabBar;
    if (tabBar?.theme) {
      appTemplate.basic.theme = tabBar?.theme;
    }
  }
  appTemplate.home = diyTemplate?.home;
  appTemplate.user = diyTemplate?.user;
};

export default app;
