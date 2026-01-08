sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("expenseapproval.controller.Report", {
    onInit() { },

    onPageReportExpenseNavButtonPress() {
      this.getOwnerComponent().getRouter().navTo("home");
    },
  });
});
