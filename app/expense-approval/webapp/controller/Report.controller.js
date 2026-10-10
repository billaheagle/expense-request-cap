sap.ui.define(
  ["expenseapproval/controller/BaseController", "expenseapproval/model/formatter"],
  /**
   * @param   {typeof import("expenseapproval/controller/BaseController").default} BaseController
   * @param   {typeof import("expenseapproval/model/formatter").default} formatter
   */
  function (BaseController, formatter) {
    "use strict";

    return BaseController.extend("expenseapproval.controller.Report", {
      onInit() { },

      onPageReportExpenseNavButtonPress() {
        this.navTo("home");
      },

      onSearchFieldReportSearch(oEvent) {
        const sQuery = oEvent.getParameter("query");
        const aPaths = ["RequestNumber", "Notes"];
        const aFilters = this.createSearchFilter(sQuery, aPaths);
        const oTable = this.byId("idExpenseRequestsReportTable");
        const oBinding = oTable.getBinding("items");
        oBinding.filter(aFilters);
      },

      formatDate(sValue) {
        return formatter.formatDateTime(sValue);
      },

      formatStatusState(sStatus) {
        return formatter.formatStatusState(sStatus);
      },
    });
  });
