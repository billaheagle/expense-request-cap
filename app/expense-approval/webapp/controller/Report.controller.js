sap.ui.define(
  [
    "expenseapproval/controller/BaseController",
    "expenseapproval/model/formatter",
    "sap/m/MessageBox"
  ],
  /**
   * @param   {typeof import("expenseapproval/controller/BaseController").default} BaseController
   * @param   {typeof import("expenseapproval/model/formatter").default} formatter
   * @param   {typeof import("sap/m/MessageBox").default} MessageBox
   */
  function (BaseController, formatter, MessageBox) {
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

      onButtonReimbursePress(oEvent) {
        const oContext = oEvent.getSource().getBindingContext();
        if (!oContext) return;

        MessageBox.confirm(this.getText("messageConfirmReimburse"), {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: async (sAction) => {
            if (sAction !== MessageBox.Action.OK) return;
            try {
              await this.executeAction("ExpenseService.reimburse(...)", oContext);

              MessageBox.success(this.getText("messageSuccessReimburse"), {
                onClose: () => {
                  this._onRouteMatched();
                }
              });
            } catch (oError) {
              this.showError(oError.message)
            }
          },
        });
      },

      async onButtonDeletePress(oEvent) {
        const oContext = oEvent.getSource().getBindingContext();
        if (!oContext) return;

        MessageBox.confirm(this.getText("messageConfirmDelete"), {
          actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.DELETE,
          onClose: async (sAction) => {
            if (sAction !== MessageBox.Action.DELETE) return;
            try {
              await oContext.delete();

              MessageBox.success(this.getText("messageSuccessDeleteDraft"), {
                onClose: () => {
                  this._onRouteMatched();
                }
              });
            } catch (oError) {
              this.showError(oError.message)
            }
          },
        });
      }
    });
  });
