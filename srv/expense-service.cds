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

            action decline(Reason: String)                        returns {
                @mandatory Status : String;
            };

            action reimburse(TotalAcceptedAmount: Decimal(15, 2)) returns {
                @mandatory Status : String;
            };
        };

    function userInfo() returns {
        @mandatory ID    : String;
        @mandatory Roles : array of String;
    }

    @readonly
    entity Employees        as
        projection on db.Employees {
            ID,
            FirstName,
            LastName,
            Email,
            Manager
        };

    @readonly
    entity ExpenseApprovals as projection on db.ExpenseApprovals;
}
