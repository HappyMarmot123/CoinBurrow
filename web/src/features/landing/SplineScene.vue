<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { Application } from "@splinetool/runtime";

const props = defineProps<{ scene?: string }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let app: Application | null = null;

onMounted(() => {
  if (canvas.value && props.scene) {
    app = new Application(canvas.value);
    app.load(props.scene).catch(() => {
      // Scene loading is best-effort so CI and local dev can run without an asset URL.
    });
  }
});

onUnmounted(() => app?.dispose());
</script>

<template>
  <canvas ref="canvas" class="spline-canvas" />
</template>

<style scoped lang="scss">
.spline-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
