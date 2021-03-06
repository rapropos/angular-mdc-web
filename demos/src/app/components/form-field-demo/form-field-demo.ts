import { Component, OnInit, ViewChild } from '@angular/core';

import { ComponentViewer, ComponentView } from '../../shared/component-viewer';

@Component({ template: '<component-viewer></component-viewer>' })
export class FormFieldDemo implements OnInit {
  @ViewChild(ComponentViewer, {static: true}) _componentViewer: ComponentViewer;

  ngOnInit(): void {
    this._componentViewer.componentView = new ComponentView(
      'Form Fields',
      `MDC Form Field aligns an MDC Web form field (for example, a checkbox)
      with its label and makes it RTL-aware. It also activates a ripple effect
      upon interacting with the label.`,
      "import { MdcFormFieldModule } from '@angular-mdc/web';",
      [{
        label: 'Api',
        route: './api'
      }, {
        label: 'Examples',
        route: './examples'
      }]);

    this._componentViewer.componentView.references = [{
      name: 'Material Components Web',
      url: 'https://github.com/material-components/material-components-web/blob/master/packages/mdc-form-field/README.md'
    }];
  }
}

@Component({ templateUrl: './api.html' })
export class Api { }

@Component({ templateUrl: './examples.html' })
export class Examples {
  example1 = {
    html: `<mdc-form-field fluid>
  <mdc-text-field label="First name" outlined required></mdc-text-field>
  <mdc-helper-text persistent validation>*Required</mdc-helper-text>
</mdc-form-field>`
  };

  example2 = {
    html: `<mdc-form-field>
  <mdc-checkbox></mdc-checkbox>
  <label>Checkbox</label>
</mdc-form-field>`
  };

  example3 = {
    html: `<mdc-form-field>
  <mdc-radio></mdc-radio>
  <label>Radio</label>
</mdc-form-field>`
  };

  example4 = {
    html: `<mdc-form-field>
  <mdc-switch></mdc-switch>
  <label>off/on</label>
</mdc-form-field>`
  };
}
