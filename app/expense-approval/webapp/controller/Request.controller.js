/** @typedef {import("sap/ui/model/json/JSONModel").default} JSONModelType */

sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/BindingMode",
  "sap/m/MessageBox",
  "sap/ui/core/UIComponent",
  "sap/m/SelectDialog",
  "sap/m/StandardListItem"
],
  /**
   * @param   {typeof import("sap/ui/core/mvc/Controller").default} Controller
   * @param   {typeof import("sap/ui/model/json/JSONModel").default} JSONModel
   * @param   {typeof import("sap/ui/model/BindingMode").default} BindingMode
   * @param   {typeof import("sap/m/MessageBox").default} MessageBox
   * @param   {typeof import("sap/ui/core/UIComponent").default} UIComponent
   * @param   {typeof import("sap/m/SelectDialog").default} SelectDialog
   * @param   {typeof import("sap/m/StandardListItem").default} StandardListItem
   */
  function (Controller, JSONModel, BindingMode, MessageBox, UIComponent, SelectDialog, StandardListItem) {
    "use strict";

    return Controller.extend("expenseapproval.controller.Request", {
      _getInitialHeader() {
        return {
          Currency: "IDR",
          ExpenseNotes: "",
        }
      },

      _getInitialItems() {
        return {
          items: []
        }
      },

      _getInitialItem() {
        const oToday = new Date();
        const sYear = oToday.getFullYear();
        const sMonth = String(oToday.getMonth() + 1).padStart(2, "0");
        const sDay = String(oToday.getDate()).padStart(2, "0");

        return {
          ExpenseType_Code: "",
          ExpenseDate: `${sYear}-${sMonth}-${sDay}`,
          Amount: 0,
          Description: "",
        }
      },

      onInit() {
        const oHeader = this._getInitialHeader();
        const oHeaderModel = new JSONModel(oHeader);
        oHeaderModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.getView().setModel(oHeaderModel, "header");

        const oItems = this._getInitialItems();
        const oItemsModel = new JSONModel(oItems);
        oItemsModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.getView().setModel(oItemsModel, "items");

        this._validateHeader();
      },

      onPageCreateExpenseNavButtonPress() {
        UIComponent.getRouterFor(this).navTo("home");
      },

      _buildPayload() {
        const oHeaderModel = this.getView().getModel("header");
        const oHeader = oHeaderModel.getData();

        const oItemsModel = this.getView().getModel("items");
        const aItems = oItemsModel.getProperty("/items");

        const oPayload = {
          Currency_code: oHeader.Currency,
          Notes: oHeader.ExpenseNotes,
          ExpenseItems: []
        }

        for (const oItem of aItems) {
          oPayload.ExpenseItems.push(
            {
              ExpenseType_Code: oItem.ExpenseType_Code,
              ExpenseDate: oItem.ExpenseDate,
              Amount: oItem.Amount,
              Description: oItem.Description
            }
          )
        }

        return oPayload;
      },

      async _draft() {
        const oModel = this.getView().getModel();
        const oListBinding = oModel.bindList("/ExpenseRequests");
        const oPayload = this._buildPayload();
        const oContext = oListBinding.create(oPayload);
        await oContext.created();

        return oContext.getProperty("ID");
      },

      async _activate(sID) {
        const oModel = this.getView().getModel();
        const oAction = oModel.bindContext(
          `/ExpenseRequests(ID=${sID},IsActiveEntity=false)/ExpenseService.draftActivate(...)`
        );
        await oAction.execute();
      },

      async _submit(sID) {
        const oModel = this.getView().getModel();
        const oAction = oModel.bindContext(
          `/ExpenseRequests(ID=${sID},IsActiveEntity=true)/ExpenseService.submit(...)`
        );
        await oAction.execute();
      },

      _clearForm() {
        const oHeader = this._getInitialHeader();
        const oHeaderModel = this.getView().getModel("header");
        oHeaderModel.setData(oHeader);

        const oItems = this._getInitialItems();
        const oItemsModel = this.getView().getModel("items");
        oItemsModel.setData(oItems);

        this._validateHeader();
      },

      async onSaveAsDraftButtonPress() {
        try {
          const sID = await this._draft();
          await this._activate(sID);
          MessageBox.success("Expense request saved as draft", {
            onClose: () => {
              this._clearForm();
              this.onPageCreateExpenseNavButtonPress();
            }
          });
        } catch (oError) {
          MessageBox.error(oError.message);
        }
      },

      async onSubmitRequestButtonPress() {
        try {
          const sID = await this._draft();
          await this._activate(sID);
          await this._submit(sID);
          MessageBox.success("Expense request submitted successfully", {
            onClose: () => {
              this._clearForm();
              this.onPageCreateExpenseNavButtonPress();
            }
          });
        } catch (oError) {
          MessageBox.error(oError.message);
        }
      },

      async _loadItemDialog() {
        if (!this._oItemDialog) {
          this._oItemDialog = await this.loadFragment({
            name: "expenseapproval.view.fragments.ItemDialog"
          });
        }
      },

      async onAddNewItemButtonPress() {
        await this._loadItemDialog();
        const oItem = this._getInitialItem();
        const oItemModel = new JSONModel(oItem);
        this._oItemDialog.setModel(oItemModel, "item");
        this._sDialogMode = "new";
        this._validateItem();
        this._oItemDialog.open();
      },

      onSaveButtonItemDialogPress() {
        const oItemModel = this._oItemDialog.getModel("item");
        const oItem = oItemModel.getData();

        const oItemsModel = this.getView().getModel("items");
        const aItems = oItemsModel.getProperty("/items");

        if (this._sDialogMode === "new") {
          aItems.push({ ...oItem });
        } else if (this._sDialogMode === "edit") {
          aItems[this._iEditIndex] = { ...oItem };
        }

        oItemsModel.setProperty("/items", aItems);
        this._validateHeader();

        this._oItemDialog.close();
      },

      onCancelButtonItemDialogPress() {
        this._oItemDialog.close();
      },

      _getItemIndex(oEvent) {
        const sPath = oEvent.getSource().getBindingContext("items").getPath();
        const aParts = sPath.split("/");
        const iIndex = aParts[aParts.length - 1];

        return parseInt(iIndex, 10);
      },

      async onButtonEditItemPress(oEvent) {
        await this._loadItemDialog();
        const iIndex = this._getItemIndex(oEvent);

        const oItemsModel = this.getView().getModel("items");
        const aItems = oItemsModel.getProperty("/items");
        const oItem = aItems[iIndex];
        const oItemModel = new JSONModel({ ...oItem });
        this._oItemDialog.setModel(oItemModel, "item");
        this._sDialogMode = "edit";
        this._iEditIndex = iIndex;
        this._validateItem();
        this._oItemDialog.open();
      },

      onButtonDeleteItemPress(oEvent) {
        const iIndex = this._getItemIndex(oEvent);

        const oItemsModel = this.getView().getModel("items");
        const aItems = oItemsModel.getProperty("/items");

        MessageBox.confirm("Are you sure delete this row?", {
          actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.DELETE,
          onClose: (sAction) => {
            switch (sAction) {
              case MessageBox.Action.DELETE:
                aItems.splice(iIndex, 1);
                oItemsModel.setProperty("/items", aItems);
                this._validateHeader();
                break;

              default:
                break;
            }
          },
        })
      },

      formatDate(sValue) {
        if (!sValue) return "";
        const [sYear, sMonth, sDay] = sValue.split("-");
        return `${sDay}/${sMonth}/${sYear}`;
      },

      _validateHeader() {
        const oHeaderModel = this.getView().getModel("header");
        const oHeader = oHeaderModel.getData();

        oHeader._CurrencyState = (oHeader.Currency) ? "None" : "Error";
        oHeader._ExpenseNotesState = (oHeader.ExpenseNotes) ? "None" : "Error";
        oHeader._isValid = Boolean(oHeader.Currency && oHeader.ExpenseNotes);

        const oItemsModel = this.getView().getModel("items");
        const aItems = oItemsModel.getProperty("/items");
        oHeader._isValidItem = Boolean(oHeader._isValid && aItems.length > 0);

        oHeaderModel.refresh();
      },

      _validateItem() {
        const oItemModel = this._oItemDialog.getModel("item");
        const oItem = oItemModel.getData();

        oItem._ExpenseType_CodeState = (oItem.ExpenseType_Code) ? "None" : "Error";
        oItem._ExpenseDateState = (oItem.ExpenseDate) ? "None" : "Error";

        const bAmountOk = Number(oItem.Amount) > 0;
        oItem._AmountState = (bAmountOk) ? "None" : "Error";
        oItem._isValid = Boolean(oItem.ExpenseType_Code && oItem.ExpenseDate && bAmountOk);

        oItemModel.refresh();
      },

      onCurrencyInputLiveChange() {
        this._validateHeader();
      },

      onExpenseNotesTextAreaLiveChange() {
        this._validateHeader();
      },

      onExpenseTypeCodeInputLiveChange() {
        this._validateItem();
      },

      onExpenseDateDatePickerChange() {
        this._validateItem();
      },

      onAmountInputLiveChange() {
        this._validateItem();
      },

      onCurrencyInputValueHelpRequest() {
        if (!this._oCurrencyDialog) {
          this._oCurrencyDialog = new SelectDialog({
            title: "Select Currency",
            items: {
              path: "/Currencies",
              template: new StandardListItem({
                title: {
                  parts: ["code", "symbol"],
                  formatter: (sCode, sSymbol) => `${sCode} (${sSymbol})`
                }, description: "{name}"
              })
            },
            confirm: (oEvent) => {
              const oSelectedItem = oEvent.getParameter("selectedItem");
              if (oSelectedItem) {
                const sCode = oSelectedItem.getBindingContext().getProperty("code")

                const oHeaderModel = this.getView().getModel("header");
                oHeaderModel.setProperty("/Currency", sCode);

                this._validateHeader();
              }
            }
          });

          this.getView().addDependent(this._oCurrencyDialog);
        }

        this._oCurrencyDialog.open();
      },

      onExpenseTypeCodeInputValueHelpRequest() {
        if (!this._oExpenseTypeDialog) {
          this._oExpenseTypeDialog = new SelectDialog({
            title: "Select Expense Type",
            items: {
              path: "masterData>/ExpenseTypes",
              template: new StandardListItem({
                title: "{masterData>Description}", description: {
                  path: "masterData>MaxAmount",
                  formatter: (sMaxAmount) => Number(sMaxAmount) > 0 ? `Max ${sMaxAmount}` : `No Limit`
                }
              })
            },
            confirm: (oEvent) => {
              const oSelectedItem = oEvent.getParameter("selectedItem");
              if (oSelectedItem) {
                const sCode = oSelectedItem.getBindingContext("masterData").getProperty("Code");

                const oItemModel = this._oItemDialog.getModel("item");
                oItemModel.setProperty("/ExpenseType_Code", sCode);

                this._validateItem();
              }
            }
          })

          this.getView().addDependent(this._oExpenseTypeDialog);
        }

        this._oExpenseTypeDialog.open();
      }
    });
  });