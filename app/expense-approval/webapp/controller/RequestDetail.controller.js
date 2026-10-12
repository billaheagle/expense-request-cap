sap.ui.define([
  "expenseapproval/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "expenseapproval/model/formatter",
  "expenseapproval/model/helpers",
  "sap/m/MessageBox"
],
  /**
   * @param   {typeof import("expenseapproval/controller/BaseController").default} BaseController
   * @param   {typeof import("sap/ui/model/json/JSONModel").default} JSONModel
   * @param   {typeof import("expenseapproval/model/formatter").default} formatter
   * @param   {typeof import("expenseapproval/model/formatter").helpers} helpers
   * @param   {typeof import("sap/m/MessageBox").default} MessageBox
   */
  function (BaseController, JSONModel, formatter, helpers, MessageBox) {
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
          { $expand: "ExpenseItems,ExpenseApprovals,CurrentApprover($select=Email)" },
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
          CurrentApproverEmail: oData.CurrentApprover?.Email ?? "",
          TotalAmount: oData.TotalAmount,
          TotalRequestedAmount: oData.TotalRequestedAmount,
          TotalAcceptedAmount: oData.TotalAcceptedAmount,
          Reason: sReason,
        });

        this.getModel("items").setData({
          items: (oData.ExpenseItems ?? []).map(oItem => ({
            ExpenseType_Code: oItem.ExpenseType_Code,
            ExpenseDate: oItem.ExpenseDate,
            Amount: oItem.Amount,
            Description: oItem.Description,
            Justification: oItem.Justification
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

        this.confirmAndRun({
          confirmKey: "messageConfirmApprove",
          successKey: "messageSuccessApprove",
          run: async () => await this.executeAction(this._actionPath("approve")),
          onSuccess: () => this.onPageRequestDetailNavButtonPress()
        });
      },

      async _loadDeclineDialog() {
        if (!this._oDeclineDialog) {
          this._oDeclineDialog = await this.loadDialog("DeclineDialog");
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


        this.confirmAndRun({
          confirmKey: "messageConfirmDecline",
          successKey: "messageSuccessDecline",
          run: async () => {
            await this.executeAction(this._actionPath("decline"), undefined, { Reason: oDecline.Reason });
            this._oDeclineDialog.close();
            this._clearDeclineForm();
          },
          onSuccess: () => this.onPageRequestDetailNavButtonPress()
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

        this.confirmAndRun({
          confirmKey: "messageConfirmDelete",
          successKey: "messageSuccessDeleteDraft",
          run: async () => await this._deleteRequest(),
          onSuccess: () => this.onPageRequestDetailNavButtonPress(),
          action: MessageBox.Action.DELETE
        });
      },

      _getInitialReimburse() {
        return {
          TotalRequestedAmount: 0,
          TotalAmount: 0,
          Currency: "",
          TotalAcceptedAmount: 0,
          OverMaxItems: [
            {
              Description: "",
              Amount: 0,
              MaxAmount: 0,
              Justification: ""
            }
          ]
        }
      },

      async _getDataReimburse() {
        const oHeaderModel = this.getModel("header");
        const oHeader = oHeaderModel.getData();

        const oItemsModel = this.getModel("items");
        const aItems = oItemsModel.getProperty("/items");

        const aContexts = await this.getModel("masterData")
          .bindList("/ExpenseTypes")
          .requestContexts();

        const aExpenseTypes = aContexts.map(oContext => oContext.getObject());
        const aOverMaxItems = helpers.getOverMaxItems(aItems, aExpenseTypes);

        return {
          TotalRequestedAmount: oHeader.TotalRequestedAmount,
          TotalAmount: oHeader.TotalAmount,
          Currency: oHeader.Currency_code,
          TotalAcceptedAmount: oHeader.TotalAmount,
          OverMaxItems: aOverMaxItems
        }
      },

      async _loadReimburseDialog() {
        if (!this._oReimburseDialog) {
          this._oReimburseDialog = await this.loadDialog("ReimburseDialogs");
        }
      },

      async onReimburseButtonPress() {
        await this._loadReimburseDialog();
        const oReimburse = await this._getDataReimburse();
        const oReimburseModel = new JSONModel(oReimburse);
        this.setModel(oReimburseModel, 'reimburse');
        this._validateReimburse();
        this._oReimburseDialog.open();
      },

      _validateReimburse() {
        const oReimburseModel = this.getModel("reimburse");
        const oReimburse = oReimburseModel.getData();

        const bAcceptedAmountOk = Number(oReimburse.TotalAcceptedAmount) > 0;
        oReimburse._TotalAcceptedAmountState = (bAcceptedAmountOk) ? "None" : "Error";
        oReimburse._isValid = bAcceptedAmountOk;

        oReimburseModel.refresh();
      },

      onAcceptedAmountInputLiveChange() {
        this._validateReimburse();
      },

      onCancelButtonReimburseDialogPress() {
        this._clearReimburseForm();
        this._oReimburseDialog.close();
      },

      _clearReimburseForm() {
        const oReimburse = this._getInitialReimburse();
        const oReimburseModel = this.getModel("reimburse");
        oReimburseModel.setData(oReimburse);
      },

      async onReimburseButtonReimburseDialogPress() {
        if (!this._sId) return;

        const oReimburseModel = this.getModel("reimburse");
        const oReimburse = oReimburseModel.getData();


        this.confirmAndRun({
          confirmKey: "messageConfirmReimburse",
          successKey: "messageSuccessReimburse",
          run: async () => {
            await this.executeAction(this._actionPath("reimburse"), undefined, { TotalAcceptedAmount: oReimburse.TotalAcceptedAmount });
            this._oReimburseDialog.close();
            this._clearReimburseForm();
          },
          onSuccess: () => this.onPageRequestDetailNavButtonPress()
        });
      },
    });
  }
);