import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  Input,
  OnDestroy,
  Output,
  QueryList,
  Renderer2,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { startWith, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { EventRegistry, isBrowser, toBoolean } from '@angular-mdc/web/common';
import { MdcRipple } from '@angular-mdc/web/ripple';

import { MdcFloatingLabel } from '@angular-mdc/web/floating-label';
import { MdcLineRipple } from '@angular-mdc/web/line-ripple';

import { MDCSelectAdapter } from './adapter';
import { MDCSelectFoundation } from '@material/select';

export const MDC_SELECT_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => MdcSelect),
  multi: true
};

export class MdcSelectChange {
  constructor(
    public index: number,
    public value: any) { }
}

let nextUniqueId = 0;

@Component({
  moduleId: module.id,
  selector: 'mdc-select',
  exportAs: 'mdcSelect',
  host: {
    '[id]': 'id',
  },
  template: `
  <select #input
   class="mdc-select__native-control"
   (blur)="onBlur()"
   (change)="onChange($event)"
   (focus)="onFocus()">
    <ng-content #options></ng-content>
  </select>
  <mdc-floating-label [attr.for]="id">{{hasFloatingLabel() ? placeholder : ''}}</mdc-floating-label>
  <mdc-line-ripple></mdc-line-ripple>
  `,
  providers: [
    MDC_SELECT_CONTROL_VALUE_ACCESSOR,
    EventRegistry,
    MdcRipple
  ],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MdcSelect implements AfterContentInit, ControlValueAccessor, OnDestroy {
  /** Emits whenever the component is destroyed. */
  private _destroy = new Subject<void>();

  private _uniqueId: string = `mdc-select-${++nextUniqueId}`;

  @Input() id: string = this._uniqueId;
  @Input() name: string | null = null;

  /** Placeholder to be shown if no value has been selected. */
  @Input()
  get placeholder() { return this._placeholder; }
  set placeholder(value: string) {
    this._placeholder = value;
  }
  private _placeholder: string;

  @Input()
  get disabled(): boolean { return this._disabled; }
  set disabled(value: boolean) {
    this.setDisabled(value);
  }
  private _disabled: boolean;

  @Input()
  get floatingLabel(): boolean { return this._floatingLabel; }
  set floatingLabel(value: boolean) {
    this.setFloatingLabel(value);
  }
  private _floatingLabel: boolean = true;

  @Input()
  get box(): boolean { return this._box; }
  set box(value: boolean) {
    this.setBox(value);
  }
  private _box: boolean = false;

  @Input()
  get autosize(): boolean { return this._autosize; }
  set autosize(value: boolean) {
    this._autosize = value;
  }
  private _autosize: boolean = true;

  @Output() readonly change: EventEmitter<MdcSelectChange> = new EventEmitter<MdcSelectChange>();

  /** Event emitted when the selected value has been changed by the user. */
  @Output() readonly selectionChange: EventEmitter<MdcSelectChange> =
    new EventEmitter<MdcSelectChange>();

  @HostBinding('class.mdc-select') isHostClass = true;
  @HostBinding('tabindex') tabIndex: number = 0;
  @HostBinding('class.mdc-select--box') get classBorder(): string {
    return this.box ? 'mdc-select--box' : '';
  }
  @ViewChild(MdcFloatingLabel) _selectLabel: MdcFloatingLabel;
  @ViewChild(MdcLineRipple) _lineRipple: MdcLineRipple;
  @ViewChild('input') inputEl: ElementRef;
  @ContentChildren('options') options: QueryList<HTMLOptionElement>;

  /** View -> model callback called when value changes */
  _onChange: (value: any) => void = () => { };

  /** View -> model callback called when select has been touched */
  _onTouched = () => { };

  private _mdcAdapter: MDCSelectAdapter = {
    addClass: (className: string) => this._renderer.addClass(this._getHostElement(), className),
    removeClass: (className: string) => this._renderer.removeClass(this._getHostElement(), className),
    floatLabel: (value: any) => this._selectLabel.float(value),
    activateBottomLine: () => this._lineRipple.activate(),
    deactivateBottomLine: () => this._lineRipple.deactivate(),
    setDisabled: (disabled: boolean) => this._getInputElement().disabled = disabled,
    registerInteractionHandler: (type: string, handler: EventListener) => this._registry.listen(type, handler, this._getInputElement()),
    deregisterInteractionHandler: (type: string, handler: EventListener) => this._registry.unlisten(type, handler),
    getSelectedIndex: () => this._getInputElement().selectedIndex,
    setSelectedIndex: (index: number) => this._getInputElement().selectedIndex = index,
    getValue: () => this._getInputElement().value,
    setValue: (value: string) => this._getInputElement().value = value
  };

  private _foundation: {
    init(): void,
    destroy(): void,
    setValue(value: any): void,
    setSelectedIndex(index: number): void,
    setDisabled(disabled: boolean): void
  } = new MDCSelectFoundation(this._mdcAdapter);

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _renderer: Renderer2,
    public elementRef: ElementRef,
    private _ripple: MdcRipple,
    private _registry: EventRegistry) {

    // Force setter to be called in case id was not specified.
    this.id = this.id;
  }

  ngAfterContentInit(): void {
    this._foundation.init();

    this.options.changes.pipe(startWith(null), takeUntil(this._destroy)).subscribe(() => {
      Promise.resolve().then(() => {
        this._selectLabel.float(this.getValue());

        if (this.autosize) {
          this._setWidth();
        }
      });
    });
  }

  ngOnDestroy(): void {
    this._destroy.next();
    this._destroy.complete();

    this._ripple.destroy();
    this._foundation.destroy();
  }

  writeValue(value: any): void {
    if (value !== this._getInputElement().value) {
      this.setValue(value, false);
    }
    this.change.emit(new MdcSelectChange(this._getInputElement().selectedIndex, value));
    this._initializeSelection(value);
  }

  registerOnChange(fn: (value: any) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }

  onChange(event: Event): void {
    this.setValue((<any>event.target).value, true);
    this.selectionChange.emit(new MdcSelectChange(this._getInputElement().selectedIndex, this.getValue()));
    event.stopPropagation();
  }

  onBlur(): void {
    if (!this.disabled) {
      this._onTouched();
    }
  }

  onFocus(): void {
    this._onTouched();
  }

  private _initializeSelection(value: any): void {
    // Defer setting the value in order to avoid the "Expression
    // has changed after it was checked" errors from Angular.
    Promise.resolve().then(() => {
      this.setValue(value, false);
    });
  }

  setValue(newValue: any, isUserInput: boolean = true): void {
    if (this.disabled) {
      return;
    }

    this._foundation.setValue(newValue);
    if (isUserInput) {
      this._onChange(newValue);
    }
    this._selectLabel.float(newValue);

    this._changeDetectorRef.markForCheck();
  }

  getValue(): any {
    return this._getInputElement().value;
  }

  setPlaceholder(text: string): void {
    this._placeholder = text;
  }

  getSelectedIndex(): number {
    return this._getInputElement().selectedIndex;
  }

  isDisabled(): boolean {
    return this.disabled;
  }

  setDisabled(disabled: boolean): void {
    this.setDisabledState(disabled);
  }

  // Implemented as part of ControlValueAccessor.
  setDisabledState(disabled: boolean) {
    this._disabled = disabled;
    this._foundation.setDisabled(disabled);

    this._changeDetectorRef.markForCheck();
  }

  /** Styles the select as a box. */
  setBox(box: boolean): void {
    this._box = toBoolean(box);
    this._box ? this._ripple.attachTo(this._getHostElement(), false,
      this._getInputElement()) : this._ripple.destroy();

    this._changeDetectorRef.markForCheck();
  }

  setFloatingLabel(floatingLabel: boolean) {
    this._floatingLabel = toBoolean(floatingLabel);
    this._changeDetectorRef.markForCheck();
  }

  focus(): void {
    if (!this.disabled) {
      this._getInputElement().focus();
    }
  }

  hasFloatingLabel(): boolean {
    return this._floatingLabel || !this.getValue();
  }

  private _setWidth() {
    if (this.options && this.placeholder) {
      const labelLength = this._selectLabel.elementRef.nativeElement.textContent.length;
      this._renderer.setStyle(this._getHostElement(), 'width', `${labelLength}rem`);
    }
  }

  /** Retrieves the select input element. */
  private _getInputElement() {
    return this.inputEl.nativeElement;
  }

  /** Retrieves the DOM element of the component host. */
  private _getHostElement() {
    return this.elementRef.nativeElement;
  }
}
