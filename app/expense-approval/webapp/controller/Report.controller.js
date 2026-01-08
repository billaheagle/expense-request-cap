sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/model/Filter", "sap/ui/model/FilterOperator"],
  function (Controller, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("expenseapproval.controller.Report", {
      onInit() { },

      onPageReportExpenseNavButtonPress() {
        this.getOwnerComponent().getRouter().navTo("home");
      },

      onSearchFieldReportSearch(oEvent) {
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

        const oTable = this.byId("idExpenseRequestsReportTable");
        const oBinding = oTable.getBinding("items");
        oBinding.filter(aFilters);
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

      formatStatusState(sStatus) {
        switch (sStatus) {
          case "Approved":
          case "Reimbursed":
            return "Success";
          case "Submitted":
            return "Warning";
          case "Rejected":
            return "Error";
          default:
            return "None";
        }
      },
    });
  });
