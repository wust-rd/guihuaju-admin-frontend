import { computed, defineComponent, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { match, P } from 'ts-pattern';
import linkImg from '@jeesite/assets/images/display/link.webp';
import activeLinkImg from '@jeesite/assets/images/display/active-link.webp';
import hoverLinkImg from '@jeesite/assets/images/display/hover-link.webp';

import { cn } from '@jeesite/core/libs';

export const LinkItem = defineComponent({
  props: {
    to: { type: String, default: '' },
    icon: { type: String, default: '' },
    label: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },
  setup(props) {
    const route = useRoute();
    // 按一级模块前缀点亮：to 形如 /模块/overview/index，取首段（如 /ifco），
    // 该模块下任意页面（如 /ifco/effect-fill/list）都点亮对应导航项
    const modulePrefix = `/${props.to.split('/')[1] ?? ''}`;
    const isActive = computed(
      () => route.path === modulePrefix || route.path.startsWith(`${modulePrefix}/`),
    );
    const isHover = ref(false);

    // 优先级：active 恒显示 active 图；非 active 时 hover 显示 hover 图；否则默认图
    const imgSrc = computed(() =>
      match([isActive.value, isHover.value] as const)
        .with([true, P.any], () => activeLinkImg)
        .with([false, true], () => hoverLinkImg)
        .otherwise(() => linkImg),
    );

    const renderContent = (navigate?: () => void) => (
      <div
        class="relative w-194px h-56px flex items-center cursor-pointer"
        onClick={() => {
          if (!props.disabled && navigate) {
            navigate();
          }
        }}
        onMouseenter={() => (isHover.value = true)}
        onMouseleave={() => (isHover.value = false)}
      >
        <img src={imgSrc.value} alt="tab" class="size-full" />

        <div
          class={cn('size-20px absolute left-20px', props.icon, {
            'text-white': isActive.value,
            'text-gray-400': !isActive.value,
          })}
        />
        <div
          class={cn('text-18px absolute left-68px whitespace-nowrap', {
            'text-white font-600': isActive.value,
            'text-gray-400': !isActive.value,
          })}
        >
          {props.label}
        </div>
      </div>
    );

    return () =>
      props.disabled ? (
        renderContent()
      ) : (
        <RouterLink
          to={props.to}
          v-slots={{
            default: ({ navigate }) => renderContent(navigate),
          }}
        />
      );
  },
});
