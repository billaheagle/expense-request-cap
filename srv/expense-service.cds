using {my.expense as db} from '../db/schema';

@requires: 'authenticated-user'
service ExpenseService {
    @odata.draft.enabled
    entity ExpenseRequests as projection on db.ExpenseRequests
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
            LastName
        };
}
