"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Traps keyboard focus inside an overlay while it is open.
 *
 * A dialog that declares `role="dialog"` and `aria-modal="true"` must
 * actually behave like one: focus must move in, Tab must cycle inside, the
 * background must not be reachable, and focus must return to whatever
 * opened it. Without this, a keyboard user tabs straight out of the cart
 * drawer into the page behind it (WCAG 2.4.3 Focus Order) and loses their
 * place entirely when the overlay closes.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean
) {
  useEffect(() => {
    if (!isOpen) return;

    const node = ref.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    // 1. Move focus into the overlay (first control, else the panel itself).
    const initial = getFocusable()[0] ?? node;
    initial.focus({ preventScroll: true });

    // 2. Cycle Tab / Shift+Tab inside the overlay.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const items = getFocusable();
      if (items.length === 0) {
        event.preventDefault();
        node.focus({ preventScroll: true });
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === node || !node.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !node.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    // 3. Make the rest of the document inert so AT and pointers cannot
    //    reach content behind the overlay.
    const siblings = Array.from(document.body.children).filter(
      (el) => el !== node && !el.contains(node)
    ) as HTMLElement[];
    const previouslyInert = siblings.map((el) => el.hasAttribute("inert"));
    siblings.forEach((el) => el.setAttribute("inert", ""));
    node.removeAttribute("inert");

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      siblings.forEach((el, index) => {
        if (!previouslyInert[index]) el.removeAttribute("inert");
      });
      // 4. Restore focus to the trigger.
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [ref, isOpen]);
}
