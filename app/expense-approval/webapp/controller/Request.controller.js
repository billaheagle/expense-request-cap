sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/BindingMode",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
  ],
  function (Controller, MessageBox, JSONModel, BindingMode, SelectDialog, StandardListItem) {
    "use strict";

    return Controller.extend("expenseapproval.controller.Request", {
      /* ===========================
       LIFECYCLE METHODS
       =========================== */
      onInit() {
        const oHeader = {
          Currency: "IDR",
          ExpenseNotes: "",
        };

        // Create Header model with TwoWay binding
        const oHeaderModel = new JSONModel(oHeader);
        oHeaderModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.getView().setModel(oHeaderModel, "header");

        // Create items model with TwoWay binding
        const oItemsModel = new JSONModel({ items: [] });
        oItemsModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.getView().setModel(oItemsModel, "items");
      },

      /* ===========================
       EVENT HANDLERS
       =========================== */
      onPageCreateExpenseNavButtonPress() {
        // Navigate back to home route
        this.getOwnerComponent().getRouter().navTo("home");
      },

      onAddNewItemButtonPress: function () {
        // Open item dialog with default empty ite
        this._loadItemDialog();

        const oItem = {
          ExpenseType_Code: "",
          ExpenseDate: this._formatDateToYYYYMMDD(new Date()),
          Amount: null,
          Description: "",
        };

        const oDialogModel = new JSONModel(oItem);
        this._itemDialog.setModel(oDialogModel, "item");
        this._itemDialog.data("mode", "new");
        this._itemDialog.open();
      },

      onButtonEditItemPress: function (oEvent) {
        const index = this._getIndexItems(oEvent);
        const oItemsModel = this.getView().getModel("items");
        const aItems = oItemsModel.getProperty("/items");

        if (index >= 0 && index < aItems.length) {
          const oDialogModel = new JSONModel(aItems[index]);
          this._itemDialog.setModel(oDialogModel, "item");
          this._itemDialog.data("mode", "edit");
          this._itemDialog.data("index", index);
          this._itemDialog.open();
        }
      },

      onButtonDeleteItemPress: function (oEvent) {
        const index = this._getIndexItems(oEvent);
        const oItemsModel = this.getView().getModel("items");
        const aItems = oItemsModel.getProperty("/items");

        if (index >= 0 && index < aItems.length) {
          aItems.splice(index, 1); // remove 1 element at position iIndex
          oItemsModel.setProperty("/items", aItems); // update model
        }
      },

      onSaveButtonItemDialogPress: function () {
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
        this._validateHeader();
      },

      onCancelButtonItemDialogPress: function () {
        // Close item dialog if open
        if (this._itemDialog) {
          this._itemDialog.close();
        }
      },

      onCurrencyInputLiveChange: function (oEvent) {
        const oModel = this.getView().getModel("header");
        this._onFillInputItem(oEvent, oModel);
        this._validateHeader();
      },

      onExpenseNotesTextAreaLiveChange: function (oEvent) {
        const oModel = this.getView().getModel("header");
        this._onFillInputItem(oEvent, oModel);
        this._validateHeader();
      },

      onExpenseTypeCodeInputLiveChange: function (oEvent) {
        // Combined input fill + validation
        const oModel = this._itemDialog.getModel("item");
        this._onFillInputItem(oEvent, oModel);
        this._validateItem();
      },

      onExpenseDateDatePickerChange: function (oEvent) {
        // Combined input fill + validation
        const oModel = this._itemDialog.getModel("item");
        this._onFillInputItem(oEvent, oModel);
        this._validateItem();
      },

      onAmountInputLiveChange: function (oEvent) {
        // Combined input fill + validation
        const oModel = this._itemDialog.getModel("item");
        this._onFillInputItem(oEvent, oModel);
        this._validateItem();
      },

      onSaveAsDraftButtonPress: async function () {
        const id = await this._draft();

        if (id) {
          MessageBox.success("Expense request Saved successfully!", {
            onClose: () => {
              // Clear form data
              this._clearForm();
              // Navigate back to home or refresh
              this.onPageCreateExpenseNavButtonPress();
            },
          });
        }
      },

      onSubmitRequestButtonPress: async function () {
        const id = await this._draft();

        if (id) {
          await this._submit(id);
        }
      },

      onCurrencyInputValueHelpRequest: function (oEvent) {
        const oInput = oEvent.getSource();
        const oView = this.getView();
        const oModel = this.getView().getModel("header");
        const oData = oModel.getData();

        if (!this._currencyDialog) {
          this._currencyDialog = new SelectDialog({
            title: "Select Currency",
            items: {
              path: "/Currencies",
              template: new StandardListItem({
                title: "{code}",
                description: "{name}",
              }),
            },
            confirm: (oEvent) => {
              // Set selected currency back to input field
              const oSelectedItem = oEvent.getParameter("selectedItem");
              if (oSelectedItem) {
                oInput.setValue(oSelectedItem.getTitle());
                oData.Currency = oSelectedItem.getTitle();
              }
              this._validateHeader();
            },
          });
          oView.addDependent(this._currencyDialog);
        }

        this._currencyDialog.open(oInput.getValue());
      },

      onExpenseTypeCodeInputValueHelpRequest: function (oEvent) {
        const oInput = oEvent.getSource();
        const oView = this.getView();
        const oModel = this._itemDialog.getModel("item");
        const oData = oModel.getData();

        if (!this._expenseTypeDialog) {
          this._expenseTypeDialog = new SelectDialog({
            title: "Select Expense Type",
            items: {
              path: "masterData>/ExpenseTypes",
              template: new StandardListItem({
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
              this._validateItem();
            },
          });
          oView.addDependent(this._expenseTypeDialog);
        }

        this._expenseTypeDialog.open(oInput.getValue());
      },

      /* ===========================
       FORMATTERS
       =========================== */
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
       PRIVATE METHODS
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

      _buildPayload: function () {
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

      _draft: async function () {
        const oModel = this.getView().getModel();
        const oPayload = this._buildPayload();
        /** @type {Object<any>} */
        const oPayloadData = JSON.parse(JSON.stringify(oPayload));

        const oListBinding = oModel.bindList("/ExpenseRequests");
        const oContext = oListBinding.create(oPayloadData);

        try {
          await oContext.created();
          const oResponse = oContext.getObject();
          return oResponse.ID;
        } catch (oError) {
          MessageBox.error("Error submitting request: " + oError.message);
          throw oError;
        }
      },

      _submit: async function (sID) {
        const oModel = this.getOwnerComponent().getModel();

        // Bind to the Action Context
        const oActionOContext = oModel.bindContext(
          `/ExpenseRequests(ID=${sID},IsActiveEntity=false)/ExpenseService.draftActivate(...)`
        );

        try {
          // Execute the action
          await oActionOContext.execute();
          MessageBox.success("Expense request submitted successfully!", {
            onClose: () => {
              // Clear form data
              this._clearForm();
              // Navigate back to home or refresh
              this.onPageCreateExpenseNavButtonPress();
            },
          });
        } catch (error) {
          MessageBox.error("Error activating draft: " + error.message);
        }
      },

      _clearForm: function () {
        // Reset Header
        const oHeaderModel = this.getView().getModel("header");
        oHeaderModel.setData({
          Currency: "IDR",
          ExpenseNotes: "",
          _isValid: false,
          _isValidItem: false,
        });
        oHeaderModel.refresh();

        // Reset Items
        const oItemsModel = this.getView().getModel("items");
        oItemsModel.setData({ items: [] });
        oItemsModel.refresh();
      },

      _validateItem: function () {
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

      _validateHeader: function () {
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

      _onFillInputItem: function (oEvent, oModel) {
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

      _getIndexItems: function (oEvent) {
        const oSource = oEvent.getSource();
        const oContext = oSource.getBindingContext("items");
        const sPath = oContext.getPath();
        const iIndex = parseInt(sPath.split("/")[2], 10);
        return iIndex;
      },

      _formatDateToYYYYMMDD: function (oDate) {
        // Convert JS Date to yyyy-MM-dd string
        const year = oDate.getFullYear();
        const month = String(oDate.getMonth() + 1).padStart(2, "0");
        const day = String(oDate.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
      },
    });
  }
);
