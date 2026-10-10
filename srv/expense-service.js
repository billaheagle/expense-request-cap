const cds = require('@sap/cds');

module.exports = class ExpenseService extends cds.ApplicationService {
  async init() {
    const { ExpenseRequests, ExpenseApprovals, ExpenseItems } = this.entities
    const { Employees, NumberRanges, ExpenseTypes } = cds.entities('my.expense')

    async function getCurrentEmployee(req) {
      const employee = await SELECT.one.from(Employees).where({ Email: req.user.id });
      if (!employee) req.reject(403, 'Employee not found');
      return employee;
    }

    this.on("userInfo", req => ({ ID: req.user.id, Roles: Object.keys(req.user.roles) }));

    async function sumItems(req, items) {
      let result = 0;
      if (!Array.isArray(items)) return result;

      const aCodes = items.map(i => i.ExpenseType_Code);
      const aExpenseTypes = await SELECT.from(ExpenseTypes).where({ Code: { "IN": aCodes }, Active: true });

      for (const item of items) {
        const oExpenseType = aExpenseTypes.find(t => t.Code === item.ExpenseType_Code);
        if (!oExpenseType) req.reject(400, `Invalid Expense Type ${item.ExpenseType_Code}`);
        result += (Number(oExpenseType.MaxAmount) > 0 && Number(item.Amount) > Number(oExpenseType.MaxAmount))
          ? Number(oExpenseType.MaxAmount) : Number(item.Amount);
      }

      return result;
    }

    async function getNextRequestNumber(req) {
      const year = String(new Date().getFullYear());

      const iUpdated = await UPDATE(NumberRanges).set({ LastNumber: { '+=': 1 } }).where({ Year: year });
      if (iUpdated === 0) req.reject(500, `Number range for ${year} is not maintained`);
      const oNumberRange = await SELECT.one.from(NumberRanges).where({ Year: year });
      return `REQ-${year}-${String(oNumberRange.LastNumber).padStart(6, "0")}`
    }

    this.before('CREATE', ExpenseRequests, async (req) => {
      const employee = await getCurrentEmployee(req);
      req.data.Employee_ID = employee.ID;

      req.data.TotalAmount = await sumItems(req, req.data.ExpenseItems);
      req.data.Status = 'Draft';
    });

    this.before('UPDATE', ExpenseRequests, async (req) => {
      const expenseRequest = await SELECT.one.from(req.subject)
      if (!expenseRequest) req.reject(404, 'Request not found');

      if (expenseRequest.Status !== 'Draft') req.reject(409, `Only draft requests can be edited`);

      const employee = await getCurrentEmployee(req);

      if (expenseRequest.Employee_ID !== employee.ID) req.reject(403, `Only owner can Edit`);
      req.data.Employee_ID = employee.ID;

      req.data.TotalAmount = await sumItems(req, req.data.ExpenseItems);
      req.data.Status = 'Draft';
    });

    this.on('submit', ExpenseRequests, async (req) => {
      const ID = req.params[0].ID;

      const expenseRequest = await SELECT.one.from(req.subject)
      if (!expenseRequest) req.reject(404, 'Request not found');

      if (expenseRequest.Status !== 'Draft') req.reject(409, `Only draft requests can be submitted`);

      const employee = await getCurrentEmployee(req);

      if (expenseRequest.Employee_ID !== employee.ID) req.reject(403, `Only owner can Submit`);

      const expenseItems = await SELECT.from(ExpenseItems).where({ ExpenseRequest_ID: expenseRequest.ID });
      if (expenseItems.length === 0) req.reject(400, 'Request must have minimum 1 Expense Item');
      const totalAmount = await sumItems(req, expenseItems);
      const requestNumber = await getNextRequestNumber(req);

      await UPDATE(ExpenseRequests)
        .set({ Status: 'Submitted', SubmissionDate: new Date(), TotalAmount: totalAmount, RequestNumber: requestNumber })
        .where({ ID });

      return { Status: 'Submitted' };
    });

    async function decide(req, decision) {
      const ID = req.params[0].ID;

      const expenseRequest = await SELECT.one.from(req.subject)
      if (!expenseRequest) req.reject(404, 'Request not found');

      if (expenseRequest.Status !== 'Submitted') req.reject(409, `Only submitted requests can be ${decision.toLowerCase()}`);
      const reason = req.data.Reason?.trim();
      if (decision === 'Rejected' && !reason) req.reject(400, 'Reject must fill reason');

      const employee = await getCurrentEmployee(req);

      await UPDATE(ExpenseRequests)
        .set({ Status: decision, ApprovalDate: new Date(), Approver_ID: employee.ID })
        .where({ ID });

      await INSERT.into(ExpenseApprovals)
        .entries({
          ExpenseRequest_ID: ID, Approver_ID: employee.ID,
          Decision: decision, DecisionDate: new Date(), Reason: reason
        })

      return { Status: decision };
    }

    this.on('approve', ExpenseRequests, (req) => decide(req, 'Approved'));
    this.on('decline', ExpenseRequests, (req) => decide(req, 'Rejected'));

    this.on('reimburse', ExpenseRequests, async (req) => {
      const ID = req.params[0].ID;

      const expenseRequest = await SELECT.one.from(req.subject)
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