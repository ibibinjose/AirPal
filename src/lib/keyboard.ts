import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard, type KeyboardInfo } from "@capacitor/keyboard";

export interface VirtualKeyboardState {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
}

let currentState: VirtualKeyboardState = {
  isKeyboardOpen: false,
  keyboardHeight: 0,
};

const listeners = new Set<(state: VirtualKeyboardState) => void>();
let initialized = false;
let cleanupFn: (() => void) | null = null;
let liftTimer: ReturnType<typeof setTimeout> | null = null;

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener(currentState);
    } catch {
      /* ignore */
    }
  });
}

function visibleFrame(): { top: number; bottom: number; height: number } {
  if (typeof window === "undefined") {
    return { top: 0, bottom: 800, height: 800 };
  }
  const vv = window.visualViewport;
  const top = vv ? Math.round(vv.offsetTop) : 0;
  const rawBottom = vv ? Math.round(vv.offsetTop + vv.height) : window.innerHeight;
  const kbH = currentState.keyboardHeight || 0;
  // If keyboard is open in native app or browser where visualViewport doesn't shrink,
  // clamp bottom to window.innerHeight - kbH
  const bottom = kbH > 0 ? Math.min(rawBottom, window.innerHeight - kbH) : rawBottom;
  const height = Math.max(120, bottom - top);
  return { top, bottom, height };
}

function syncViewportVars() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const docEl = document.documentElement;
  const vv = window.visualViewport;
  const frame = visibleFrame();
  docEl.style.setProperty("--visual-viewport-height", `${Math.round(frame.height)}px`);
  docEl.style.setProperty("--visual-viewport-offset-top", `${Math.round(vv?.offsetTop || 0)}px`);
  docEl.style.setProperty("--keyboard-height", `${currentState.keyboardHeight}px`);
}

function lockRootToVisibleViewport(on: boolean) {
  const root = document.getElementById?.("root") as HTMLElement | null;
  if (!root) return;
  if (on) {
    const h = Math.round(visibleFrame().height);
    root.style.height = `${h}px`;
    root.style.maxHeight = `${h}px`;
    root.style.overflowY = "auto";
    (root.style as CSSStyleDeclaration & { webkitOverflowScrolling?: string }).webkitOverflowScrolling = "touch";
  } else {
    root.style.height = "";
    root.style.maxHeight = "";
    root.style.overflowY = "";
  }
}

function applyKeyboardStateToDom(isOpen: boolean, height: number) {
  if (typeof document === "undefined") return;

  const docEl = document.documentElement;
  const body = document.body;

  currentState = {
    isKeyboardOpen: isOpen,
    keyboardHeight: height,
  };

  if (isOpen) {
    docEl.classList.add("keyboard-open");
    body?.classList.add("keyboard-open");
    docEl.setAttribute("data-keyboard-open", "true");
  } else {
    docEl.classList.remove("keyboard-open");
    body?.classList.remove("keyboard-open");
    docEl.setAttribute("data-keyboard-open", "false");
    document.querySelectorAll?.("[data-kb-pad]").forEach((node) => {
      const el = node as HTMLElement;
      el.style.paddingBottom = el.dataset.kbPad || "";
      delete el.dataset.kbPad;
    });
  }

  syncViewportVars();
  lockRootToVisibleViewport(isOpen);
  notifyListeners();
}

const safeRequestAnimationFrame = (cb: FrameRequestCallback) => {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(cb);
  }
  if (typeof requestAnimationFrame === "function") {
    return requestAnimationFrame(cb);
  }
  return setTimeout(cb, 16);
};

function nearestScrollParent(el: HTMLElement): HTMLElement | "window" {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = typeof window.getComputedStyle === "function" ? window.getComputedStyle(node) : null;
    const oy = style?.overflowY || "";
    if (oy === "auto" || oy === "scroll" || oy === "overlay") {
      return node;
    }
    node = node.parentElement;
  }
  const root = document.getElementById?.("root") as HTMLElement | null;
  if (root && root.contains(el)) {
    const oy =
      root.style.overflowY ||
      (typeof window.getComputedStyle === "function" ? window.getComputedStyle(root).overflowY : "");
    if (oy === "auto" || oy === "scroll") return root;
  }
  return "window";
}

/**
 * Scroll the focused field so it sits fully visible just above the keyboard.
 */
export function ensureElementInView(
  target: HTMLElement | null | undefined,
  options: {
    block?: ScrollLogicalPosition;
    topClearance?: number;
    bottomClearance?: number;
    behavior?: ScrollBehavior;
  } = {},
): void {
  if (!target || typeof window === "undefined") return;

  const { topClearance = 80, bottomClearance = 32, behavior = "smooth", block = "center" } = options;

  safeRequestAnimationFrame(() => {
    if (!target.isConnected) return;

    // 1. Native scrollIntoView gives the smoothest browser-optimized alignment across all scroll parents
    try {
      if (typeof target.scrollIntoView === "function") {
        target.scrollIntoView({
          behavior,
          block,
          inline: "nearest",
        });
      }
    } catch {
      /* ignore */
    }

    // 2. Identify scroll container and calculate clearance against visibleFrame
    const scroller = nearestScrollParent(target);
    const vFrame = visibleFrame();
    const frame =
      scroller === "window"
        ? vFrame
        : (() => {
            const r = scroller.getBoundingClientRect();
            const top = Math.max(r.top, vFrame.top);
            const bottom = Math.min(r.bottom, vFrame.bottom);
            return { top, bottom, height: Math.max(0, bottom - top) };
          })();

    const safeTop = frame.top + topClearance;
    const safeBottom = frame.bottom - bottomClearance;
    const rect = target.getBoundingClientRect();

    let delta = 0;
    if (rect.bottom > safeBottom) delta = rect.bottom - safeBottom;
    else if (rect.top < safeTop) delta = rect.top - safeTop;

    if (scroller === "window") {
      if (Math.abs(delta) >= 3) {
        window.scrollBy({ top: delta, left: 0, behavior });
      }
      return;
    }

    const root = document.getElementById?.("root");
    if (scroller !== root) {
      const prev = scroller.dataset.kbPad;
      if (prev === undefined) scroller.dataset.kbPad = scroller.style.paddingBottom || "";
      const pad = Math.max(currentState.keyboardHeight, 48);
      scroller.style.paddingBottom = `${pad}px`;
    }

    if (Math.abs(delta) >= 3) {
      scroller.scrollTop += delta;
    }
  });
}

function scheduleLift(target: HTMLElement | null) {
  if (!target) return;
  const run = () => ensureElementInView(target);
  run();
  if (liftTimer) clearTimeout(liftTimer);
  const delays = [30, 100, 250, 450, 650];
  delays.forEach((ms, i) => {
    setTimeout(run, ms);
    if (i === delays.length - 1) liftTimer = setTimeout(run, ms);
  });
}

function isEditableElement(el: HTMLElement): boolean {
  const tagName = el.tagName?.toLowerCase();
  if (tagName === "textarea" || tagName === "select") return true;
  if (tagName === "input") {
    const type = (el as HTMLInputElement).type?.toLowerCase() || "text";
    return !["checkbox", "radio", "range", "hidden", "button", "submit", "reset", "file"].includes(type);
  }
  return Boolean(el.isContentEditable);
}

function focusedEditable(): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null;
  if (active && isEditableElement(active)) return active;
  return null;
}

/**
 * Initializes listeners for mobile virtual keyboard changes.
 * iOS: keyboard overlays; we shrink #root to the visual viewport and scroll the field up.
 * Android: WebView adjustResize plus the same visual-viewport lock.
 */
export function initKeyboardManager(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  if (initialized && cleanupFn) {
    return cleanupFn;
  }

  initialized = true;
  const isNative = Capacitor.isNativePlatform();
  syncViewportVars();

  const unsubs: Array<() => void> = [];

  if (isNative) {
    const nativeSubs: Array<{ remove: () => void }> = [];

    const onNativeShow = (info: KeyboardInfo) => {
      const h = Math.max(info.keyboardHeight || 0, 260);
      applyKeyboardStateToDom(true, h);
      scheduleLift(focusedEditable());
    };

    Keyboard.addListener("keyboardWillShow", onNativeShow)
      .then((sub) => nativeSubs.push(sub))
      .catch(() => undefined);
    Keyboard.addListener("keyboardDidShow", onNativeShow)
      .then((sub) => nativeSubs.push(sub))
      .catch(() => undefined);
    Keyboard.addListener("keyboardWillHide", () => applyKeyboardStateToDom(false, 0))
      .then((sub) => nativeSubs.push(sub))
      .catch(() => undefined);
    Keyboard.addListener("keyboardDidHide", () => applyKeyboardStateToDom(false, 0))
      .then((sub) => nativeSubs.push(sub))
      .catch(() => undefined);

    unsubs.push(() => nativeSubs.forEach((sub) => sub.remove()));
  } else if (window.visualViewport) {
    // Web fallback for mobile browsers (Safari, Chrome)
    const onViewportChange = () => {
      const vport = window.visualViewport;
      if (!vport) return;
      const screenH = window.innerHeight;
      const heightDiff = Math.max(0, screenH - vport.height - (vport.offsetTop || 0));
      const activeEl = focusedEditable();
      // Keyboard is only open if an editable element is actively focused and viewport is meaningfully shrunk
      const isKbOpen = Boolean(activeEl) && heightDiff > 60;
      const computedKbHeight = isKbOpen ? Math.round(Math.max(heightDiff, currentState.keyboardHeight || 0)) : 0;
      applyKeyboardStateToDom(isKbOpen, computedKbHeight);
      if (isKbOpen && activeEl) ensureElementInView(activeEl);
    };

    window.visualViewport.addEventListener("resize", onViewportChange, { passive: true });
    window.visualViewport.addEventListener("scroll", onViewportChange, { passive: true });
    unsubs.push(() => {
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
    });
  }

  const onFocusIn = (e: FocusEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target || !isEditableElement(target)) return;
    scheduleLift(target);
  };

  const onFocusOut = () => {
    setTimeout(() => {
      if (!focusedEditable() && !isNative) {
        applyKeyboardStateToDom(false, 0);
      }
    }, 200);
  };

  window.addEventListener("focusin", onFocusIn, { passive: true });
  window.addEventListener("focusout", onFocusOut, { passive: true });
  unsubs.push(() => {
    window.removeEventListener("focusin", onFocusIn);
    window.removeEventListener("focusout", onFocusOut);
  });

  cleanupFn = () => {
    unsubs.forEach((u) => u());
    applyKeyboardStateToDom(false, 0);
    lockRootToVisibleViewport(false);
    initialized = false;
    cleanupFn = null;
  };

  return cleanupFn;
}

export function useVirtualKeyboard(): VirtualKeyboardState {
  const [state, setState] = useState<VirtualKeyboardState>(currentState);

  useEffect(() => {
    initKeyboardManager();
    listeners.add(setState);
    setState(currentState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}

/**
 * Programmatically blur active inputs and dismiss the virtual keyboard.
 * Safe to call on Web, iOS, and Android.
 */
export async function dismissKeyboard(): Promise<void> {
  if (typeof document !== "undefined") {
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === "function") {
      active.blur();
    }
  }
  if (Capacitor.isNativePlatform()) {
    try {
      await Keyboard.hide();
    } catch {
      /* ignore native keyboard hide error */
    }
  }
  applyKeyboardStateToDom(false, 0);
}
