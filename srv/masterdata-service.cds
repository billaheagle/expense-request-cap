using {my.expense as db} from '../db/schema';

@requires: 'authenticated-user'
service MasterDataService {
    @requires: 'admin'
    entity Employees    as projection on db.Employees;

    @restrict: [
        {
            grant: 'READ',
            to   : 'authenticated-user'
        },
        {
            grant: '*',
            to   : 'admin'
        }
    ]
    entity ExpenseTypes as projection on db.ExpenseTypes;
}
