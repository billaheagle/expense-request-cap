sap.ui.define(
  [
    "expenseapproval/controller/BaseController",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "expenseapproval/model/formatter"
  ],
  /**
   * @param   {typeof import("expenseapproval/controller/BaseController").default} BaseController
   * @param   {typeof import("sap/m/MessageBox").default} MessageBox
   * @param   {typeof import("sap/ui/model/json/JSONModel").default} JSONModel
   * @param   {typeof import("expenseapproval/model/formatter").default} formatter
   */
  (
    BaseController,
    MessageBox,
    JSONModel,
    formatter
  ) => {
    "use strict";

    return BaseController.extend("expenseapproval.controller.Approval", {
      onInit() {
        this.getRouter()
          .getRoute("approval")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      _onRouteMatched() {
        const oTable = this.byId("idExpenseRequestsSubmittedRequestsTable");
        oTable?.getBinding("items")?.refresh();
      },

      _getInitialDecline() {
        return {
          Reason: "",
        }
      },

      onPageApprovalExpenseNavButtonPress() {
        this.onNavBack();
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
          MessageBox.success(
            this.getText("approvalSuccessApprove"), {
            onClose: () => {
              oBinding.refresh();
            }
          }
          );
        } catch (oError) {
          this.showError(oError.message);
        }
      },

      async _loadDeclineDialog() {
        if (!this._oDeclineDialog) {
          this._oDeclineDialog = await this.loadFragment({
            name: "expenseapproval.view.fragments.DeclineDialog"
          });
        }
      },

      _validateDecline() {
        const oDeclineModel = this.getModel("decline");
        const oDecline = oDeclineModel.getData();

        oDecline._ReasonState = (oDecline.Reason) ? "None" : "Error";
        oDecline._isValid = Boolean(oDecline.Reason);

        oDeclineModel.refresh();
      },

      onReasonInputLiveChange() {
        this._validateDecline();
      },

      onCancelButtonDeclineDialogPress() {
        this._clearForm();
        this._oDeclineDialog.close();
      },

      async onButtonDeclinePress(oEvent) {
        this._oDeclineContext = oEvent.getSource().getBindingContext();
        await this._loadDeclineDialog();

        const oDecline = this._getInitialDecline();
        const oDeclineModel = new JSONModel(oDecline);
        this.setModel(oDeclineModel, 'decline');
        this._oDeclineDialog.open();
      },

      _clearForm() {
        const oDecline = this._getInitialDecline();
        const oDeclineModel = this.getModel("decline");
        oDeclineModel.setData(oDecline);
      },

      async onDeclineButtonDeclineDialogPress() {
        const oDeclineModel = this.getModel("decline")
        const oDecline = oDeclineModel.getData();

        const mParams = {
          Reason: oDecline.Reason
        }

        try {
          await this.executeAction("ExpenseService.decline(...)", this._oDeclineContext, mParams);
          const oTable = this.byId("idExpenseRequestsSubmittedRequestsTable");
          const oBinding = oTable.getBinding("items");
          this._oDeclineDialog.close();
          this._clearForm();

          MessageBox.success(this.getText("approvalSuccessDecline"), {
            onClose: () => {
              oBinding.refresh();
            }
          });
        } catch (oError) {
          this.showError(oError.message);
        }

      },

      formatDateTime(sValue) {
        return formatter.formatDateTime(sValue);
      },
    });
  }
);
