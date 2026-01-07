sap.ui.define(["sap/ui/core/mvc/Controller"], (Controller) => {
  "use strict";

  return Controller.extend("expenseapproval.controller.ExpenseApproval", {
    onInit() {},

    onRequestPage() {
      this.getOwnerComponent().getRouter().navTo("request");
    },

    onReportPage() {
      this.getOwnerComponent().getRouter().navTo("report");
    },

    onApprovalPage() {
      this.getOwnerComponent().getRouter().navTo("approval");
    },
  });
});
