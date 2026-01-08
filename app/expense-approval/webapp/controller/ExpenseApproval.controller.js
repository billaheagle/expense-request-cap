sap.ui.define(["sap/ui/core/mvc/Controller"], (Controller) => {
  "use strict";

  return Controller.extend("expenseapproval.controller.ExpenseApproval", {
    onInit() { },

    onGenericTileRequestPress() {
      this.getOwnerComponent().getRouter().navTo("request");
    },

    onGenericTileReportPress() {
      this.getOwnerComponent().getRouter().navTo("report");
    },

    onGenericTileApprovalPress() {
      this.getOwnerComponent().getRouter().navTo("approval");
    },
  });
});
