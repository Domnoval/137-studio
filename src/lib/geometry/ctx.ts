/**
 * The shared context handed to each part of the controller (core, Studio panel,
 * Present mode). It keeps the parts decoupled: they talk through this object and
 * never import one another.
 */

import type { Painter } from './painter';
import type { State } from './state';
import type { Labels } from './studio';

export interface Ctx {
  root: HTMLElement;
  signal: AbortSignal;
  state: State;
  painter: Painter;
  /** Required-element lookup scoped to `root`. Throws if the shell markup is missing something. */
  q<T extends Element = HTMLElement>(selector: string): T;
  qa<T extends Element = HTMLElement>(selector: string): T[];
  /** addEventListener that unregisters itself when the controller is torn down. */
  on<E extends Event = Event>(
    target: EventTarget,
    type: string,
    handler: (event: E) => void,
    options?: AddEventListenerOptions,
  ): void;
  /** Output labels for the current figure (used in file names and sheet captions). */
  labels(): Labels;
  toast(message: string): void;
  /** Save a blob as a file download. */
  download(name: string, blob: Blob): void;
  /** The on-screen drawing as a standalone SVG string (tokens resolved to literal colours). */
  screenSvg(): string;
  /** Hooks run at the end of every render(). */
  afterRender: Set<() => void>;
  /** Turn auto-rotation off (and reflect it in the UI). */
  stopAutoRotate(): void;
  syncPressed(): void;
}
