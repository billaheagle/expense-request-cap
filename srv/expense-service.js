const cds = require("@sap/cds");
const e = require("express");

module.exports = cds.service.impl(async function () {
  const { ExpenseRequests, ExpenseItems, ExpenseApprovals } = this.entities;

  /**
   * Recalculate TotalAmount for an ExpenseRequest
   */
  async function calculateTotalAmount(req) {
    const items =
      req.data.ExpenseItems ||
      (await cds
        .tx(req)
        .run(
          SELECT.from(ExpenseItems).where({ ExpenseRequest_ID: req.data.ID })
        ));

    const total = items.reduce(
      (sum, item) => sum + Number(item.Amount || 0),
      0
    );

    return total;
  }

  /**
   * Get current Employee based on logged-in user
   */
  async function getCurrentEmployee(req) {
    const userId = req.user.id;
    const employee = await cds
      .tx(req)
      .run(SELECT.one.from("my.expense.Employees").where({ Email: userId }));

    if (!employee) {
      req.reject(403, "No employee found for the current user.");
    }
    return employee;
  }

  /**
   * BEFORE CREATE ExpenseRequest
   * - Derive Employee from logged-in user
   */

  this.before("CREATE", ExpenseRequests.drafts, async (req) => {
    // 1. Ensure user is authenticated

    if (!req.user.is("employee")) {
      req.reject(403, "Only employees are allowed to submit expense requests.");
    }

    // 2. Find employee by Email
    const employee = await getCurrentEmployee(req);

    // 3. Force Employee_ID
    req.data.Employee_ID = employee.ID;

    const total = await calculateTotalAmount(req);
    req.data.TotalAmount = total;
  });

  /**
   * BEFORE ACTIVATE DRAFT
   * → ensure total is correct before submit
   */
  this.before("CREATE", ExpenseRequests, async (req) => {
    const ID = req.data.ID;

    if (!req.user.is("employee")) {
      req.error(403, "Only employees are allowed to submit expense requests.");
    }

    if (ID) {
      const total = await calculateTotalAmount(req);
      req.data.TotalAmount = total;
    }

    // Only generate if not already set (safety)
    if (!req.data.RequestNumber) {
      const year = new Date().getFullYear();

      const result = await cds.tx(req).run(
        SELECT.one.from(ExpenseRequests)
          .columns`max(RequestNumber) as max`.where({
          RequestNumber: { like: `REQ-${year}-%` },
        })
      );

      let next = 1;
      if (result?.max) {
        const last = parseInt(result.max.split("-").pop());
        next = last + 1;
      }

      req.data.RequestNumber = `REQ-${year}-${String(next).padStart(6, "0")}`;
    }

    req.data.SubmissionDate = new Date();
    req.data.Status = "Submitted";
  });

  /**
   * ======================================================
   * EXPENSE REQUESTS VALIDATIONS
   * ======================================================
   */

  this.on("approve", ExpenseRequests, async (req) => {
    const ID = req.params[0].ID;

    const employee = await getCurrentEmployee(req);
    const tx = cds.tx(req);

    if (!req.user.is("manager")) {
      req.reject(403, "Only managers are allowed to approve expense requests.");
    }

    // Only Submitted requests can be approved
    const expenseRequest = await tx.run(
      SELECT.one.from(ExpenseRequests).where({ ID })
    );
    if (!expenseRequest) {
      req.reject(404, "Expense request not found");
    }
    if (expenseRequest.Status !== "Submitted") {
      req.reject(400, "Only submitted expense requests can be approved.");
    }

    await tx
      .update(ExpenseRequests)
      .set({
        Status: "Approved",
        ApprovalDate: new Date(),
        Approver_ID: employee.ID,
      })
      .where({ ID });

    await tx.run(
      INSERT.into(ExpenseApprovals).entries({
        ExpenseRequest_ID: ID,
        Approver_ID: employee.ID,
        Decision: "Approved",
        DecisionDate: new Date(),
      })
    );

    return { Status: "Approved" };
  });

  this.on("reject", ExpenseRequests, async (req) => {
    const ID = req.params[0].ID;
    const { Comments } = req.data;
    const tx = cds.tx(req);

    console.log("Req", req);

    const employee = await getCurrentEmployee(req);

    if (!req.user.is("manager")) {
      req.reject(403, "Only managers are allowed to reject expense requests.");
    }

    // only Submitted requests can be rejected
    const expenseRequest = await tx.run(
      SELECT.one.from(ExpenseRequests).where({ ID })
    );
    if (!expenseRequest) {
      req.reject(404, "Expense request not found");
    }
    if (expenseRequest.Status !== "Submitted") {
      req.reject(400, "Only submitted expense requests can be rejected.");
    }

    if (!Comments || Comments.trim() === "") {
      req.reject(400, "Rejection comments are required.");
    }

    await tx
      .update(ExpenseRequests)
      .set({
        Status: "Rejected",
        ApprovalDate: new Date(),
        Approver_ID: employee.ID,
      })
      .where({ ID });

    await tx.run(
      INSERT.into(ExpenseApprovals).entries({
        ExpenseRequest_ID: ID,
        Approver_ID: employee.ID,
        Decision: "Rejected",
        DecisionDate: new Date(),
        Comments: Comments,
      })
    );

    return { Status: "Rejected" };
  });

  this.on("reimburse", ExpenseRequests, async (req) => {
    const ID = req.params[0].ID;
    const employee = await getCurrentEmployee(req);
    const tx = cds.tx(req);

    if (!req.user.is("finance")) {
      req.reject(
        403,
        "Only finance team members are allowed to reimburse expense requests."
      );
    }

    // Only Approved requests can be reimbursed
    const expenseRequest = await tx.run(
      SELECT.one.from(ExpenseRequests).where({ ID })
    );
    if (!expenseRequest) {
      req.reject(404, "Expense request not found");
    }
    if (expenseRequest.Status !== "Approved") {
      req.reject(400, "Only approved expense requests can be reimbursed.");
    }

    await tx
      .update(ExpenseRequests)
      .set({
        Status: "Reimbursed",
        ReimbursedDate: new Date(),
        ReimbursedBy_ID: employee.ID,
      })
      .where({ ID });

    return { Status: "Reimbursed" };
  });
});
