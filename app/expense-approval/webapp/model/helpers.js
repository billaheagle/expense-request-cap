sap.ui.define([
],
    function () {
        "use strict";
        return {
            getOverMaxItems(aItems, aExpenseTypes) {
                return aItems.flatMap(oItem => {
                    const oType = aExpenseTypes.find(t => t.Code === oItem.ExpenseType_Code);
                    if (!oType?.MaxAmount || Number(oItem.Amount) <= Number(oType.MaxAmount)) return [];
                    return [{
                        Description: oItem.Description,
                        Amount: Number(oItem.Amount),
                        MaxAmount: Number(oType.MaxAmount),
                        Justification: oItem.Justification
                    }];
                });
            }
        }
    });