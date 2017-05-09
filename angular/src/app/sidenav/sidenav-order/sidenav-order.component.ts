import { SidenavService } from '../shared/sidenav.service';
import { PriceCalculatorService } from '../shared/price-calculator.service';
import { MdDialog, MdDialogRef, MdSnackBar } from '@angular/material';
import { CommentDialogComponent } from '../comment-dialog/comment-dialog.component';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { TdDialogService } from '@covalent/core';
import { ExtraView, OrderView } from '../../shared/models/interfaces';
import * as _ from 'lodash';

@Component({
  selector: 'public-sidenav-order',
  templateUrl: './sidenav-order.component.html',
  styleUrls: ['./sidenav-order.component.scss'],
})
export class SidenavOrderComponent implements OnInit {

  @Input('order') order: OrderView;
  @Output('removeOrder') removeEmitter: EventEmitter<any> = new EventEmitter();
  ingredients: string[] = [];

  constructor(private sidenav: SidenavService,
              public snackBar: MdSnackBar,
              public dialog: MdDialog,
              private _dialogService: TdDialogService,
              private calculator: PriceCalculatorService,
  ) {}

  ngOnInit(): void {
    this.ingredients = _.filter(this.order.options, (extra: ExtraView) => extra.selected);
  }

  removeComment(): void {
    this.order.comment = undefined;
  }

  addComment(): void {
    let dialogRef: MdDialogRef<CommentDialogComponent> = this.dialog.open(CommentDialogComponent);
    dialogRef.afterClosed().subscribe((result: string) => {
      this.order.comment = result;
    });
  }

  increaseOrder(): void {
    this.sidenav.increaseOrder(this.order);
  }

  decreaseOrder(): void {
    this.sidenav.decreaseOrder(this.order);
    if (this.order.number < 1) {
      this.removeEmitter.emit();
    }
  }

  removeOrder(): void {
    this.sidenav.removeOrder(this.order);
    this.removeEmitter.emit();
  }

  calculateOrderPrice(): number {
    return this.calculator.getPrice(this.order);
  }

  openCommentDialog(): void {
    this._dialogService.openAlert({
      message: this.order.comment,
      title: 'Comment',
      closeButton: 'Close',
    });
  }

}