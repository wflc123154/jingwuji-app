<template>
  <su-popup :show="authType !== ''" round="10" :showClose="true" @close="closeAuthModal">
    <view class="login-wrap">
      <view v-if="authType === 'wechatLogin'" class="wechat-login-box">
        <view class="head-box ss-m-b-40">
          <view class="head-title head-title-animation">微信手机号一键登录</view>
          <view class="head-subtitle">未注册手机号验证后将自动创建账号</view>
        </view>

        <button
          class="ss-reset-button wechat-login-btn"
          open-type="getPhoneNumber"
          @getphonenumber="getPhoneNumber"
        >
          微信手机号一键登录
        </button>
      </view>

      <reset-password v-if="authType === 'resetPassword'" />
      <change-mobile v-if="authType === 'changeMobile'" />
      <changePassword v-if="authType === 'changePassword'" />
      <mp-authorization v-if="authType === 'mpAuthorization'" />

      <view
        v-if="authType === 'wechatLogin'"
        class="agreement-box ss-flex ss-flex-col ss-col-center"
        :class="{ shake: currentProtocol }"
      >
        <view class="agreement-row ss-flex ss-col-center" @tap="toggleProtocol">
          <radio
            :checked="state.protocol"
            color="var(--ui-BG-Main)"
            style="transform: scale(0.8)"
            @tap.stop="toggleProtocol"
          />
          <view class="agreement-text ss-flex ss-col-center ss-m-l-8">
            我已阅读并同意
            <view class="tcp-text" @tap.stop="onProtocol('用户协议')">《用户协议》</view>
            <view class="tcp-text" @tap.stop="onProtocol('隐私政策')">《隐私政策》</view>
          </view>
        </view>
      </view>

      <view class="safe-box" />
    </view>
  </su-popup>
</template>

<script setup>
  import { computed, reactive, ref } from 'vue';
  import sheep from '@/sheep';
  import resetPassword from './components/reset-password.vue';
  import changeMobile from './components/change-mobile.vue';
  import changePassword from './components/change-password.vue';
  import mpAuthorization from './components/mp-authorization.vue';
  import { closeAuthModal, showAuthModal } from '@/sheep/hooks/useModal';
  import { replayPendingAuthRequest } from '@/sheep/request';

  const modalStore = sheep.$store('modal');
  const appStore = sheep.$store('app');
  const userStore = sheep.$store('user');
  const authType = computed(() => modalStore.auth);

  const state = reactive({
    protocol: false,
  });
  const currentProtocol = ref(false);

  function toggleProtocol() {
    state.protocol = !state.protocol;
  }

  function onProtocol(title) {
    sheep.$router.go('/pages/public/richtext', { title });
  }

  function onConfirm(e) {
    currentProtocol.value = e;
    setTimeout(() => {
      currentProtocol.value = false;
    }, 1000);
  }

  function ensureAgreement() {
    if (state.protocol) return true;
    currentProtocol.value = true;
    setTimeout(() => {
      currentProtocol.value = false;
    }, 1000);
    sheep.$helper.toast('请先勾选并同意协议');
    return false;
  }

  async function handleLoginSuccess() {
    await userStore.updateUserData();
    closeAuthModal();
    await replayPendingAuthRequest();
    await appStore.resumePendingAction();
  }

  const getPhoneNumber = async (e) => {
    if (!ensureAgreement()) return;
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      sheep.$helper.toast('未授权手机号，无法登录');
      return;
    }

    const loginCodeRes = await uni.login();
    if (loginCodeRes.errMsg !== 'login:ok' || !loginCodeRes.code) {
      sheep.$helper.toast('微信预登录失败，请稍后重试');
      return;
    }

    let loginSessionId = appStore.loginSessionId;
    if (!loginSessionId) {
      loginSessionId = await appStore.prepareWechatPrelogin(true);
    }

    const { code } = await sheep.$api.auth.wechatPhoneLogin(
      e.detail.code,
      loginCodeRes.code,
      loginSessionId,
    );

    if (code === 0) {
      await handleLoginSuccess();
      return;
    }

    sheep.$helper.toast('登录失败，请稍后重试');
  };
</script>

<style lang="scss" scoped>
  @import './index.scss';

  .shake {
    animation: shake 0.05s linear 4 alternate;
  }

  @keyframes shake {
    from {
      transform: translateX(-10rpx);
    }
    to {
      transform: translateX(10rpx);
    }
  }

  .wechat-login-box {
    padding-top: 20rpx;
  }

  .wechat-login-btn {
    width: 100%;
    height: 88rpx;
    border-radius: 44rpx;
    background: #07c160;
    color: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 30rpx;
    font-weight: 500;
  }

  .agreement-row {
    width: 100%;
    justify-content: center;
    margin-top: 28rpx;
  }

  .safe-box {
    height: calc(constant(safe-area-inset-bottom) / 5 * 3);
    height: calc(env(safe-area-inset-bottom) / 5 * 3);
  }

  .tcp-text {
    color: var(--ui-BG-Main);
    margin-left: 8rpx;
  }

  .agreement-text {
    color: $dark-9;
    flex-wrap: wrap;
  }
</style>
