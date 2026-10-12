sap.ui.define(
  [
    "expenseapproval/controller/BaseController",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType",
    "expenseapproval/model/formatter"
  ],
  /**
   * @param   {typeof import("expenseapproval/controller/BaseController").default} BaseController
   * @param   {typeof import("sap/m/MessageBox").default} MessageBox
   * @param   {typeof import("sap/ui/model/json/JSONModel").default} JSONModel
   * @param   {typeof import("sap/ui/model/Filter").default} Filter
   * @param   {typeof import("sap/ui/model/FilterOperator").default} FilterOperator
   * @param   {typeof import("sap/ui/model/FilterType").default} FilterType
   * @param   {typeof import("expenseapproval/model/formatter").default} formatter
   */
  (
    BaseController,
    MessageBox,
    JSONModel,
    Filter,
    FilterOperator,
    FilterType,
    formatter
  ) => {
    "use strict";

    return BaseController.extend("expenseapproval.controller.Approval", {
      onInit() {
        this.getRouter()
          .getRoute("approval")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      _getUserId() {
        const oUserModel = this.getModel("user");
        const sId = oUserModel.getProperty("/ID");
        if (sId) return Promise.resolve(sId);

        return new Promise((resolve) => {
          const oBinding = oUserModel.bindProperty("/ID");
          oBinding.attachChange(() => {
            const sNewId = oBinding.getValue();
            if (!sNewId) return;
            oBinding.destroy();
            resolve(sNewId);
          });
        });
      },

      async _onRouteMatched() {
        const oBinding = this.byId("idExpenseRequestsSubmittedRequestsTable")?.getBinding("items");
        if (!oBinding) return;

        const sUserId = await this._getUserId();
        oBinding.filter(new Filter("CurrentApprover/Email", FilterOperator.EQ, sUserId), FilterType.Application);

        if (oBinding.isSuspended()) oBinding.resume();
        else oBinding.refresh();
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
        oBinding.filter(aFilters, FilterType.Control);
      },

      async onRefreshButtonPress() {
        await this._onRouteMatched();
      },

      async onButtonApprovePress(oEvent) {
        const oContext = oEvent.getSource().getBindingContext();
        if (!oContext) return;

        MessageBox.confirm(this.getText("messageConfirmApprove"), {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: async (sAction) => {
            if (sAction !== MessageBox.Action.OK) return;
            try {
              await this.executeAction("ExpenseService.approve(...)", oContext);

              MessageBox.success(this.getText("messageSuccessApprove"), {
                onClose: () => {
                  await this._onRouteMatched();
                }
              });
            } catch (oError) {
              this.showError(oError.message)
            }
          },
        });
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
        if (!this._oDeclineContext) return;

        const oDeclineModel = this.getModel("decline")
        const oDecline = oDeclineModel.getData();

        const mParams = {
          Reason: oDecline.Reason
        }

        MessageBox.confirm(this.getText("messageConfirmDecline"), {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: async (sAction) => {
            if (sAction !== MessageBox.Action.OK) return;
            try {
              await this.executeAction("ExpenseService.decline(...)", this._oDeclineContext, mParams);
              this._oDeclineDialog.close();
              this._clearForm();

              MessageBox.success(this.getText("messageSuccessDecline"), {
                onClose: () => {
                  await this._onRouteMatched();
                }
              });
            } catch (oError) {
              this.showError(oError.message)
            }
          },
        });
      },

      formatDateTime(sValue) {
        return formatter.formatDateTime(sValue);
      },
    });
  }
);
