<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  useAttrs,
  useId,
} from "vue";

type TooltipButtonClass =
  | string
  | Record<string, boolean>
  | Array<string | Record<string, boolean>>;

type TooltipPlacement = "top" | "bottom" | "left" | "right";
type TooltipSize = "sm" | "md";
type TooltipKind = "icon" | "text";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    tooltip?: string;
    disabled?: boolean;
    ariaLabel?: string;
    buttonClass?: TooltipButtonClass;
    type?: "button" | "submit" | "reset";
    size?: TooltipSize;
    placement?: TooltipPlacement;
    kind?: TooltipKind;
  }>(),
  {
    tooltip: "",
    disabled: false,
    type: "button",
    size: "sm",
    kind: "text",
    placement: "bottom",
  },
);

const attrs = useAttrs();
const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const tooltipId = useId();
const tooltipAttrId = computed(() => (props.tooltip ? `tooltip-${tooltipId}` : undefined));
const computedAriaLabel = computed(() => props.ariaLabel ?? props.tooltip ?? undefined);
const buttonClasses = computed(() => [
  `tooltip-button__button`,
  `tooltip-button__button--${props.size}`,
  props.kind === "icon" ? "tooltip-button__button--icon" : "tooltip-button__button--text",
  props.buttonClass,
]);
const tooltipClasses = computed(() => [
  `tooltip-button__tooltip`,
  `tooltip-button__tooltip--${activePlacement.value}`,
]);
const tooltipStyle = ref<Record<string, string>>({});

const wrapperRef = ref<HTMLElement | null>(null);
const buttonRef = ref<HTMLButtonElement | null>(null);
const tooltipRef = ref<HTMLElement | null>(null);

const isOpen = ref(false);
const activePlacement = ref<TooltipPlacement>(props.placement);

function onClick(event: MouseEvent) {
  if (props.disabled) return;
  emit("click", event);
}

function onPointerEnter() {
  openTooltip();
}

function onPointerLeave() {
  const active = document.activeElement;
  if (active !== buttonRef.value) {
    closeTooltip();
  }
}

function onFocusIn() {
  openTooltip();
}

function onFocusOut(event: FocusEvent) {
  const nextFocus = event.relatedTarget as Node | null;
  if (!nextFocus || !wrapperRef.value?.contains(nextFocus)) {
    closeTooltip();
  }
}

function openTooltip() {
  if (!tooltipAttrId.value || isOpen.value) return;
  isOpen.value = true;
  nextTick(() => {
    alignTooltipToViewport();
  });
}

function closeTooltip() {
  isOpen.value = false;
}

function alignTooltipToViewport() {
  if (!wrapperRef.value || !tooltipRef.value || !tooltipAttrId.value || !isOpen.value) {
    return;
  }

  const anchor = wrapperRef.value.getBoundingClientRect();
  const pad = 12;
  const arrowOffsetLimit = 10;
  const gap = 8;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const maxW = Math.max(180, viewportW - pad * 2);

  tooltipStyle.value = {
    left: "0px",
    top: "0px",
    width: "auto",
    maxWidth: `${maxW}px`,
    transform: "none",
  };

  const tooltipNode = tooltipRef.value;
  const tipRect = tooltipNode.getBoundingClientRect();
  const tipW = Math.min(tipRect.width, maxW);
  const tipH = tipRect.height;
  const anchorCenterX = anchor.left + anchor.width / 2;
  const anchorCenterY = anchor.top + anchor.height / 2;

  let placement: TooltipPlacement = props.placement;
  if (placement === "bottom") {
    const bottomFit = anchor.bottom + gap + tipH <= viewportH - pad;
    const topFit = anchor.top - gap - tipH >= pad;
    if (!bottomFit && topFit) placement = "top";
  } else if (placement === "top") {
    const topFit = anchor.top - gap - tipH >= pad;
    const bottomFit = anchor.bottom + gap + tipH <= viewportH - pad;
    if (!topFit && bottomFit) placement = "bottom";
  } else if (placement === "left") {
    const leftFit = anchor.left - gap - tipW >= pad;
    const rightFit = anchor.right + gap + tipW <= viewportW - pad;
    if (!leftFit && rightFit) placement = "right";
  } else if (placement === "right") {
    const rightFit = anchor.right + gap + tipW <= viewportW - pad;
    const leftFit = anchor.left - gap - tipW >= pad;
    if (!rightFit && leftFit) placement = "left";
  }

  let left = 0;
  let top = 0;
  let arrowOffsetX = tipW / 2;
  let arrowOffsetY = tipH / 2;

  if (placement === "bottom") {
    top = anchor.bottom + gap;
    left = anchor.left + anchor.width / 2 - tipW / 2;
    arrowOffsetX = Math.round(anchorCenterX - left);
    arrowOffsetX = Math.max(arrowOffsetLimit, Math.min(arrowOffsetX, tipW - arrowOffsetLimit));
  } else if (placement === "top") {
    top = anchor.top - gap - tipH;
    left = anchor.left + anchor.width / 2 - tipW / 2;
    arrowOffsetX = Math.round(anchorCenterX - left);
    arrowOffsetX = Math.max(arrowOffsetLimit, Math.min(arrowOffsetX, tipW - arrowOffsetLimit));
  } else if (placement === "left") {
    left = anchor.left - gap - tipW;
    top = anchor.top + anchor.height / 2 - tipH / 2;
    arrowOffsetY = Math.round(anchorCenterY - top);
    arrowOffsetY = Math.max(arrowOffsetLimit, Math.min(arrowOffsetY, tipH - arrowOffsetLimit));
  } else {
    left = anchor.right + gap;
    top = anchor.top + anchor.height / 2 - tipH / 2;
    arrowOffsetY = Math.round(anchorCenterY - top);
    arrowOffsetY = Math.max(arrowOffsetLimit, Math.min(arrowOffsetY, tipH - arrowOffsetLimit));
  }

  left = Math.max(pad, Math.min(left, viewportW - tipW - pad));
  top = Math.max(pad, Math.min(top, viewportH - tipH - pad));

  if (left + tipW > viewportW - pad) {
    left = viewportW - pad - tipW;
  }
  if (top + tipH > viewportH - pad) {
    top = viewportH - pad - tipH;
  }

  tooltipStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    maxWidth: `${maxW}px`,
    width: "auto",
    transform: "none",
    ["--tooltip-arrow-offset-x"]: `${Math.round(arrowOffsetX)}px`,
    ["--tooltip-arrow-offset-y"]: `${Math.round(arrowOffsetY)}px`,
  };
  activePlacement.value = placement;
}

function onViewportUpdate() {
  if (isOpen.value) {
    alignTooltipToViewport();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", onViewportUpdate, { passive: true });
  window.addEventListener("scroll", onViewportUpdate, { passive: true, capture: true });
}

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", onViewportUpdate);
    window.removeEventListener("scroll", onViewportUpdate, { capture: true } as AddEventListenerOptions);
  }
});
</script>

<template>
  <span class="tooltip-button-wrapper" ref="wrapperRef">
    <button
      ref="buttonRef"
      :type="type"
      :class="buttonClasses"
      :disabled="disabled"
      :aria-label="computedAriaLabel"
      :aria-describedby="tooltipAttrId"
      v-bind="attrs"
      @click="onClick"
      @mouseenter="onPointerEnter"
      @mouseleave="onPointerLeave"
      @focusin="onFocusIn"
      @focusout="onFocusOut"
    >
      <slot>
        <span class="tooltip-button__fallback" aria-hidden="true">?</span>
      </slot>
    </button>
    <span
      v-if="isOpen && tooltipAttrId && tooltip"
      :id="tooltipAttrId"
      ref="tooltipRef"
      :class="tooltipClasses"
      :style="tooltipStyle"
      role="tooltip"
      style="opacity: 1"
    >
      {{ tooltip }}
    </span>
  </span>
</template>

<style scoped lang="scss">
.tooltip-button-wrapper {
  position: relative;
  display: inline-flex;
  line-height: 1;
  vertical-align: baseline;
}

.tooltip-button__button {
  border: 1px solid rgba(217, 255, 102, 0.28);
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  color: #dce6ff;
  background: rgba(12, 22, 38, 0.96);
  cursor: pointer;
  font: inherit;
  transition:
    background-color var(--ease),
    border-color var(--ease),
    color var(--ease),
    box-shadow var(--ease);
}

.tooltip-button__button--icon {
  border-radius: 999px;
  min-width: 0;
  border-color: var(--panel-border-hover);
}

.tooltip-button__button--text {
  border-radius: var(--radius-sm);
}

.tooltip-button__button:focus-visible {
  outline: none;
  border-color: var(--panel-border-hover);
  box-shadow: 0 0 0 3px rgb(217 255 102 / 16%);
  color: var(--brand-lime);
}

.tooltip-button__button:hover {
  border-color: #d9ff66;
  color: #ffffff;
  background: rgba(217, 255, 102, 0.18);
}

.tooltip-button__button:where(:disabled) {
  cursor: not-allowed;
  opacity: 0.5;
  box-shadow: none;
}

.tooltip-button__button--sm {
  width: 18px;
  height: 18px;
  min-width: 18px;
  min-height: 18px;
  padding-inline: 6px;
  flex: 0 0 18px;
}

.tooltip-button__button--md {
  width: 20px;
  height: 20px;
  min-width: 20px;
  min-height: 20px;
  padding-inline: 8px;
  flex: 0 0 20px;
}

.tooltip-button__button--text.tooltip-button__button--sm,
.tooltip-button__button--text.tooltip-button__button--md {
  width: auto;
  height: auto;
  min-width: 0;
  min-height: 0;
  flex: initial;
}

.tooltip-button__fallback,
.tooltip-button__tooltip-slot {
  display: inline-grid;
  place-items: center;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
}

.tooltip-button__tooltip {
  position: fixed;
  z-index: 1200;
  max-width: 420px;
  border: 1px solid rgba(217, 255, 102, 0.56);
  border-radius: 10px;
  padding: 10px 12px;
  color: #eef5ff;
  background: rgba(13, 24, 40, 0.98);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.54), 0 0 0 1px rgba(217, 255, 102, 0.28);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  pointer-events: none;
  letter-spacing: 0;
  min-width: 0;
  --tooltip-arrow-offset-x: 50%;
  --tooltip-arrow-offset-y: 50%;
}

.tooltip-button__tooltip::before {
  content: "";
  position: absolute;
  width: 8px;
  height: 8px;
  background: inherit;
  border: 1px solid transparent;
}

.tooltip-button__tooltip--bottom {
  transform: none;
}

.tooltip-button__tooltip--bottom::before {
  top: -5px;
  left: var(--tooltip-arrow-offset-x, 50%);
  border-right-color: color-mix(in srgb, var(--panel-border-hover) 65%, var(--panel-border));
  border-top-color: color-mix(in srgb, var(--panel-border-hover) 65%, var(--panel-border));
  transform: translate(-50%, 0) rotate(45deg);
}

.tooltip-button__tooltip--top {
  transform: none;
}

.tooltip-button__tooltip--top::before {
  bottom: -5px;
  left: var(--tooltip-arrow-offset-x, 50%);
  border-bottom-color: color-mix(in srgb, var(--panel-border-hover) 65%, var(--panel-border));
  border-left-color: color-mix(in srgb, var(--panel-border-hover) 65%, var(--panel-border));
  transform: translate(-50%, 0) rotate(45deg);
}

.tooltip-button__tooltip--left {
  transform: none;
}

.tooltip-button__tooltip--left::before {
  right: -5px;
  top: var(--tooltip-arrow-offset-y, 50%);
  border-right-color: color-mix(in srgb, var(--panel-border-hover) 65%, var(--panel-border));
  border-top-color: color-mix(in srgb, var(--panel-border-hover) 65%, var(--panel-border));
  transform: translate(0, -50%) rotate(45deg);
}

.tooltip-button__tooltip--right {
  transform: none;
}

.tooltip-button__tooltip--right::before {
  left: -5px;
  top: var(--tooltip-arrow-offset-y, 50%);
  border-bottom-color: color-mix(in srgb, var(--panel-border-hover) 65%, var(--panel-border));
  border-left-color: color-mix(in srgb, var(--panel-border-hover) 65%, var(--panel-border));
  transform: translate(0, -50%) rotate(45deg);
}

@media (prefers-reduced-motion: reduce) {
  .tooltip-button__tooltip {
    transition: none;
  }
}
</style>
