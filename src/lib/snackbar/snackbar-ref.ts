import { Observable, Subject } from 'rxjs';

import { MdcSnackbarComponent } from './snackbar.component';

/**
 * Reference to a snackbar dispatched from the snackbar service.
 */
export class MdcSnackbarRef<T> {
  /** The instance of the component making up the content of the snackbar. */
  instance: T;
  componentInstance: MdcSnackbarComponent;

  constructor(component: MdcSnackbarComponent) {
    this.componentInstance = component;
  }

  /** Subject for notifying the user that the snackbar has been dismissed. */
  private readonly _afterDismiss = new Subject<void>();

  /** Subject for notifying the user that the snackbar has opened and appeared. */
  private readonly _afterOpen = new Subject<void>();

  /** Gets an observable that is notified when the snackbar is finished closing. */
  afterDismiss(): Observable<void> {
    return this._afterDismiss.asObservable();
  }

  /** Gets an observable that is notified when the snackbar has opened and appeared. */
  afterOpen(): Observable<void> {
    return this._afterOpen.asObservable();
  }

  open(): void {
    this.componentInstance.show();

    this._afterOpen.next();
    this._afterOpen.complete();
  }

  dismiss(): void {
    this._afterDismiss.next();
    this._afterDismiss.complete();
  }
}
