sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("expense.ui.controller.Report", {
    onInit() {},

    onNavBack() {
      this.getOwnerComponent().getRouter().navTo("home");
    },
  });
});
