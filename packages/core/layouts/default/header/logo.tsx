import logoBgImg from '@jeesite/assets/images/display/logo-bg.webp';
import { defineComponent } from 'vue';

export const Logo = defineComponent({
  setup() {
    return () => (
      <div class="w-420px h-full relative">
        <img src={logoBgImg} alt="" class="h-full absolute z-0 object-fill brightness-60" />

        <div class="absolute left-24px top-1/2 -translate-y-1/2 text-24px font-900 text-white whitespace-nowrap z-50">
          {import.meta.env.VITE_GLOB_APP_TITLE}
        </div>
      </div>
    );
  },
});
