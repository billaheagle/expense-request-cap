sap.ui.define(
  [
    "expenseapproval/controller/BaseController",
    "expenseapproval/model/formatter",
    "expenseapproval/model/helpers",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
  ],
  /**
   * @param   {typeof import("expenseapproval/controller/BaseController").default} BaseController
   * @param   {typeof import("expenseapproval/model/formatter").default} formatter
   * @param   {typeof import("expenseapproval/model/helpers").default} helpers
   * @param   {typeof import("sap/ui/model/json/JSONModel").default} JSONModel
   * @param   {typeof import("sap/m/MessageBox").default} MessageBox
   */
  function (BaseController, formatter, helpers, JSONModel, MessageBox) {
    "use strict";

    return BaseController.extend("expenseapproval.controller.Report", {
      onInit() {
        this.getRouter()
          .getRoute("report")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      _onRouteMatched() {
        const oTable = this.byId("idExpenseRequestsReportTable");
        oTable?.getBinding("items")?.refresh();
      },

      onPageReportExpenseNavButtonPress() {
        this.onNavBack();
      },

      onSearchFieldReportSearch(oEvent) {
        const sQuery = oEvent.getParameter("query");
        const aPaths = ["RequestNumber", "Notes"];
        const aFilters = this.createSearchFilter(sQuery, aPaths);
        const oTable = this.byId("idExpenseRequestsReportTable");
        const oBinding = oTable.getBinding("items");
        oBinding.filter(aFilters);
      },

      onRefreshButtonPress() {
        this._onRouteMatched();
      },

      formatDateTime(sValue) {
        return formatter.formatDateTime(sValue);
      },

      formatStatusState(sStatus) {
        return formatter.formatStatusState(sStatus);
      },

      onReportItemPress(oEvent) {
        const oContext = oEvent.getSource().getBindingContext();
        this.navTo("requestDetail", { ID: oContext.getProperty("ID") });
      },

      async onButtonDeletePress(oEvent) {
        const oContext = oEvent.getSource().getBindingContext();
        if (!oContext) return;

        this.confirmAndRun({
          confirmKey: "messageConfirmDelete",
          successKey: "messageSuccessDeleteDraft",
          run: async () => await oContext.delete(),
          onSuccess: async () => await this._onRouteMatched(),
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

      async _getDataReimburse(oEvent) {
        const oContext = oEvent.getSource().getBindingContext();
        const oHeader = oContext.getObject();
        const aCtx = await this.getModel().bindList("ExpenseItems", oContext).requestContexts();
        const aItems = aCtx.map(c => c.getObject());

        const aContexts = await this.getModel("masterData")
          .bindList("/ExpenseTypes")
          .requestContexts();

        const aExpenseTypes = aContexts.map(o => o.getObject());
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
          this._oReimburseDialog = await this.loadDialog("ReimburseDialog");
        }
      },

      async onButtonReimbursePress(oEvent) {
        this._oReimburseContext = oEvent.getSource().getBindingContext();
        await this._loadReimburseDialog();
        const oReimburse = await this._getDataReimburse(oEvent);
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
        if (!this._oReimburseContext) return;

        const oReimburseModel = this.getModel("reimburse");
        const oReimburse = oReimburseModel.getData();

        const mParams = {
          TotalAcceptedAmount: oReimburse.TotalAcceptedAmount
        }

        this.confirmAndRun({
          confirmKey: "messageConfirmReimburse",
          successKey: "messageSuccessReimburse",
          run: async () => {
            await this.executeAction("ExpenseService.reimburse(...)", this._oReimburseContext, mParams);
            this._oReimburseDialog.close();
            this._clearReimburseForm();
          },
          onSuccess: async () => await this._onRouteMatched()
        });
      },

      async onApproveButtonPress(oEvent) {
        const oContext = oEvent.getSource().getBindingContext();
        if (!oContext) return;

        this.confirmAndRun({
          confirmKey: "messageConfirmApprove",
          successKey: "messageSuccessApprove",
          run: async () => await this.executeAction("ExpenseService.approve(...)", oContext),
          onSuccess: async () => await this._onRouteMatched()
        });
      },

      _getInitialDecline() {
        return {
          Reason: "",
        }
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
        this._clearForm();
        this._oDeclineDialog.close();
      },

      async onDeclineButtonPress(oEvent) {
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

        this.confirmAndRun({
          confirmKey: "messageConfirmApprove",
          successKey: "messageSuccessApprove",
          run: async () => {
            await this.executeAction("ExpenseService.decline(...)", this._oDeclineContext, mParams);
            this._oDeclineDialog.close();
            this._clearForm();
          },
          onSuccess: async () => await this._onRouteMatched()
        });
      },
    });
  });
