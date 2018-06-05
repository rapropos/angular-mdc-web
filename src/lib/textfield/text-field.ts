import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  Directive,
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

import {
  toBoolean,
  isBrowser,
  EventRegistry,
  toNumber,
  getSupportedInputTypes
} from '@angular-mdc/web/common';
import { MdcRipple } from '@angular-mdc/web/ripple';
import { MdcFloatingLabel } from '@angular-mdc/web/floating-label';
import { MdcLineRipple } from '@angular-mdc/web/line-ripple';
import { MdcNotchedOutline, MdcNotchedOutlineIdle } from '@angular-mdc/web/notched-outline';
import { MdcIcon } from '@angular-mdc/web/icon';

import { MdcTextFieldHelperText } from './helper-text';

import { MDCTextFieldIconAdapter } from '@material/textfield/icon/adapter';
import { MDCTextFieldIconFoundation } from '@material/textfield/icon';

import { MDCTextFieldAdapter } from '@material/textfield/adapter';
import { MDCTextFieldFoundation } from '@material/textfield';

export const MDC_TEXTFIELD_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => MdcTextField),
  multi: true
};

// Invalid input type. Using one of these will throw an error.
const MDC_INPUT_INVALID_TYPES = [
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit'
];

let nextUniqueId = 0;

@Component({
  moduleId: module.id,
  selector: 'mdc-text-field',
  exportAs: 'mdcTextField',
  template: `
  <ng-content select="mdc-icon[leading]"></ng-content>
  <input #input class="mdc-text-field__input"
    [id]="id"
    [tabindex]="tabIndex"
    [disabled]="disabled"
    [placeholder]="placeholder"
    [attr.maxlength]="maxlength"
    [required]="required"
    (focus)="onFocus()"
    (blur)="onBlur()"
    (input)="onInput($event.target.value)" />
    <ng-content></ng-content>
    <mdc-floating-label [attr.for]="id" *ngIf="!placeholder">{{label}}</mdc-floating-label>
    <mdc-line-ripple *ngIf="!outline"></mdc-line-ripple>
    <mdc-notched-outline *ngIf="outline"></mdc-notched-outline>
    <mdc-notched-outline-idle *ngIf="outline"></mdc-notched-outline-idle>
  `,
  providers: [
    MDC_TEXTFIELD_CONTROL_VALUE_ACCESSOR,
    MdcRipple,
    EventRegistry
  ],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MdcTextField implements AfterViewInit, AfterContentInit, OnDestroy, ControlValueAccessor {
  /** Emits whenever the component is destroyed. */
  private _destroy = new Subject<void>();

  protected _uid = `mdc-input-${nextUniqueId++}`;

  private _useCustomValidity: boolean;

  @Input() label: string;
  @Input() maxlength: number;
  @Input() placeholder: string = '';
  @Input() tabIndex: number = 0;
  @Input() direction: 'ltr' | 'rtl' = 'ltr';
  @Output() iconAction = new EventEmitter<boolean>();
  @Output() change = new EventEmitter<string>();
  @Output() blur = new EventEmitter<string>();
  @HostBinding('class.mdc-text-field') isHostClass = true;
  @ViewChild('input') inputText: ElementRef;
  @ViewChild(MdcFloatingLabel) floatingLabel: MdcFloatingLabel;
  @ViewChild(MdcLineRipple) lineRipple: MdcLineRipple;
  @ContentChildren(MdcIcon) icons: QueryList<MdcIcon>;
  @ViewChild(MdcNotchedOutline) outlined: MdcNotchedOutline;
  @ViewChild(MdcNotchedOutlineIdle) outlineIdle: MdcNotchedOutlineIdle;

  @Input()
  get id(): string { return this._id; }
  set id(value: string) { this._id = value || this._uid; }
  protected _id: string;

  /** Input type of the element. */
  @Input()
  get type(): string { return this._type; }
  set type(value: string) {
    this._type = value || 'text';
    this._validateType();

    // When using Angular inputs, developers are no longer able to set the properties on the native
    // input element. To ensure that bindings for `type` work, we need to sync the setter
    // with the native property. Textarea elements don't support the type property or attribute.
    if (!this.isTextarea() && getSupportedInputTypes().has(this._type)) {
      this.inputText.nativeElement.type = this._type;
    }
  }
  protected _type = 'text';

  @Input()
  get box(): boolean { return this._box; }
  set box(value: boolean) {
    this.setBox(value);
  }
  protected _box: boolean = false;

  @Input()
  get outline(): boolean { return this._outline; }
  set outline(value: boolean) {
    this.setOutline(value);
  }
  protected _outline: boolean = false;

  @Input()
  get disabled(): boolean { return this._disabled; }
  set disabled(value: boolean) {
    this.setDisabled(value);
  }
  protected _disabled: boolean;

  @Input()
  get required(): boolean { return this._required; }
  set required(value: boolean) {
    this.setRequired(value);
  }
  private _required: boolean = false;

  @Input()
  get focused(): boolean { return this._focused; }
  set focused(value: boolean) {
    this._focused = toBoolean(value);
  }
  private _focused: boolean = false;

  @Input()
  get fullwidth(): boolean { return this._fullwidth; }
  set fullwidth(value: boolean) {
    this.setFullwidth(value);
  }
  private _fullwidth: boolean;

  @Input()
  get dense(): boolean { return this._dense; }
  set dense(value: boolean) {
    this.setDense(value);
  }
  private _dense: boolean;

  @Input()
  get helperText(): MdcTextFieldHelperText { return this._helperText; }
  set helperText(helperText: MdcTextFieldHelperText) {
    this.setHelperText(helperText);
  }
  private _helperText: MdcTextFieldHelperText;

  /** The input element's value. */
  @Input()
  get value(): any { return this._value; }
  set value(value: any) {
    this.setValue(value);
  }
  protected _value: string;

  get valid(): boolean {
    return this._useCustomValidity ? this._foundation.isValid() : this.inputText.nativeElement.validity.valid;
  }

  /** Whether the control is empty. */
  get empty(): boolean {
    return !this.inputText.nativeElement.value && !this.isBadInput();
  }

  @HostBinding('class.mdc-text-field--box') get classBox(): string {
    return this.box ? 'mdc-text-field--box' : '';
  }
  @HostBinding('class.mdc-text-field--dense') get classDense(): string {
    return this.dense ? 'mdc-text-field--dense' : '';
  }
  @HostBinding('class.mdc-text-field--fullwidth') get classFullwidth(): string {
    return this.fullwidth ? 'mdc-text-field--fullwidth' : '';
  }
  @HostBinding('class.mdc-text-field--focused') get classFocused(): string {
    return this._focused ? 'mdc-text-field--focused' : '';
  }
  @HostBinding('class.mdc-text-field--outlined') get classOutlined(): string {
    return this.outline ? 'mdc-text-field--outlined' : '';
  }

  private _mdcAdapter: MDCTextFieldAdapter = {
    addClass: (className: string) => this._renderer.addClass(this._getHostElement(), className),
    removeClass: (className: string) => this._renderer.removeClass(this._getHostElement(), className),
    hasClass: (className: string) => this._getHostElement().classList.contains(className),
    registerTextFieldInteractionHandler: (evtType: string, handler: EventListener) =>
      this._registry.listen(evtType, handler, this._getHostElement()),
    deregisterTextFieldInteractionHandler: (evtType: string, handler: EventListener) =>
      this._registry.unlisten(evtType, handler),
    registerInputInteractionHandler: (evtType: string, handler: EventListener) =>
      this._registry.listen(evtType, handler, this.inputText.nativeElement),
    deregisterInputInteractionHandler: (evtType: string, handler: EventListener) => this._registry.unlisten(evtType, handler),
    isFocused: () => this._focused,
    isRtl: () => this.direction === 'rtl',
    activateLineRipple: () => {
      if (this.lineRipple) {
        this.lineRipple.activate();
      }
    },
    deactivateLineRipple: () => {
      if (this.lineRipple) {
        this.lineRipple.deactivate();
      }
    },
    setLineRippleTransformOrigin: (normalizedX: number) => {
      if (this.lineRipple) {
        this.lineRipple.setRippleCenter(normalizedX);
      }
    },
    shakeLabel: (shouldShake: boolean) => this.floatingLabel.shake(shouldShake),
    floatLabel: (shouldFloat: boolean) => this.floatingLabel.float(shouldFloat),
    hasLabel: () => !!this.floatingLabel,
    getLabelWidth: () => this.floatingLabel.getWidth(),
    hasOutline: () => this.outline,
    notchOutline: (notchWidth: number, isRtl: boolean) => this.outlined.notch(notchWidth, isRtl),
    closeOutline: () => this.outlined.closeNotch(),
    registerValidationAttributeChangeHandler: (handler: (whitelist: Array<string>) => void) => {
      const getAttributesList = (mutationsList) => mutationsList.map((mutation) => mutation.attributeName);
      const observer = new MutationObserver((mutationsList) => handler(getAttributesList(mutationsList)));
      return observer.observe(this.inputText.nativeElement, { attributes: true });
    },
    deregisterValidationAttributeChangeHandler: (observer: MutationObserver) => {
      if (observer) {
        observer.disconnect();
      }
    },
    getNativeInput: () => this.inputText.nativeElement
  };

  /** Returns a map of all subcomponents to subfoundations. */
  private _getFoundationMap() {
    return {
      helperText: this._helperText ? this.helperText.foundation : undefined,
      icon: this._hasIcons() ? this.icons.first.foundation : undefined
    };
  }

  private _mdcIconAdapter: MDCTextFieldIconAdapter = {
    getAttr: (attr: string) => this.icons.first.elementRef.nativeElement.getAttribute(attr),
    setAttr: (attr: string, value: string) => this.icons.first.elementRef.nativeElement.setAttribute(attr, value),
    removeAttr: (attr: string) => this.icons.first.elementRef.nativeElement.removeAttribute(attr),
    setContent: (content: string) => this.icons.first.elementRef.nativeElement.textContent = content,
    registerInteractionHandler: (evtType: string, handler: EventListener) =>
      this._registry.listen(evtType, handler, this.icons.first.elementRef.nativeElement),
    deregisterInteractionHandler: (evtType: string, handler: EventListener) => this._registry.unlisten(evtType, handler),
    notifyIconAction: () => this.iconAction.emit(true)
  };

  private _foundation: {
    init(): void,
    destroy(): void,
    isDisabled(): boolean,
    setDisabled(disabled: boolean): void,
    setValid(isValid: boolean): void,
    setValue(value: any): void,
    activateFocus(): void,
    deactivateFocus(): void,
    isValid(): boolean,
    setHelperTextContent(content: string): void,
    notchOutline(openNotch: boolean): void,
    getValue(): any,
    shouldFloat: boolean,
    shouldShake: boolean,
    setIconAriaLabel(label: string): void,
    setIconContent(content: string): void
  } = new MDCTextFieldFoundation(this._mdcAdapter);

  private _iconFoundation: {
    init(): void,
    destroy(): void,
    setDisabled(disabled: boolean): void,
    handleInteraction(evt: any): void,
    setContent(content: string): void,
    setAriaLabel(label: string): void
  };

  /** View -> model callback called when value changes */
  _onChange: (value: any) => void = () => { };

  /** View -> model callback called when text field has been touched */
  _onTouched = () => { };

  constructor(
    protected _changeDetectorRef: ChangeDetectorRef,
    protected _renderer: Renderer2,
    public elementRef: ElementRef,
    protected _ripple: MdcRipple,
    protected _registry: EventRegistry) {

    // Force setter to be called in case id was not specified.
    this.id = this.id;
  }

  ngAfterViewInit(): void {
    if (this.outline && this.outlined) {
      this.outlined.outlineIdle = this.outlineIdle;
      this._foundation.notchOutline(this.shouldFloat());
    }
  }

  ngAfterContentInit(): void {
    this._foundation = new MDCTextFieldFoundation(this._mdcAdapter, this._getFoundationMap());
    this._foundation.init();

    this.icons.changes.pipe(startWith(null), takeUntil(this._destroy)).subscribe(() => {
      Promise.resolve().then(() => {
        this.icons.forEach(icon => {
          this._renderer.addClass(icon.elementRef.nativeElement, 'mdc-text-field__icon');
          if (icon.isLeading() || icon.isTrailing()) {
            this._iconFoundation = new MDCTextFieldIconFoundation(this._mdcIconAdapter);
            icon.foundation = this._iconFoundation;
          }
        });

        this.updateIconState();
        this.writeValue(this._value);
        this._changeDetectorRef.detectChanges();
      });
    });
  }

  ngOnDestroy(): void {
    if (this._hasIcons()) {
      this.icons.forEach(icon => {
        icon.foundation.destroy();
      });
    }
    this._ripple.destroy();
    this._foundation.destroy();
  }

  writeValue(value: any): void {
    this.setValue(value == null ? '' : value, false);
    this._changeDetectorRef.markForCheck();
  }

  shouldFloat(): boolean {
    return this._foundation.shouldFloat;
  }

  registerOnChange(fn: (value: any) => any): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => any): void {
    this._onTouched = fn;
  }

  onInput(value: any): void {
    this.setValue(value);
  }

  onFocus(): void {
    this._focused = true;
  }

  onBlur(): void {
    this._focused = false;
    this._onTouched();
    this.blur.emit(this.value);

    this._changeDetectorRef.markForCheck();
  }

  isDisabled(): boolean {
    return this._foundation.isDisabled();
  }

  isBadInput(): boolean {
    const validity = this.inputText.nativeElement.validity;
    return validity && validity.badInput;
  }

  focus(): void {
    if (!this.disabled) {
      this._focused = true;
      this.inputText.nativeElement.focus();
    }
  }

  setValid(isValid: boolean): void {
    this._useCustomValidity = true;
    this._foundation.setValid(isValid);
  }

  isTextarea(): boolean {
    const nativeElement = this._getHostElement();
    const nodeName = isBrowser ? nativeElement.nodeName : nativeElement.name;

    return nodeName ? nodeName.toLowerCase() === 'textarea' : false;
  }

  /** Sets the text-field required or not. */
  setRequired(required: boolean): void {
    this._required = required;
    this._changeDetectorRef.markForCheck();
  }

  setValue(value: any, isUserInput: boolean = true): void {
    this._value = (this.type === 'number') ?
      (value === '' ? null : toNumber(value)) : value;

    this._foundation.setValue(this.value);
    if (isUserInput) {
      this._onChange(this.value);
    }

    if (this.required && !this.value) {
      this.setRequired(false);
      setTimeout(() => this.setRequired(true));
    }

    this._changeDetectorRef.markForCheck();
  }

  /** Styles the text field as a box text field. */
  setBox(box: boolean): void {
    this._box = toBoolean(box);
    if (this._outline && this._box) {
      this._outline = false;
    }
    this._box ? this._ripple.attachTo(this._getHostElement(), false,
      this.inputText.nativeElement) : this._ripple.destroy();

    this._changeDetectorRef.markForCheck();
  }

  /** Styles the text field as an outlined text field. */
  setOutline(outline: boolean): void {
    this._outline = toBoolean(outline);
    if (this._outline && this._box) {
      this._box = false;
    }

    this._changeDetectorRef.markForCheck();
  }

  /** Styles the text field as a fullwidth text field. */
  setFullwidth(fullwidth: boolean): void {
    this._fullwidth = toBoolean(fullwidth);
    this.placeholder = this.fullwidth ? this.label : '';

    this._changeDetectorRef.markForCheck();
  }

  setDense(dense: boolean): void {
    this._dense = toBoolean(dense);
    this._changeDetectorRef.markForCheck();
  }

  setDisabled(disabled: boolean): void {
    this.setDisabledState(disabled);
  }

  setHelperText(helperText: MdcTextFieldHelperText): void {
    this._helperText = helperText;
    this._changeDetectorRef.markForCheck();
  }

  /** True if the Text Field is required. */
  isRequired(): boolean {
    return this.required;
  }

  selectAll(): void {
    this.inputText.nativeElement.select();
  }

  /** The value of the input Element. */
  getValue(): string {
    return this._foundation.getValue();
  }

  /** Deactives the Text Field's focus state. */
  deactivateFocus(): void {
    this._foundation.deactivateFocus();
  }

  /** Activates the text field focus state. */
  activateFocus(): void {
    this._foundation.activateFocus();
  }

  /** Sets the content of the helper text. */
  setHelperTextContent(content: string): void {
    this._foundation.setHelperTextContent(content);
  }

  setIconAriaLabel(label: string): void {
    this._iconFoundation.setAriaLabel(label);
  }

  setIconContent(content: string): void {
    this._iconFoundation.setContent(content);
  }

  updateIconState(): void {
    if (this.icons.find(_ => _.isLeading())) {
      this._renderer.addClass(this._getHostElement(), 'mdc-text-field--with-leading-icon');
    } else if (this.icons.find(_ => _.isTrailing())) {
      this._renderer.addClass(this._getHostElement(), 'mdc-text-field--with-trailing-icon');
    }
  }

  getLeadingIcon(): MdcIcon | undefined {
    return this.icons.find((_: MdcIcon) => _.isLeading());
  }

  getTrailingIcon(): MdcIcon | undefined {
    return this.icons.find((_: MdcIcon) => _.isTrailing());
  }

  private _hasIcons(): boolean {
    return this.icons && this.icons.length > 0;
  }

  // Implemented as part of ControlValueAccessor.
  setDisabledState(isDisabled: boolean) {
    this._disabled = isDisabled;
    this._foundation.setDisabled(isDisabled);

    if (this.focused) {
      this.focused = false;
    }
    if (this._hasIcons()) {
      // Reset the clickable state of mdc-icon
      this.icons.first.clickable = this.icons.first.clickable;
    }

    this._changeDetectorRef.markForCheck();
  }

  hasClass(className: string): boolean {
    return this._getHostElement().classList.contains(className);
  }

  /** Retrieves the DOM element of the component host. */
  private _getHostElement() {
    return this.elementRef.nativeElement;
  }

  /** Make sure the input is a supported type. */
  protected _validateType() {
    if (MDC_INPUT_INVALID_TYPES.indexOf(this._type) > -1) {
      throw Error(`Input type "${this._type}" is not supported.`);
    }
  }
}
