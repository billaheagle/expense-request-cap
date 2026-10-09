using {my.expense as db} from '../db/schema';

@requires: 'authenticated-user'
service ExpenseService {
    @odata.draft.enabled
    @restrict: [
        { grant: ['READ', 'UPDATE', 'DELETE', 'submit'], to: 'employee', where: 'Employee.Email = $user' },
        { grant: 'CREATE', to: 'employee' },
        { grant: ['READ', 'approve', 'reject'], to: 'manager', where: 'Employee.Manager.Email = $user' },
        { grant: ['READ', 'reimburse'], to: 'finance' },
    ]
    entity ExpenseRequests as
        projection on db.ExpenseRequests {
            *,
            RequestNumber @readonly,
            Status        @readonly,
        }
        actions {
            action submit()                 returns {
                @mandatory Status : String;
            };

            action approve()                returns {
                @mandatory Status : String;
            };

            action reject(Comments: String) returns {
                @mandatory Status : String;
            };

            action reimburse()              returns {
                @mandatory Status : String;
            };
        };

    @readonly
    entity Employees       as
        projection on db.Employees {
            ID,
            FirstName,
            LastName,
            Email,
            Manager
        };
}
