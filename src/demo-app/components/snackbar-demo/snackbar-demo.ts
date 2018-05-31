import { Component } from '@angular/core';

import { MdcSnackbar } from '@angular-mdc/web';

@Component({
  selector: 'snackbar-demo',
  templateUrl: './snackbar-demo.html',
})
export class SnackbarDemo {
  message = 'Message sent';
  action = 'Undo';
  multiline = false;
  dismissOnAction: boolean = true;
  alignStart: boolean;
  focusAction = false;
  actionOnBottom = false;

  constructor(public snackbar: MdcSnackbar) { }

  show() {
    const snackbarRef = this.snackbar.show(this.message, this.action, {
      align: this.alignStart ? 'start' : '',
      multiline: this.multiline,
      dismissOnAction: this.dismissOnAction,
      focusAction: this.focusAction,
      actionOnBottom: this.actionOnBottom,
    });

    snackbarRef.afterDismiss().subscribe(() => {
      console.log('The snack-bar was dismissed');
    });

    snackbarRef.afterOpen().subscribe(() => {
      console.log('The snack-bar was opened');
    });
  }
}
