<script setup lang="ts">
import { computed, useId, useAttrs, withDefaults } from "vue";

type TooltipButtonClass =
  | string
  | Record<string, boolean>
  | Array<string | Record<string, boolean>>;

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<{
  tooltip?: string;
  disabled?: boolean;
  ariaLabel?: string;
  buttonClass?: TooltipButtonClass;
  type?: "button" | "submit" | "reset";
}>(), {
  tooltip: "",
  disabled: false,
  type: "button",
});

const attrs = useAttrs();
const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const tooltipId = useId();
const tooltipAttrId = computed(() => (props.tooltip ? `tooltip-${tooltipId}` : undefined));
const computedAriaLabel = computed(() => props.ariaLabel ?? props.tooltip ?? undefined);

function onClick(event: MouseEvent) {
  if (props.disabled) return;
  emit("click", event);
}
</script>

<template>
  <span class="tooltip-button-wrapper">
    <button
      class="tooltip-button"
      :type="type"
      :class="buttonClass"
      :disabled="disabled"
      :aria-label="computedAriaLabel"
      :aria-describedby="tooltipAttrId"
      v-bind="attrs"
      @click="onClick"
    >
      <slot />
    </button>
    <span
      v-if="tooltipAttrId && tooltip"
      :id="tooltipAttrId"
      class="tooltip-button__tooltip"
      role="tooltip"
    >
      {{ tooltip }}
    </span>
  </span>
</template>

<style scoped lang="scss">
.tooltip-button-wrapper {
  position: relative;
  display: inline-flex;
}

.tooltip-button {
  cursor: pointer;
}

.tooltip-button__tooltip {
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translate(-50%, 6px);
  z-index: 30;
  min-width: max-content;
  max-width: 360px;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  color: var(--text-strong);
  background: var(--panel-bg-strong);
  font-size: 11px;
  font-weight: 700;
  white-space: pre-line;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transform-origin: top center;
  transition: opacity var(--ease), transform var(--ease), visibility var(--ease);
}

.tooltip-button-wrapper:hover .tooltip-button__tooltip,
.tooltip-button-wrapper:focus-within .tooltip-button__tooltip {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 8px);
}

@media (prefers-reduced-motion: reduce) {
  .tooltip-button__tooltip {
    transition: none;
  }
}
</style>
