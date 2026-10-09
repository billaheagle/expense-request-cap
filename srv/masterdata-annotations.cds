using MasterDataService as service from './masterdata-service';

annotate service.NumberRanges with {
    Year       @title: 'Year';
    LastNumber @title: 'Last Number';
};

annotate service.NumberRanges with @(
    UI.HeaderInfo     : {
        TypeName      : 'Number Range',
        TypeNamePlural: 'Number Ranges',
        Title         : {Value: Year}
    },
    UI.SelectionFields: [Year],
    UI.LineItem       : [
        {Value: Year},
        {Value: LastNumber}
    ]
);


annotate service.Employees with {
    ID             @UI.Hidden;
    EmployeeNumber @title: 'Employee No.';
    FirstName      @title: 'First Name';
    LastName       @title: 'Last Name';
    Email          @title: 'Email';
    CostCenter     @title: 'Cost Center';
    Country        @title: 'Country';
    Active         @title: 'Active';
    Manager        @title                 : 'Manager'
                   @Common.Text           : Manager.LastName
                   @Common.TextArrangement: #TextFirst;
};

annotate service.Employees with @(
    UI.HeaderInfo              : {
        TypeName      : 'Employee',
        TypeNamePlural: 'Employees',
        Title         : {Value: LastName},
        Description   : {Value: EmployeeNumber},
    },
    UI.SelectionFields         : [
        EmployeeNumber,
        Email,
        CostCenter,
        Active
    ],
    UI.LineItem                : [
        {Value: EmployeeNumber},
        {Value: FirstName},
        {Value: LastName},
        {Value: Email},
        {Value: CostCenter},
        {Value: Country_code},
        {Value: Active}
    ],
    UI.FieldGroup #General     : {Data: [
        {Value: EmployeeNumber},
        {Value: FirstName},
        {Value: LastName},
        {Value: Email},
        {Value: Active}
    ]},
    UI.FieldGroup #Organization: {Data: [
        {Value: Manager_ID},
        {Value: CostCenter},
        {Value: Country_code}
    ]},
    UI.Facets                  : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'General',
            Label : 'General Information',
            Target: '@UI.FieldGroup#General'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Organization',
            Label : 'Organization',
            Target: '@UI.FieldGroup#Organization'
        }
    ]
);

annotate service.Employees with @cds.odata.valuelist;

annotate service.ExpenseTypes with {
    Code            @title: 'Code';
    Description     @title: 'Description'  @mandatory;
    ReceiptRequired @title: 'Receipt Required';
    MaxAmount       @title: 'Max Amount';
    Active          @title: 'Active';
};

annotate service.ExpenseTypes with @(
    UI.HeaderInfo         : {
        TypeName      : 'Expense Type',
        TypeNamePlural: 'Expense Types',
        Title         : {Value: Description},
        Description   : {Value: Code}
    },
    UI.SelectionFields    : [
        Code,
        Active
    ],
    UI.LineItem           : [
        {Value: Code},
        {Value: Description},
        {Value: ReceiptRequired},
        {Value: MaxAmount},
        {Value: Active}
    ],
    UI.FieldGroup #General: {Data: [
        {Value: Code},
        {Value: Description},
        {Value: Active}
    ]},
    UI.FieldGroup #Policy : {Data: [
        {Value: ReceiptRequired},
        {Value: MaxAmount}
    ]},
    UI.Facets             : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'General',
            Label : 'General Information',
            Target: '@UI.FieldGroup#General'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Policy',
            Label : 'Policy',
            Target: '@UI.FieldGroup#Policy'
        }
    ]
);
