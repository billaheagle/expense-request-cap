sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("expenseapproval.controller.Approval", {
    onInit() { },

    onPageApprovalExpenseNavButtonPress() {
      this.getOwnerComponent().getRouter().navTo("home");
    },
  });
});
