<!--
StatusBarItem 组件

一个用于在StatusBar中显示单个状态项的组件，支持可点击和不可点击两种状态。

使用示例：
```vue
<StatusBarItem>
  <i class="i-carbon-information"></i>
  <span>状态信息</span>
</StatusBarItem>

<StatusBarItem clickable @click="handleClick">
  <i class="i-carbon-git-branch"></i>
  <span>main</span>
</StatusBarItem>

<StatusBarItem variant="primary">主要状态</StatusBarItem>
<StatusBarItem variant="success">成功状态</StatusBarItem>
<StatusBarItem variant="warning">警告状态</StatusBarItem>
<StatusBarItem variant="error">错误状态</StatusBarItem>
```

属性说明：
- clickable: 是否可点击
  - 类型: boolean
  - 默认值: false
- variant: 状态项变体
  - 可选值: 'default' | 'primary' | 'success' | 'warning' | 'error'
  - 默认值: 'default'
- active: 是否激活状态
  - 类型: boolean
  - 默认值: false

事件：
- click: 点击状态项时触发（仅在clickable为true时有效）
-->

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  // 是否可点击
  clickable?: boolean
  // 状态项变体
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  // 是否激活状态
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  clickable: false,
  variant: 'default',
  active: false
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event)
  }
}

// 计算状态项类名
const itemClass = computed(() => {
  return [
    'status-bar-item',
    'h-full',
    'flex',
    'items-center',
    'gap-1',
    'px-2',
    'text-xs',
    'transition-all',
    'duration-200',
    {
      'cursor-pointer hover:bg-base-300': props.clickable,
      'cursor-default': !props.clickable,
      'bg-base-300': props.active,
      'text-primary': props.variant === 'primary',
      'text-success': props.variant === 'success',
      'text-warning': props.variant === 'warning',
      'text-error': props.variant === 'error'
    }
  ]
})
</script>

<template>
  <div :class="itemClass" @click="handleClick">
    <slot></slot>
  </div>
</template>