using {my.expense as db} from '../db/schema';

@requires: 'authenticated-user'
service MasterDataService {
    entity Employees    as projection on db.Employees;

    entity ExpenseTypes as projection on db.ExpenseTypes;
}
