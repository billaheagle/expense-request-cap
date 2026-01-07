sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/m/MessageBox"],
  function (Controller, MessageBox) {
    "use strict";

    return Controller.extend("expense.ui.controller.Request", {
      /* ===========================
       INITIALIZATION & NAVIGATION
       =========================== */
      onInit() {
        const oHeader = {
          Currency: "IDR",
          ExpenseNotes: "",
        };

        // Create Header model with TwoWay binding
        const oHeaderModel = new sap.ui.model.json.JSONModel(oHeader);
        oHeaderModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
        this.getView().setModel(oHeaderModel, "header");

        // Create items model with TwoWay binding
        const oItemsModel = new sap.ui.model.json.JSONModel({ items: [] });
        oItemsModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
        this.getView().setModel(oItemsModel, "items");
      },

      onNavBack() {
        // Navigate back to home route
        this.getOwnerComponent().getRouter().navTo("home");
      },

      onCloseItemDialog: function () {
        // Close item dialog if open
        if (this._itemDialog) {
          this._itemDialog.close();
        }
      },

      onAddItem: function () {
        // Open item dialog with default empty ite
        this._loadItemDialog();

        const oItem = {
          ExpenseType_Code: "",
          ExpenseDate: this.formatDateToYYYYMMDD(new Date()),
          Amount: null,
          Description: "",
        };

        const oDialogModel = new sap.ui.model.json.JSONModel(oItem);
        this._itemDialog.setModel(oDialogModel, "item");
        this._itemDialog.data("mode", "new");
        this._itemDialog.open();
      },

      onSaveItemDialog: function () {
        // Save item data into items model
        const oItemData = this._itemDialog.getModel("item").getData();
        const oItemsModel = this.getView().getModel("items");
        const aItems = oItemsModel.getProperty("/items");
        const mode = this._itemDialog.data("mode");

        if (mode === "new") {
          // add new
          aItems.push({ ...oItemData });
        } else if (mode === "edit") {
          // update existing
          const iIndex = this._itemDialog.data("index");
          aItems[iIndex] = { ...oItemData };
        }

        oItemsModel.setProperty("/items", aItems);

        this._itemDialog.close();
        this.validateHeader();
      },

      /* ===========================
       DATE FORMATTING UTILITIES
       =========================== */
      formatDateToYYYYMMDD: function (oDate) {
        // Convert JS Date to yyyy-MM-dd string
        const year = oDate.getFullYear();
        const month = String(oDate.getMonth() + 1).padStart(2, "0");
        const day = String(oDate.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
      },

      formatDate: function (sValue) {
        // Convert yyyy-MM-dd string to dd/MM/yyyy
        if (!sValue) {
          return "";
        }
        const oDate = new Date(sValue);
        const day = String(oDate.getDate()).padStart(2, "0");
        const month = String(oDate.getMonth() + 1).padStart(2, "0");
        const year = oDate.getFullYear();
        return day + "/" + month + "/" + year;
      },

      /* ===========================
       INPUT & VALIDATION HANDLING
       =========================== */
      onFillInputItem: function (oEvent, oModel) {
        // Update model property from input value
        const oInput = oEvent.getSource();
        const sValue = oEvent.getParameter("value");
        const sPath = oInput.getBinding("value").getPath();

        if (
          sPath !== "/ExpenseType_Code" &&
          sPath !== "/ExpenseDate" &&
          sPath !== "/Currency"
        ) {
          oModel.setProperty(sPath, sValue);
        }
      },

      validateItem: function () {
        // Validate item fields and set value states
        const oModel = this._itemDialog.getModel("item");
        const oData = oModel.getData();
        let bValid = true;

        if (!oData.ExpenseType_Code) {
          oData._ExpenseType_CodeState = "Error";
          bValid = false;
        } else {
          oData._ExpenseType_CodeState = "None";
        }

        if (!oData.ExpenseDate) {
          oData._ExpenseDateState = "Error";
          bValid = false;
        } else {
          oData._ExpenseDateState = "None";
        }

        if (!oData.Amount) {
          oData._AmountState = "Error";
          bValid = false;
        } else {
          oData._AmountState = "None";
        }

        oData._isValid = bValid;
        oModel.refresh(true);
      },

      onValidateItem: function (oEvent) {
        // Combined input fill + validation
        const oModel = this._itemDialog.getModel("item");
        this.onFillInputItem(oEvent, oModel);
        this.validateItem();
      },

      validateHeader: function () {
        const oModel = this.getView().getModel("header");
        const oData = oModel.getData();
        let bValid = true;

        if (!oData.Currency) {
          oData._CurrencyState = "Error";
          bValid = false;
        } else {
          oData._CurrencyState = "None";
        }

        if (!oData.ExpenseNotes) {
          oData._ExpenseNotesState = "Error";
          bValid = false;
        } else {
          oData._ExpenseNotesState = "None";
        }

        oData._isValid = bValid;

        const oItemsModel = this.getView().getModel("items");
        const aItems = oItemsModel.getProperty("/items");
        oData._isValidItem = oData._isValid && !aItems.length == 0;

        oModel.refresh(true);
      },

      onValidateHeader: function (oEvent) {
        const oModel = this.getView().getModel("header");
        this.onFillInputItem(oEvent, oModel);
        this.validateHeader();
      },

      buildPayload: function () {
        const oPayload = {
          Currency_code: "",
          Notes: "",
          ExpenseItems: [],
        };

        const oHeaderModel = this.getView().getModel("header");
        const oHeader = oHeaderModel.getData();

        const oItemsModel = this.getView().getModel("items");
        const aItems = oItemsModel.getProperty("/items");

        oPayload.Currency_code = oHeader.Currency;
        oPayload.Notes = oHeader.ExpenseNotes;
        aItems.forEach((oItem) => {
          oPayload.ExpenseItems.push({
            ExpenseType_Code: oItem.ExpenseType_Code,
            ExpenseDate: oItem.ExpenseDate,
            Amount: oItem.Amount,
            Description: oItem.Description,
          });
        });

        return oPayload;
      },

      draft: async function () {
        const oModel = this.getView().getModel();
        const oPayload = this.buildPayload();

        const oListBinding = oModel.bindList("/ExpenseRequests");
        const oContext = oListBinding.create(oPayload);

        try {
          await oContext.created();
          const oResponse = oContext.getObject();
          return oResponse.ID;
        } catch (oError) {
          MessageBox.error("Error submitting request: " + oError.message);
          throw oError;
        }
      },

      onDraft: async function () {
        const id = await this.draft();

        if (id) {
          MessageBox.success("Expense request submitted successfully!");
        }
      },

      submit: async function (sID) {
        const oModel = this.getOwnerComponent().getModel();

        console.log(
          `/ExpenseRequests(ID=${sID},IsActiveEntity=false)/draftActivate`
        );

        const oListBinding = oModel.bindList(
          `/ExpenseRequests(ID=${sID},IsActiveEntity=false)/draftActivate`
        );
        await oListBinding.post();
        /* const oContext = await oListBinding.create(); */
        console.log(oListBinding);
        /* await oContext.created();
        const oResponse = oContext.getObject();
        console.log(oResponse); */

        /* const oAction = oModel.bindContext(
          `/ExpenseRequests(ID=${sID},IsActiveEntity=false)/draftActivate`,
          null,
          {
            $$groupId: "$direct", // 🔑 THIS IS THE FIX
          }
        );

        await oAction.execute();

        await oModel.refresh(); */

        MessageBox.success("Draft activated");
      },

      onSubmit: async function () {
        const id = await this.draft();

        if (id) {
          await this.submit(id);
        }
      },

      getIndexItems: function (oEvent) {
        const oSource = oEvent.getSource();
        const oContext = oSource.getBindingContext("items");
        const sPath = oContext.getPath();
        const iIndex = parseInt(sPath.split("/")[2], 10);
        return iIndex;
      },

      onEditItem: function (oEvent) {
        const index = this.getIndexItems(oEvent);
        const oItemsModel = this.getView().getModel("items");
        const aItems = oItemsModel.getProperty("/items");

        if (index >= 0 && index < aItems.length) {
          const oDialogModel = new sap.ui.model.json.JSONModel(aItems[index]);
          this._itemDialog.setModel(oDialogModel, "item");
          this._itemDialog.data("mode", "edit");
          this._itemDialog.data("index", index);
          this._itemDialog.open();
        }
      },

      onDeleteItem: function (oEvent) {
        const index = this.getIndexItems(oEvent);
        const oItemsModel = this.getView().getModel("items");
        const aItems = oItemsModel.getProperty("/items");

        if (index >= 0 && index < aItems.length) {
          aItems.splice(index, 1); // remove 1 element at position iIndex
          oItemsModel.setProperty("/items", aItems); // update model
        }
      },

      /* ===========================
       CURRENCY VALUE HELP DIALOG
       =========================== */
      onCurrencyValueHelp: function (oEvent) {
        const oInput = oEvent.getSource();
        const oView = this.getView();
        const oModel = this.getView.getModel("header");
        const oData = oModel.getData();

        if (!this._currencyDialog) {
          this._currencyDialog = new sap.m.SelectDialog({
            title: "Select Currency",
            items: {
              path: "/Currencies",
              template: new sap.m.StandardListItem({
                title: "{code}",
                description: "{name}",
              }),
            },
            confirm: function (oEvent) {
              // Set selected currency back to input field
              const oSelectedItem = oEvent.getParameter("selectedItem");
              if (oSelectedItem) {
                oInput.setValue(oSelectedItem.getTitle());
                oData.Currency = oSelectedItem.getTitle();
              }
              this.validateHeader();
            },
          });
          oView.addDependent(this._currencyDialog);
        }

        this._currencyDialog.open();
      },

      /* ===========================
       EXPENSE TYPE VALUE HELP DIALOG
       =========================== */
      onExpenseTypeValueHelp: function (oEvent) {
        const oInput = oEvent.getSource();
        const oView = this.getView();
        const oModel = this._itemDialog.getModel("item");
        const oData = oModel.getData();

        if (!this._expenseTypeDialog) {
          this._expenseTypeDialog = new sap.m.SelectDialog({
            title: "Select Expense Type",
            items: {
              path: "masterData>/ExpenseTypes",
              template: new sap.m.StandardListItem({
                title: "{masterData>Code}",
                description: "{masterData>Description}",
              }),
            },
            confirm: (oEvent) => {
              // Set selected expense type back to input field
              const oSelectedItem = oEvent.getParameter("selectedItem");
              if (oSelectedItem) {
                oInput.setValue(oSelectedItem.getTitle());
                oData.ExpenseType_Code = oSelectedItem.getTitle();
              }
              this.validateItem();
            },
          });
          oView.addDependent(this._expenseTypeDialog);
        }

        this._expenseTypeDialog.open();
      },

      /* ===========================
       ITEM DIALOG HANDLING
       =========================== */
      _loadItemDialog: function () {
        // Lazy-load item dialog fragment
        if (!this._itemDialog) {
          this._itemDialog = sap.ui.xmlfragment(
            "expenseapproval.view.fragments.ItemDialog",
            this
          );
          this.getView().addDependent(this._itemDialog);
        }
      },
    });
  }
);
