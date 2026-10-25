/**
 * Implements the modern-web-guidance fallback for <dialog closedby="any">
 * and :user-invalid / aria-invalid synchronization.
 */

export function attachDialogLightDismissFallback(
  dialog: HTMLDialogElement | null,
  onClose?: () => void
): () => void {
  if (!dialog) return () => {};

  const handleClose = () => {
    onClose?.();
  };

  dialog.addEventListener('close', handleClose);

  let handleBackdropClick: ((event: MouseEvent) => void) | null = null;

  // Fallback for browsers without closedBy in HTMLDialogElement.prototype
  if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
    handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (isDialogContent) return;
      dialog.close();
    };
    dialog.addEventListener('click', handleBackdropClick);
  }

  return () => {
    dialog.removeEventListener('close', handleClose);
    if (handleBackdropClick) {
      dialog.removeEventListener('click', handleBackdropClick);
    }
  };
}

export function initFormValidationSync(formElement: HTMLFormElement | null): () => void {
  if (!formElement || typeof document === 'undefined') return () => {};

  const dirtyState = new WeakMap<
    HTMLElement,
    { hasInteracted: boolean; hasBlurred: boolean }
  >();
  const supportsUserInvalid =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('selector(:user-invalid)');

  const syncAriaAndFallback = (el: EventTarget | null) => {
    if (
      !(
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      )
    ) {
      return;
    }
    if (supportsUserInvalid) {
      try {
        el.setAttribute('aria-invalid', el.matches(':user-invalid') ? 'true' : 'false');
      } catch {
        // Ignore selector errors
      }
    } else if (typeof el.checkValidity === 'function') {
      const isValid = el.checkValidity();
      el.classList.toggle('user-invalid-fallback', !isValid);
      el.classList.toggle('user-valid-fallback', isValid);
      if (!isValid) {
        el.setAttribute('aria-invalid', 'true');
      } else {
        el.removeAttribute('aria-invalid');
      }
    }
  };

  const handleBlur = (e: Event) => {
    const target = e.target;
    if (target instanceof HTMLElement) {
      const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
      state.hasBlurred = true;
      dirtyState.set(target, state);
      if (supportsUserInvalid || state.hasInteracted) {
        syncAriaAndFallback(target);
      }
    }
  };

  const handleInput = (e: Event) => {
    const target = e.target;
    if (target instanceof HTMLElement) {
      const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
      state.hasInteracted = true;
      dirtyState.set(target, state);
      if (target.hasAttribute('aria-invalid') || state.hasBlurred) {
        syncAriaAndFallback(target);
      }
    }
  };

  formElement.addEventListener('blur', handleBlur, true);
  formElement.addEventListener('input', handleInput);
  formElement.addEventListener('change', handleInput);

  return () => {
    formElement.removeEventListener('blur', handleBlur, true);
    formElement.removeEventListener('input', handleInput);
    formElement.removeEventListener('change', handleInput);
  };
}
