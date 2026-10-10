sap.ui.define(
  [
    "expenseapproval/controller/BaseController",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/TextArea",
    "expenseapproval/model/formatter"
  ],
  /**
   * @param   {typeof import("expenseapproval/controller/BaseController").default} BaseController
   * @param   {typeof import("sap/m/MessageBox").default} MessageBox
   * @param   {typeof import("sap/m/Dialog").default} Dialog
   * @param   {typeof import("sap/m/Button").default} Button
   * @param   {typeof import("sap/m/TextArea").default} TextArea
   * @param   {typeof import("expenseapproval/model/formatter").default} formatter
   */
  (
    BaseController,
    MessageBox,
    Dialog,
    Button,
    TextArea,
    formatter
  ) => {
    "use strict";

    return BaseController.extend("expenseapproval.controller.Approval", {
      onInit() { },

      onPageApprovalExpenseNavButtonPress() {
        this.navTo("home");
      },

      onSearchFieldApprovalSearch(oEvent) {
        const sQuery = oEvent.getParameter("query");
        const aPaths = ["RequestNumber", "Notes"];
        const aFilters = this.createSearchFilter(sQuery, aPaths);
        const oTable = this.byId("idExpenseRequestsSubmittedRequestsTable");
        const oBinding = oTable.getBinding("items");
        oBinding.filter(aFilters);
      },

      async onButtonApprovePress(oEvent) {
        const oContext = oEvent.getSource().getBindingContext();
        if (!oContext) return;

        try {
          await this.executeAction("ExpenseService.approve(...)", oContext);
          const oTable = this.byId("idExpenseRequestsSubmittedRequestsTable");
          const oBinding = oTable.getBinding("items");
          oBinding.refresh();
          MessageBox.success(
            this.getText("approvalSuccessApprove")
          );
        } catch (oError) {
          this.showError(oError.message);
        }
      },

      onButtonRejectPress(oEvent) {
        const oContext = oEvent.getSource().getBindingContext();
        if (!oContext) return;

        this._oSelectedContext = oContext;

        if (!this._oRejectDialog) {
          this._oTextArea = new TextArea({
            width: "100%",
            placeholder: this.getText("approvalPlaceholderComment")
          });

          this._oRejectDialog = new Dialog({
            title: this.getText("approvalBtnReject"),
            type: "Message",
            content: this._oTextArea,
            beginButton: new Button({
              type: "Emphasized",
              text: this.getText("approvalBtnReject"),
              press: async () => {
                const sComment = this._oTextArea.getValue();
                const mParams = {
                  Comments: sComment
                }

                try {
                  await this.executeAction("ExpenseService.decline(...)", this._oSelectedContext, mParams);
                  const oTable = this.byId("idExpenseRequestsSubmittedRequestsTable");
                  const oBinding = oTable.getBinding("items");
                  oBinding.refresh();
                  this._oRejectDialog.close();
                  MessageBox.success(this.getText("approvalSuccessReject"));
                } catch (oError) {
                  this.showError(oError.message);
                }
              },
            }),
            endButton: new Button({
              text: this.getText("approvalBtnCancel"),
              press: () => {
                this._oRejectDialog.close();
              },
            }),
            afterClose: () => {
              this._oTextArea.setValue("");
            },
          });
          this.addDependent(this._oRejectDialog);
        }

        this._oRejectDialog.open();
      },

      formatDate(sValue) {
        return formatter.formatDate(sValue);
      },
    });
  }
);
