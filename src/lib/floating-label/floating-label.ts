import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';
import { EventRegistry } from '@angular-mdc/web/common';

import { MDCFloatingLabelAdapter } from '@material/floating-label/adapter';
import { MDCFloatingLabelFoundation } from '@material/floating-label';

@Component({
  selector: '[mdc-floating-label], mdc-floating-label',
  template: '<ng-content></ng-content>',
  exportAs: 'mdcFloatingLabel',
  providers: [EventRegistry],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class MdcFloatingLabel implements OnInit, OnDestroy {
  @HostBinding('class.mdc-floating-label') isHostClass = true;

  private _mdcAdapter: MDCFloatingLabelAdapter = {
    addClass: (className: string) => this._renderer.addClass(this._getHostElement(), className),
    removeClass: (className: string) => this._renderer.removeClass(this._getHostElement(), className),
    getWidth: () => this._getHostElement().offsetWidth,
    registerInteractionHandler: (evtType: string, handler: EventListener) =>
      this._registry.listen(evtType, handler, this._getHostElement()),
    deregisterInteractionHandler: (evtType: string, handler: EventListener) => this._registry.unlisten(evtType, handler),
  };

  foundation: {
    init(): void,
    destroy(): void,
    getWidth(): number,
    shake(shouldShake: boolean): void,
    float(shouldFloat: boolean): void
  } = new MDCFloatingLabelFoundation(this._mdcAdapter);

  constructor(
    private _renderer: Renderer2,
    public elementRef: ElementRef,
    private _registry: EventRegistry) { }

  ngOnInit(): void {
    this.foundation.init();
  }

  ngOnDestroy(): void {
    this.foundation.destroy();
  }

  destroy(): void {
    this.foundation.destroy();
  }

  /** Returns the width of the label element. */
  getWidth(): number {
    return this.foundation.getWidth();
  }

  /** Styles the label to produce the label shake for errors. */
  shake(shouldShake: boolean): void {
    this.foundation.shake(shouldShake);
  }

  /** Styles the label to float or dock. */
  float(shouldFloat: boolean): void {
    this.foundation.float(shouldFloat);
  }

  /** Retrieves the DOM element of the component host. */
  private _getHostElement() {
    return this.elementRef.nativeElement;
  }
}
