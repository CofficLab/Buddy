<script setup lang="ts">
  import { computed, onMounted } from 'vue';
  import { RiDeleteBinLine } from '@remixicon/vue';
  import { Button } from '@coffic/cosy-ui/vue';
  import { RiAlertLine } from '@remixicon/vue';
  import { SendablePackage } from '@/types/sendable-package';
  import { useDownload } from '@/ui/composables/useDownload';
  import { useUninstall } from '@/ui/composables/useUninstall';

  const props = defineProps<{
    package: SendablePackage;
  }>();

  const {
    handleDownload,
    downloadingPackages,
    checkInstallationStatus,
    isPackageInstalled,
  } = useDownload();
  const { confirmUninstall, uninstallingPlugins } = useUninstall();

  const isDownloading = computed(() =>
    downloadingPackages.value.has(props.package.id)
  );

  const isInstalled = isPackageInstalled(props.package.id);
  const isUserPlugin = computed(() => props.package.type === 'user');

  onMounted(async () => {
    await checkInstallationStatus(props.package.id);
  });
</script>

<template>
  <transition
    name="card-fade"
    appear
    enter-active-class="transition-all duration-300 ease"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-300 ease"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2">
    <div
      class="p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex flex-col">
      <!-- 插件包标题 -->
      <div class="flex justify-between items-center text-sm mb-2">
        <h3 class="mb-2">{{ package.name }}</h3>
      </div>

      <!-- 插件包基本信息 -->
      <div class="flex justify-start items-center text-sm">
        <span>v{{ package.version }} ｜ {{ package.author }}</span>
      </div>

      <!-- 操作区域 -->
      <div
        class="mt-4 flex flex-wrap gap-2 items-center"
        v-if="package.type != 'dev'">
        <!-- 本地插件操作 -->
        <template v-if="package.type === 'user'">
          <div v-if="isUserPlugin">
            <!-- 卸载按钮 -->
            <Button
              size="sm"
              variant="primary"
              @click="confirmUninstall(package.id)"
              :loading="uninstallingPlugins.has(package.id)">
              <RiDeleteBinLine class="h-4 w-4" />
            </Button>
          </div>
        </template>

        <!-- 远程插件操作 -->
        <template v-if="package.type == 'remote'">
          <Button
            @click="handleDownload(package.id)"
            variant="primary"
            size="sm"
            :loading="isDownloading"
            :disabled="isDownloading || isInstalled">
            {{ isInstalled ? '已安装' : isDownloading ? '下载中...' : '下载' }}
          </Button>
        </template>
      </div>

      <!-- 插件详细信息 -->
      <p class="text-sm mb-4 border-t mt-4 pt-4">{{ package.description }}</p>

      <!-- 插件错误信息 -->
      <p class="text-error text-sm mb-4 flex items-center" v-if="package.error">
        <RiAlertLine class="h-5 w-5 mr-1" />
        {{ package.error }}
      </p>
    </div>
  </transition>
</template>
