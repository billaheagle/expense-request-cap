using {my.expense as db} from '../db/schema';

service MasterDataService {
    // @requires: 'Admin'
    entity Employees    as projection on db.Employees;

    // @requires: 'Admin'
    entity ExpenseTypes as projection on db.ExpenseTypes;
}
