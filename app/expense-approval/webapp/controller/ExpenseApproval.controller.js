sap.ui.define(["expenseapproval/controller/BaseController"],
  /**
   * @param   {typeof import("expenseapproval/controller/BaseController").default} BaseController
   */
  (BaseController) => {
    "use strict";

    return BaseController.extend("expenseapproval.controller.ExpenseApproval", {
      onInit() { },

      onGenericTileRequestPress() {
        this.navTo("request");
      },

      onGenericTileReportPress() {
        this.navTo("report");
      },

      onGenericTileApprovalPress() {
        this.navTo("approval");
      },
    });
  });
