const cds = require('@sap/cds');

module.exports = class ExpenseService extends cds.ApplicationService {
  async init() {
    const { ExpenseRequests, ExpenseApprovals, ExpenseItems } = this.entities
    const { Employees, NumberRanges, ExpenseTypes } = cds.entities('my.expense')

    async function getCurrentEmployee(req) {
      const oEmployee = await SELECT.one.from(Employees).where({ Email: req.user.id });
      if (!oEmployee) req.reject(403, 'Employee not found');
      return oEmployee;
    }

    this.on("userInfo", req => ({ ID: req.user.id, Roles: Object.keys(req.user.roles) }));

    async function sumItems(req, items) {
      let nTotalAmount = 0;
      let nTotalRequestedAmount = 0;
      if (!Array.isArray(items)) return { nTotalAmount, nTotalRequestedAmount };

      const aCodes = items.map(i => i.ExpenseType_Code);
      const aExpenseTypes = await SELECT.from(ExpenseTypes).where({ Code: { "IN": aCodes }, Active: true });

      const dMaxDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      for (const item of items) {
        const oExpenseType = aExpenseTypes.find(t => t.Code === item.ExpenseType_Code);
        if (!oExpenseType) req.reject(400, `Invalid Expense Type ${item.ExpenseType_Code}`);
        if (item.ExpenseDate && new Date(item.ExpenseDate) > dMaxDate) req.reject(400, `Expense date cannot be in the future`);
        if (!(Number(item.Amount) > 0)) req.reject(400, `Amount must be greater than 0`);
        if (Number(oExpenseType.MaxAmount) > 0 && Number(item.Amount) > Number(oExpenseType.MaxAmount) && !item.Justification?.trim())
          req.reject(400, `Justification is required when amount exceeds the maximum of ${oExpenseType.Code}`);

        nTotalAmount += (Number(oExpenseType.MaxAmount) > 0 && Number(item.Amount) > Number(oExpenseType.MaxAmount))
          ? Number(oExpenseType.MaxAmount) : Number(item.Amount);
        nTotalRequestedAmount += Number(item.Amount);
      }

      return { nTotalAmount, nTotalRequestedAmount };
    }

    async function getNextRequestNumber(req) {
      const sYear = String(new Date().getFullYear());

      const iUpdated = await UPDATE(NumberRanges).set({ LastNumber: { '+=': 1 } }).where({ Year: sYear });
      if (iUpdated === 0) req.reject(500, `Number range for ${sYear} is not maintained`);
      const oNumberRange = await SELECT.one.from(NumberRanges).where({ Year: sYear });
      return `REQ-${sYear}-${String(oNumberRange.LastNumber).padStart(6, "0")}`
    }

    this.before('CREATE', ExpenseRequests, async (req) => {
      const oEmployee = await getCurrentEmployee(req);
      req.data.Employee_ID = oEmployee.ID;

      const { nTotalAmount, nTotalRequestedAmount } = await sumItems(req, req.data.ExpenseItems);
      req.data.TotalAmount = nTotalAmount;
      req.data.TotalRequestedAmount = nTotalRequestedAmount;
      req.data.Status = 'Draft';
    });

    this.before('UPDATE', ExpenseRequests, async (req) => {
      const oExpenseRequest = await SELECT.one.from(req.subject)
      if (!oExpenseRequest) req.reject(404, 'Request not found');

      if (oExpenseRequest.Status !== 'Draft') req.reject(409, `Only draft requests can be edited`);

      const oEmployee = await getCurrentEmployee(req);

      if (oExpenseRequest.Employee_ID !== oEmployee.ID) req.reject(403, `Only owner can Edit`);
      req.data.Employee_ID = oEmployee.ID;

      const { nTotalAmount, nTotalRequestedAmount } = await sumItems(req, req.data.ExpenseItems);
      req.data.TotalAmount = nTotalAmount;
      req.data.TotalRequestedAmount = nTotalRequestedAmount;
      req.data.Status = 'Draft';
    });

    this.on('submit', ExpenseRequests, async (req) => {
      const ID = req.params[0].ID;

      const oExpenseRequest = await SELECT.one.from(req.subject)
      if (!oExpenseRequest) req.reject(404, 'Request not found');

      if (oExpenseRequest.Status !== 'Draft') req.reject(409, `Only draft requests can be submitted`);

      const oEmployee = await getCurrentEmployee(req);

      if (oExpenseRequest.Employee_ID !== oEmployee.ID) req.reject(403, `Only owner can Submit`);

      const expenseItems = await SELECT.from(ExpenseItems).where({ ExpenseRequest_ID: oExpenseRequest.ID });
      if (expenseItems.length === 0) req.reject(400, 'Request must have minimum 1 Expense Item');
      const { nTotalAmount, nTotalRequestedAmount } = await sumItems(req, expenseItems);
      const requestNumber = await getNextRequestNumber(req);

      await UPDATE(ExpenseRequests)
        .set({
          Status: 'Submitted', SubmissionDate: new Date(), TotalAmount: nTotalAmount,
          TotalRequestedAmount: nTotalRequestedAmount, RequestNumber: requestNumber,
          CurrentApprover_ID: oEmployee.Manager_ID
        })
        .where({ ID });

      return { Status: 'Submitted' };
    });

    async function decide(req, decision) {
      const ID = req.params[0].ID;

      const oExpenseRequest = await SELECT.one.from(req.subject)
      if (!oExpenseRequest) req.reject(404, 'Request not found');

      if (oExpenseRequest.Status !== 'Submitted' && oExpenseRequest.Status !== 'Inprogress') req.reject(409, `Only submitted requests can be ${decision.toLowerCase()}`);
      const sReason = req.data.Reason?.trim();
      if (decision === 'Rejected' && !sReason) req.reject(400, 'Reject must fill reason');

      const oEmployee = await getCurrentEmployee(req);

      const sDecision = (decision === 'Approved' && oEmployee.Manager_ID) ? 'Inprogress' : decision;
      const sCurrentApprover_ID = (decision !== 'Rejected') ? oEmployee.Manager_ID : '';

      await UPDATE(ExpenseRequests)
        .set({ Status: sDecision, ApprovalDate: new Date(), Approver_ID: oEmployee.ID, CurrentApprover_ID: sCurrentApprover_ID })
        .where({ ID });

      await INSERT.into(ExpenseApprovals)
        .entries({
          ExpenseRequest_ID: ID, Approver_ID: oEmployee.ID,
          Decision: decision, DecisionDate: new Date(), Reason: sReason
        })

      return { Status: sDecision };
    }

    this.on('approve', ExpenseRequests, (req) => decide(req, 'Approved'));
    this.on('decline', ExpenseRequests, (req) => decide(req, 'Rejected'));

    this.on('reimburse', ExpenseRequests, async (req) => {
      const ID = req.params[0].ID;

      const oExpenseRequest = await SELECT.one.from(req.subject)
      if (!oExpenseRequest) req.reject(404, 'Request not found');

      const totalAcceptedAmount = Number(req.data.TotalAcceptedAmount);
      if (!(totalAcceptedAmount > 0)) req.reject(400, "Total accepted amount must greather than 0");
      if (totalAcceptedAmount > Number(oExpenseRequest.TotalRequestedAmount)) req.reject(400, "Total accepted amount maximum is equal with total requested amount");

      if (oExpenseRequest.Status !== 'Approved') req.reject(409, `Only approved requests can be reimbursed`);

      const oEmployee = await getCurrentEmployee(req);

      await UPDATE(ExpenseRequests)
        .set({ Status: 'Reimbursed', ReimbursedDate: new Date(), ReimbursedBy_ID: oEmployee.ID, TotalAcceptedAmount: totalAcceptedAmount })
        .where({ ID });

      return { Status: 'Reimbursed' };
    });

    return super.init()
  }
}