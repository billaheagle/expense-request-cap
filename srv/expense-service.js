const cds = require('@sap/cds')

module.exports = class ExpenseService extends cds.ApplicationService {
  async init() {
    const { ExpenseRequests, ExpenseApprovals } = this.entities
    const { Employees } = cds.entities('my.expense')

    async function getCurrentEmployee(req) {
      const employee = await SELECT.one.from(Employees).where({ Email: req.user.id });
      if (!employee) req.reject(403, 'Employee not found');
      return employee;
    }

    function sumItems(items) {
      let result = 0;
      if (!Array.isArray(items)) return result;

      for (const item of items) {
        result += Number(item.Amount) || 0;
      }

      return result;
    }

    this.before('CREATE', ExpenseRequests.drafts, async (req) => {
      if (!req.user.is("employee")) req.reject(403, 'Only employees can create expense requests');
      const employee = await getCurrentEmployee(req);
      req.data.Employee_ID = employee.ID;
      req.data.TotalAmount = sumItems(req.data.ExpenseItems);
    })

    async function getNextRequestNumber() {
      const year = new Date().getFullYear();
      const last = await SELECT.one.from(ExpenseRequests).columns('RequestNumber')
        .where({ RequestNumber: { 'LIKE': `REQ-${year}-%` } })
        .orderBy('RequestNumber desc');

      let next = 1;
      if (last?.RequestNumber) {
        const [, , , seq] = last.RequestNumber.match(/^(\w+)-(\d{4})-(\d+)$/);
        next = parseInt(seq, 10) + 1;
      }
      return `REQ-${year}-${String(next).padStart(6, "0")}`
    }

    this.before('CREATE', ExpenseRequests, async (req) => {
      if (!req.user.is("employee")) req.reject(403, 'Only employees can create expense requests');

      const employee = await getCurrentEmployee(req);
      req.data.Employee_ID = employee.ID;

      if (!Array.isArray(req.data.ExpenseItems) || req.data.ExpenseItems.length === 0) req.reject(400, 'Request must have minimum 1 Expense Item');
      req.data.TotalAmount = sumItems(req.data.ExpenseItems);
      req.data.RequestNumber = await getNextRequestNumber();
      req.data.SubmissionDate = new Date();
      req.data.Status = 'Submitted';
    });

    async function decide(req, decision) {
      if (!req.user.is("manager")) req.reject(403, 'Only manager can decide this requests');
      const ID = req.params[0].ID;

      const expenseRequest = await SELECT.one.from(ExpenseRequests).where({ ID });
      if (!expenseRequest) req.reject(404, 'Request not found');

      if (expenseRequest.Status !== 'Submitted') req.reject(409, `Only submitted requests can be ${decision.toLowerCase()}`);
      const comments = req.data.Comments?.trim();
      if (decision === 'Rejected' && !comments) req.reject(400, 'Reject must fill comments');

      const employee = await getCurrentEmployee(req);

      await UPDATE(ExpenseRequests)
        .set({ Status: decision, ApprovalDate: new Date(), Approver_ID: employee.ID })
        .where({ ID });

      await INSERT.into(ExpenseApprovals)
        .entries({
          ExpenseRequest_ID: ID, Approver_ID: employee.ID,
          Decision: decision, DecisionDate: new Date(), Comments: comments
        })

      return { Status: decision };
    }

    this.on('approve', ExpenseRequests, (req) => decide(req, 'Approved'));
    this.on('reject', ExpenseRequests, (req) => decide(req, 'Rejected'));

    this.on('reimburse', ExpenseRequests, async (req) => {
      if (!req.user.is("finance")) req.reject(403, 'Only finance can run this process');
      const ID = req.params[0].ID;

      const expenseRequest = await SELECT.one.from(ExpenseRequests).where({ ID });
      if (!expenseRequest) req.reject(404, 'Request not found');

      if (expenseRequest.Status !== 'Approved') req.reject(409, `Only approved requests can be reimbursed`);

      const employee = await getCurrentEmployee(req);

      await UPDATE(ExpenseRequests)
        .set({ Status: 'Reimbursed', ReimbursedDate: new Date(), ReimbursedBy_ID: employee.ID })
        .where({ ID });

      return { Status: 'Reimbursed' };
    });

    return super.init()
  }
}