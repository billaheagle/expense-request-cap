using {my.expense as db} from '../db/schema';

service ExpenseService {
    @odata.draft.enabled
    entity ExpenseRequests as projection on db.ExpenseRequests
        actions {
            // @requires: 'Manager'
            action approve()                returns {
                @mandatory Status : String;
            };

            // @requires: 'Manager'
            action reject(Comments: String) returns {
                @mandatory Status : String;
            };

            // @requires: 'Finance'
            action reimburse()              returns {
                @mandatory Status : String;
            };
        };
}
