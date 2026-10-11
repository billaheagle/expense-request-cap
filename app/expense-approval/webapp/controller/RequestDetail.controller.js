sap.ui.define([
  "expenseapproval/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "expenseapproval/model/formatter",
  "sap/m/MessageBox"
],
  /**
   * @param   {typeof import("expenseapproval/controller/BaseController").default} BaseController
   * @param   {typeof import("sap/ui/model/json/JSONModel").default} JSONModel
   * @param   {typeof import("expenseapproval/model/formatter").default} formatter
   * @param   {typeof import("sap/m/MessageBox").default} MessageBox
   */
  function (BaseController, JSONModel, formatter, MessageBox) {
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
        this._sId = oEvent.getParameter("arguments").ID;
        this._clearForm();

        try {
          const oData = await this._loadRequest();
          this._fillForm(oData);
        } catch (oError) {
          this.showError(oError.message);
        }
      },

      _loadRequest() {
        const oBinding = this.getModel().bindContext(
          `/ExpenseRequests(ID=${this._sId},IsActiveEntity=true)`,
          null,
          { $expand: "ExpenseItems,ExpenseApprovals" },
        );
        return oBinding.requestObject();
      },

      _fillForm(oData) {
        let sReason = '';
        for (const oExpenseApproval of oData.ExpenseApprovals) {
          if (oExpenseApproval.Decision === 'Rejected') sReason = oExpenseApproval.Reason;
        }

        this.getModel("header").setData({
          RequestNumber: oData.RequestNumber,
          Currency: oData.Currency_code,
          ExpenseNotes: oData.Notes,
          Status: oData.Status,
          Reason: sReason,
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

      _actionPath(sAction) {
        return `/ExpenseRequests(ID=${this._sId},IsActiveEntity=true)/ExpenseService.${sAction}(...)`;
      },

      async onApproveButtonPress(oEvent) {
        if (!this._sId) return;

        MessageBox.confirm(this.getText("messageConfirmApprove"), {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: async (sAction) => {
            if (sAction !== MessageBox.Action.OK) return;
            try {
              await this.executeAction(this._actionPath("approve"));

              MessageBox.success(this.getText("messageSuccessApprove"), {
                onClose: () => {
                  this.onPageRequestDetailNavButtonPress();
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
        this._clearDeclineForm();
        this._oDeclineDialog.close();
      },

      async onDeclineButtonPress(oEvent) {
        await this._loadDeclineDialog();

        const oDecline = this._getInitialDecline();
        const oDeclineModel = new JSONModel(oDecline);
        this.setModel(oDeclineModel, 'decline');
        this._oDeclineDialog.open();
      },

      _clearDeclineForm() {
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

        MessageBox.confirm(this.getText("messageConfirmDecline"), {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: async (sAction) => {
            if (sAction !== MessageBox.Action.OK) return;
            try {
              await this.executeAction(this._actionPath("decline"), undefined, { Reason: oDecline.Reason });
              this._oDeclineDialog.close();
              this._clearDeclineForm();

              MessageBox.success(this.getText("messageSuccessDecline"), {
                onClose: () => {
                  this.onPageRequestDetailNavButtonPress();
                }
              });
            } catch (oError) {
              this.showError(oError.message)
            }
          },
        });

      },

      async onReimburseButtonPress() {
        if (!this._sId) return;

        MessageBox.confirm(this.getText("messageConfirmReimburse"), {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: async (sAction) => {
            if (sAction !== MessageBox.Action.OK) return;
            try {
              await this.executeAction(this._actionPath("reimburse"));

              MessageBox.success(this.getText("messageSuccessReimburse"), {
                onClose: () => {
                  this.onPageRequestDetailNavButtonPress();
                }
              });
            } catch (oError) {
              this.showError(oError.message)
            }
          },
        });
      },

      onEditButtonPress() {
        if (!this._sId) return;
        this.navTo("request", { ID: this._sId });
      },

      async _deleteRequest() {
        const oBinding = this.getModel().bindContext(
          `/ExpenseRequests(ID=${this._sId},IsActiveEntity=true)`
        );
        await oBinding.requestObject();
        await oBinding.getBoundContext().delete();
      },

      async onDeleteButtonPress(oEvent) {
        if (!this._sId) return;

        MessageBox.confirm(this.getText("messageConfirmDelete"), {
          actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.DELETE,
          onClose: async (sAction) => {
            if (sAction !== MessageBox.Action.DELETE) return;
            try {
              await this._deleteRequest();

              MessageBox.success(this.getText("messageSuccessDeleteDraft"), {
                onClose: () => {
                  this.onPageRequestDetailNavButtonPress();
                }
              });
            } catch (oError) {
              this.showError(oError.message)
            }
          },
        });
      }
    });
  }
);