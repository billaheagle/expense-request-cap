sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
],
    /**
     * @param   {typeof import("sap/ui/core/mvc/Controller").default} Controller
     * @param   {typeof import("sap/ui/core/UIComponent").default} UIComponent
     * @param   {typeof import("sap/ui/model/Filter").default} Filter
     * @param   {typeof import("sap/ui/model/FilterOperator").default} FilterOperator
     * @param   {typeof import("sap/m/MessageBox").default} MessageBox
     */
    (Controller, UIComponent, Filter, FilterOperator, MessageBox) => {
        "use strict";

        return Controller.extend("expenseapproval.controller.BaseController", {
            getRouter() {
                return UIComponent.getRouterFor(this);
            },

            navTo(sRoute, oParams) {
                this.getRouter().navTo(sRoute, oParams);
            },

            onNavBack() {
                this.getRouter().navTo("home");
            },

            getText(sKey, aArgs) {
                const oModel = this.getOwnerComponent().getModel("i18n");
                return oModel.getResourceBundle().getText(sKey, aArgs);
            },

            getModel(sName) {
                return this.getView().getModel(sName);
            },

            setModel(oModel, sName) {
                this.getView().setModel(oModel, sName);
            },

            addDependent(oObject) {
                this.getView().addDependent(oObject);
            },

            createSearchFilter(sQuery, aPaths) {
                const aResults = [];
                const aFilters = [];

                if (!sQuery) return aResults;

                aPaths.forEach(sPath => {
                    aFilters.push(new Filter(sPath, FilterOperator.Contains, sQuery))
                })

                aResults.push(
                    new Filter({
                        filters: aFilters,
                        and: false,
                    })
                );

                return aResults;
            },

            showError(sMessage) {
                MessageBox.error(sMessage);
            },

            async executeAction(sActionPath, oContext, mParams = {}) {
                const oModel = this.getModel()
                const oAction = oModel.bindContext(sActionPath, oContext);

                Object.entries(mParams).forEach(sParam => {
                    oAction.setParameter(sParam[0], sParam[1]);
                })

                await oAction.execute();
            }
        })
    }
)