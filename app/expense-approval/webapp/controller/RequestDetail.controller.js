sap.ui.define([
  "expenseapproval/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "expenseapproval/model/formatter"
],
  /**
   * @param   {typeof import("expenseapproval/controller/BaseController").default} BaseController
   * @param   {typeof import("sap/ui/model/json/JSONModel").default} JSONModel
   * @param   {typeof import("expenseapproval/model/formatter").default} formatter
   */
  function (BaseController, JSONModel, formatter) {
    "use strict";

    return BaseController.extend("expenseapproval.controller.RequestDetail", {
      onInit() {
        this.setModel(new JSONModel({}), "header");
        this.setModel(new JSONModel({ items: [] }), "items");

        this.getRouter()
          .getRoute("requestDetail")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      _getInitialDecline() {
        return {
          Reason: "",
        }
      },

      async _onRouteMatched(oEvent) {
        const sId = oEvent.getParameter("arguments").ID;
        this._clearForm();

        try {
          const oData = await this._loadRequest(sId);
          this._fillForm(oData);
        } catch (oError) {
          this.showError(oError.message);
        }
      },

      _loadRequest(sId) {
        const oBinding = this.getModel().bindContext(
          `/ExpenseRequests(ID=${sId},IsActiveEntity=true)`,
          null,
          { $expand: "ExpenseItems" }
        );
        return oBinding.requestObject();
      },

      _fillForm(oData) {
        this.getModel("header").setData({
          RequestNumber: oData.RequestNumber,
          Status: oData.Status,
          Currency: oData.Currency_code,
          ExpenseNotes: oData.Notes
        });

        this.getModel("items").setData({
          items: (oData.ExpenseItems ?? []).map(oItem => ({
            ExpenseType_Code: oItem.ExpenseType_Code,
            ExpenseDate: oItem.ExpenseDate,
            Amount: oItem.Amount,
            Description: oItem.Description
          }))
        });
      },

      _clearForm() {
        this.getModel("header").setData({});
        this.getModel("items").setData({ items: [] });
      },

      onPageRequestDetailNavButtonPress() {
        this.navTo("report");
      },

      formatDate(sValue) {
        return formatter.formatDate(sValue);
      },

      formatStatusState(sStatus) {
        return formatter.formatStatusState(sStatus);
      },

      onApproveButtonPress(oEvent) {
        const oContext = oEvent.getSource().getBindingContext();
        if (!oContext) return;

        try {
          await this.executeAction("ExpenseService.approve(...)", oContext);
          MessageBox.success(
            this.getText("approvalSuccessApprove"), {
            onClose: () => {
              this.onPageRequestDetailNavButtonPress();
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
          this._oDeclineDialog.close();
          this._clearForm();

          MessageBox.success(this.getText("approvalSuccessDecline"), {
            onClose: () => {
              this.onPageRequestDetailNavButtonPress();
            }
          });
        } catch (oError) {
          this.showError(oError.message);
        }

      },

      onReimburseButtonPress() {
        const oContext = oEvent.getSource().getBindingContext();
        if (!oContext) return;

        try {
          await this.executeAction("ExpenseService.reimburse(...)", oContext);
          MessageBox.success(
            this.getText("approvalSuccessReimburse"), {
            onClose: () => {
              this.onPageRequestDetailNavButtonPress();
            }
          }
          );
        } catch (oError) {
          this.showError(oError.message);
        }
      }
    });
  }
);