using {my.expense as db} from '../db/schema';

@requires: 'authenticated-user'
service MasterDataService {
    @requires: 'admin'
    @odata.draft.enabled
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
    @odata.draft.enabled
    entity ExpenseTypes as projection on db.ExpenseTypes;

    @restrict: [
        {
            grant: ['READ'],
            to   : 'authenticated-user'
        },
        {
            grant: '*',
            to   : 'admin'
        }
    ]
    @odata.draft.enabled
    entity NumberRanges as projection on db.NumberRanges;
}
