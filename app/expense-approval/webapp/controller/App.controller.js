sap.ui.define(
  [
    "expenseapproval/controller/BaseController",
    "sap/ui/model/json/JSONModel",
  ],
  /**
   * @param   {typeof import("expenseapproval/controller/BaseController").default} BaseController
   * @param   {typeof import("sap/ui/model/json/JSONModel").default} JSONModel
   */
  (BaseController, JSONModel) => {
    "use strict";

    return BaseController.extend("expenseapproval.controller.App", {
      async onInit() {
        const oUser = {
          ID: "",
          Roles: []
        }

        const oUserModel = new JSONModel(oUser);
        this.setModel(oUserModel, "user");

        try {
          oUserModel.setData(await this._loadUserInfo());
        } catch (error) {
          this.showError(error.message)
        }

      },

      async _loadUserInfo() {
        return await this.executeAction("/userInfo(...)");
      }
    });
  }
);
