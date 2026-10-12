using {my.expense as db} from '../db/schema';

@requires: 'authenticated-user'
service ExpenseService {
    @odata.draft.enabled
    @restrict: [
        {
            grant: 'CREATE',
            to   : 'employee'
        },
        {
            grant: ['READ', ],
            to   : 'employee',
            where: 'Employee.Email = $user'
        },
        {
            grant: [
                'UPDATE',
                'DELETE',
                'submit'
            ],
            to   : 'employee',
            where: `Employee.Email = $user AND Status = 'Draft'`
        },
        {
            grant: [
                'approve',
                'decline'
            ],
            to   : 'manager',
            where: 'CurrentApprover.Email = $user'
        },
        {
            grant: 'READ',
            to   : 'manager',
            where: `Employee.Manager.Email = $user
                    or CurrentApprover.Email = $user
                    or exists ExpenseApprovals[Approver.Email = $user]`
        },
        {
            grant: [
                'READ',
                'reimburse'
            ],
            to   : 'finance',
            where: `Status = 'Approved' OR Status = 'Reimbursed'`
        }
    ]
    entity ExpenseRequests  as
        projection on db.ExpenseRequests {
            *,
            RequestNumber        @readonly,
            Currency             @mandatory,
            Notes                @mandatory,
            Employee             @readonly,
            Status               @readonly,
            SubmissionDate       @readonly,
            ApprovalDate         @readonly,
            Approver             @readonly,
            CurrentApprover      @readonly,
            TotalAmount          @readonly,
            TotalRequestedAmount @readonly,
            TotalAcceptedAmount  @readonly,
            ReimbursedDate       @readonly,
            ReimbursedBy         @readonly,
            ExpenseApprovals     @readonly,
        }
        actions {
            action submit()                                       returns {
                @mandatory Status : String;
            };

            action approve()                                      returns {
                @mandatory Status : String;
            };

            action decline(Reason: String @mandatory)                        returns {
                @mandatory Status : String;
            };

            action reimburse(TotalAcceptedAmount: Decimal(15, 2) @mandatory) returns {
                @mandatory Status : String;
            };
        };

    function userInfo() returns {
        @mandatory ID    : String;
        @mandatory Roles : array of String;
    }

    @restrict: [
        {
            grant: 'READ',
            to   : 'employee',
            where: 'ExpenseRequest.Employee.Email = $user'
        },
        {
            grant: [
                'CREATE',
                'UPDATE',
                'DELETE'
            ],
            to   : 'employee',
            where: `ExpenseRequest.Employee.Email = $user AND ExpenseRequest.Status = 'Draft'`
        },
        {
            grant: 'READ',
            to   : 'manager',
            where: `ExpenseRequest.Employee.Manager.Email = $user
                    or ExpenseRequest.CurrentApprover.Email = $user
                    or exists ExpenseRequest.ExpenseApprovals[Approver.Email = $user]`
        },
        {
            grant: 'READ',
            to   : 'finance',
            where: `ExpenseRequest.Status = 'Approved' OR ExpenseRequest.Status = 'Reimbursed'`
        }
    ]
    entity ExpenseItems     as projection on db.ExpenseItems;
    
    @readonly
    @restrict: [
        {
            grant: 'READ',
            to   : 'employee',
            where: 'ExpenseRequest.Employee.Email = $user'
        },
        {
            grant: 'READ',
            to   : 'manager',
            where: `ExpenseRequest.Employee.Manager.Email = $user
                    or ExpenseRequest.CurrentApprover.Email = $user
                    or exists ExpenseRequest.ExpenseApprovals[Approver.Email = $user]`
        },
        {
            grant: 'READ',
            to   : 'finance',
            where: `ExpenseRequest.Status = 'Approved' OR ExpenseRequest.Status = 'Reimbursed'`
        }
    ]
    entity ExpenseApprovals as projection on db.ExpenseApprovals;

    @readonly
    @requires: [
        'employee',
        'manager',
        'finance'
    ]
    entity Employees        as
        projection on db.Employees {
            ID,
            FirstName,
            LastName,
            Email,
            Manager
        };
}
