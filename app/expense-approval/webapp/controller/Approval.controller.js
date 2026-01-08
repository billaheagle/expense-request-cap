sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/TextArea",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
  ],
  function (
    Controller,
    MessageBox,
    Dialog,
    Button,
    TextArea,
    Filter,
    FilterOperator
  ) {
    "use strict";

    return Controller.extend("expenseapproval.controller.Approval", {
      onInit() { },

      onPageApprovalExpenseNavButtonPress() {
        this.getOwnerComponent().getRouter().navTo("home");
      },

      onSearchFieldApprovalSearch(oEvent) {
        const sQuery = oEvent.getParameter("query");
        const aFilters = [];

        if (sQuery && sQuery.length > 0) {
          aFilters.push(
            new Filter({
              filters: [
                new Filter("RequestNumber", FilterOperator.Contains, sQuery),
                new Filter("Notes", FilterOperator.Contains, sQuery),
              ],
              and: false,
            })
          );
        }

        const oTable = this.byId("idExpenseRequestsSubmittedRequestsTable");
        const oBinding = oTable.getBinding("items");
        oBinding.filter(aFilters);
      },

      async onButtonApprovePress(oEvent) {
        /** @type {sap.ui.model.odata.v4.Context} */
        const oContext = oEvent.getSource().getBindingContext();
        if (!oContext) {
          return;
        }
        const oModel = this.getView().getModel();

        const oAction = oModel.bindContext("ExpenseService.approve(...)", oContext);

        try {
          await oAction.execute();
          MessageBox.success(
            this.getView().getModel("i18n").getResourceBundle().getText("approvalSuccessApprove")
          );
        } catch (oError) {
          MessageBox.error(oError.message);
        }
      },

      onButtonRejectPress(oEvent) {
        /** @type {sap.ui.model.odata.v4.Context} */
        const oContext = oEvent.getSource().getBindingContext();
        if (!oContext) {
          return;
        }
        this._oSelectedContext = oContext;
        const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();

        if (!this._oRejectDialog) {
          this._oTextArea = new TextArea({
            width: "100%",
            placeholder: oResourceBundle.getText("approvalPlaceholderComment"),
          });

          this._oRejectDialog = new Dialog({
            title: oResourceBundle.getText("approvalBtnReject"),
            type: "Message",
            content: this._oTextArea,
            beginButton: new Button({
              type: "Emphasized",
              text: oResourceBundle.getText("approvalBtnReject"),
              press: async () => {
                const sComment = this._oTextArea.getValue();
                const oModel = this.getView().getModel();
                const oAction = oModel.bindContext(
                  "ExpenseService.reject(...)",
                  this._oSelectedContext
                );
                oAction.setParameter("Comments", sComment);

                try {
                  await oAction.execute();
                  this._oRejectDialog.close();
                  MessageBox.success(oResourceBundle.getText("approvalSuccessReject"));
                } catch (oError) {
                  MessageBox.error(oError.message);
                }
              },
            }),
            endButton: new Button({
              text: "Cancel",
              press: () => {
                this._oRejectDialog.close();
              },
            }),
            afterClose: () => {
              this._oTextArea.setValue("");
            },
          });
          this.getView().addDependent(this._oRejectDialog);
        }

        this._oRejectDialog.open();
      },

      formatDate(sValue) {
        if (!sValue) {
          return "";
        }
        const oDate = new Date(sValue);
        const day = String(oDate.getDate()).padStart(2, "0");
        const month = String(oDate.getMonth() + 1).padStart(2, "0");
        const year = oDate.getFullYear();
        return `${day}/${month}/${year}`;
      },
    });
  }
);
