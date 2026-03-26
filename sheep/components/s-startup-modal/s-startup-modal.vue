<template>
  <su-popup :show="show" type="center" :showClose="false" :isMaskClick="false" round="20">
    <view class="startup-modal">
      <view class="title">欢迎使用</view>
      <view class="desc">
        首次进入请先阅读并同意《用户协议》《隐私政策》。同意后我们会申请定位权限，用于附近场馆、距离展示和城市匹配。
      </view>

      <view class="protocols">
        <text>继续前请阅读：</text>
        <text class="link" @tap="openProtocol('用户协议')">《用户协议》</text>
        <text class="link" @tap="openProtocol('隐私政策')">《隐私政策》</text>
      </view>

      <button class="ss-reset-button primary-btn" @tap="agreeAndContinue">同意并继续</button>
      <button class="ss-reset-button ghost-btn" @tap="stayHere">暂不同意</button>
    </view>
  </su-popup>
</template>

<script setup>
  import { computed } from 'vue';
  import sheep from '@/sheep';

  const appStore = sheep.$store('app');
  const show = computed(
    () => !appStore.agreementAccepted && appStore.currentRoute !== '/pages/public/richtext',
  );

  const agreeAndContinue = async () => {
    await appStore.acceptAgreement();
  };

  const stayHere = () => {
    sheep.$helper.toast('需先同意协议后才能继续使用');
  };

  const openProtocol = (title) => {
    sheep.$router.go('/pages/public/richtext', { title });
  };
</script>

<style lang="scss" scoped>
.startup-modal {
  width: 620rpx;
  padding: 48rpx 40rpx;
}
.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
}
.desc {
  font-size: 28rpx;
  color: #666;
  line-height: 1.7;
  margin-bottom: 24rpx;
}
.protocols {
  font-size: 26rpx;
  color: #666;
  line-height: 1.8;
  margin-bottom: 36rpx;
}
.link {
  color: var(--ui-BG-Main);
  margin-left: 8rpx;
}
.primary-btn,
.ghost-btn {
  width: 100%;
  height: 84rpx;
  border-radius: 42rpx;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.primary-btn {
  background: var(--ui-BG-Main);
  color: #fff;
  margin-bottom: 20rpx;
}
.ghost-btn {
  background: #f5f5f5;
  color: #666;
}
</style>
