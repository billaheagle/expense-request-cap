const cds = require('@sap/cds');

module.exports = class MasterDataService extends cds.ApplicationService {
  async init() {
    const { Employees, ExpenseTypes } = this.entities;
    const { ExpenseRequests, ExpenseItems } = cds.entities('my.expense');

    async function assertUnique(req, sField) {
      const value = req.data[sField];
      if (!value) return;

      const oEmployee = await SELECT.one.from(Employees).where({ [sField]: value });
      if (oEmployee && oEmployee.ID !== req.data.ID) req.reject(409, `Employee with ${sField} '${value}' already exists`);
    }

    this.before(['CREATE', 'UPDATE'], Employees, async (req) => {
      await assertUnique(req, 'Email');
      await assertUnique(req, 'EmployeeNumber');
    });

    this.before('DELETE', Employees, async (req) => {
      const oEmployee = await SELECT.one.from(req.subject);
      if (!oEmployee) req.reject(404, "Employee not found");
      if (oEmployee.Active) req.reject(409, "Active employee cannot be deleted");

      const oSubordinate = await SELECT.one.from(Employees).where({ Manager_ID: oEmployee.ID });
      if (oSubordinate) req.reject(409, "Employee is still a manager of other employees");

      const oExpenseRequest = await SELECT.one.from(ExpenseRequests).where({ Employee_ID: oEmployee.ID });
      if (oExpenseRequest) req.reject(409, "Employee still have an Expense Request");
    });

    this.before(['CREATE', 'UPDATE'], ExpenseTypes, async (req) => {
      const oCurrent = req.event === 'UPDATE' ? await SELECT.one.from(req.subject) : {};
      if (!oCurrent) req.reject(404, "Expense type not found"); 
      if (oCurrent.Active === false && req.data.Active !== true) req.reject(409, "Inactive expense types cannot be modified. Reactivate it first.");

      const oMerged = { ...oCurrent, ...req.data };
      const bHasMaxAmount = oMerged.MaxAmount !== null && oMerged.MaxAmount !== undefined;

      if (oMerged.ReceiptRequired === false && !bHasMaxAmount) req.reject(400, "MaxAmount is required when no receipt is required");
      if (bHasMaxAmount && Number(oMerged.MaxAmount) <= 0) req.reject(400, "MaxAmount must be greater than 0");
    });

    this.before('DELETE', ExpenseTypes, async (req) => {
      const oExpenseType = await SELECT.one.from(req.subject);
      if (!oExpenseType) req.reject(404, "Expense Type not found");
      if (oExpenseType.Active) req.reject(409, "Active expense type cannot be deleted");

      const oExpenseItem = await SELECT.one.from(ExpenseItems).where({ 'ExpenseType_Code': oExpenseType.Code });
      if (oExpenseItem) req.reject(409, "Expense Type still used in Expense Items");
    });

    return super.init();
  }
};