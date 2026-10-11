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
      onInit() {
        const oUser = {
          ID: "",
          Roles: []
        }

        const oUserModel = new JSONModel(oUser);
        this.setModel(oUserModel, "user");
        this._pUserLoaded = this._loadUserInfo(oUserModel);
      },

      async _loadUserInfo(oUserModel) {
        try {
          oUserModel.setData(await this.executeAction("/userInfo(...)"));
        } catch (error) {
          this.showError(error.message)
        }
      }
    });
  }
);
