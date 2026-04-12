import { useEffect } from "react";
import type { RefObject } from "react";

type UseOverlayA11yParams = {
  isActive: boolean;
  onClose?: () => void;
  containerRef: RefObject<HTMLElement | null>;
};

export const useOverlayA11y = ({ isActive, onClose, containerRef }: UseOverlayA11yParams) => {
  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    container?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current) return;

      if (event.key === "Escape") {
        onClose?.();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

      if (focusables.length === 0) {
        event.preventDefault();
        containerRef.current.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, onClose, containerRef]);
};
