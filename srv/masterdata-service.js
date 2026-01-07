const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const { Employees, ExpenseTypes } = this.entities;

  /**
   * LOG REQUEST USER DETAILS
   */

  this.before("*", (req) => {
    /* if (!req.user.is("admin")) {
      req.reject(403, "Access denied: Admin role required");
    } */
  });

  /**
   * ======================================================
   * EMPLOYEES VALIDATIONS
   * ======================================================
   */

  /**
   * BEFORE CREATE / UPDATE Employees
   * - Validate mandatory business rules
   * - Enforce email uniqueness
   */
  this.before(["CREATE", "UPDATE"], Employees, async (req) => {
    const { Email, EmployeeNumber } = req.data;

    if (Email) {
      const existingEmployee = await cds
        .tx(req)
        .run(SELECT.one(Employees).from(Employees).where({ Email }));

      if (existingEmployee && existingEmployee.ID !== req.data.ID) {
        req.reject(400, `Employee with email '${Email}' already exists`);
      }
    }

    if (EmployeeNumber) {
      const existingEmployee = await cds
        .tx(req)
        .run(SELECT.one(Employees).from(Employees).where({ EmployeeNumber }));

      if (existingEmployee && existingEmployee.ID !== req.data.ID) {
        req.reject(
          400,
          `Employee with employee number '${EmployeeNumber}' already exists`
        );
      }
    }
  });

  /**
   * BEFORE DELETE Employees
   * - Active employees cannot be deleted
   * - Employees who are managers cannot be deleted
   */
  this.before("DELETE", Employees, async (req) => {
    const { ID } = req.data;

    // Check if employee is active
    const employee = await cds
      .tx(req)
      .run(SELECT.one(Employees).from(Employees).where({ ID }));

    if (!employee) {
      req.reject(404, `Employee not found`);
    }

    if (employee.IsActive) {
      req.reject(400, `Active employees cannot be deleted`);
    }

    const hasReports = await cds
      .tx(req)
      .run(SELECT.one(Employees).from(Employees).where({ Manager_ID: ID }));

    if (hasReports) {
      req.reject(400, `Employee is a manager and cannot be deleted`);
    }
  });

  /**
   * ======================================================
   * EXPENSE TYPES VALIDATIONS
   * ======================================================
   */

  /**
   * BEFORE CREATE / UPDATE ExpenseTypes
   * - Validate policy consistency
   */
  this.before(["CREATE", "UPDATE"], ExpenseTypes, async (req) => {
    const { ReceiptRequired, MaxAmount, Active } = req.data;

    // If receipt is NOT required, max amount must be defined
    if (
      ReceiptRequired === false &&
      (MaxAmount === null || MaxAmount === undefined)
    ) {
      req.reject(400, `MaxAmount must be defined when ReceiptRequired is false`);
    }

    // Max amount must be positive if defined
    if (MaxAmount !== null && MaxAmount !== undefined && MaxAmount <= 0) {
      req.reject(400, `MaxAmount must be a positive value`);
    }

    // Inactive types should not be modifable
    if (Active === false && req.method === "UPDATE") {
      req.reject(400, `Inactive expense types cannot be modified`);
    }
  });

  /**
   * BEFORE DELETE ExpenseTypes
   * - Prevent deletion of active types
   */
  this.before("DELETE", ExpenseTypes, async (req) => {
    const { ID } = req.data;

    const expenseType = await cds
      .tx(req)
      .run(SELECT.one(ExpenseTypes).from(ExpenseTypes).where({ ID }));

    if (!expenseType) {
      req.reject(404, `Expense type not found`);
    }

    if (expenseType.Active) {
      req.reject(400, `Active expense types cannot be deleted`);
    }
  });
});
