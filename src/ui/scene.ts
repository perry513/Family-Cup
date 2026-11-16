import { hush, sfx } from '../audio';

/** Replace the whole screen with a new scene. Children pop in one after another. */
export function scene(root: HTMLElement, html: string, enter = true): HTMLElement {
  root.innerHTML = `<div class="scene${enter ? ' enter' : ''}">${html}</div>`;
  return root.firstElementChild as HTMLElement;
}

/** Resolves when the button is pressed (stops the host voice and clicks). */
export function pressed(button: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    button.addEventListener(
      'click',
      () => {
        hush();
        sfx.tap();
        resolve();
      },
      { once: true },
    );
  });
}
