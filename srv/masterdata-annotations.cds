using MasterDataService from './masterdata-service';

annotate MasterDataService.Employees with {
    @capabilities.Insertable: true
    @capabilities.Updatable : true
    @capabilities.Deletable : true

    @UI.HeaderInfo          : {
        TypeName      : 'Employee',
        TypeNamePlural: 'Employees',
        Title         : {Value: FirstName},
        Description   : {Value: EmployeeNumber}
    }

    @UI.SelectionFields     : [
        {Value: EmployeeNumber},
        {Value: Email},
        {Value: CostCenter},
        {Value: Active}
    ]

    @UI.LineItem            : [
        {
            Value: EmployeeNumber,
            Label: 'Employee No.'
        },
        {Value: FirstName},
        {Value: LastName},
        {Value: Email},
        {Value: Manager},
        {Value: CostCenter},
        {Value: Country},
        {Value: Active}
    ]

    @UI.Identification      : [
        {Value: EmployeeNumber},
        {Value: FirstName},
        {Value: LastName},
        {Value: Email}
    ]

    @UI.Facets              : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'General Information',
            Target: '@UI.FieldGroup#General'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Organization Information',
            Target: '@UI.FieldGroup#Organization'
        }
    ]

    EmployeeNumber @UI.FieldGroup #General;
    FirstName      @UI.FieldGroup #General;
    LastName       @UI.FieldGroup #General;
    Email          @UI.FieldGroup #General;
    CostCenter     @UI.FieldGroup #General;
    Country        @UI.FieldGroup #General;
    Active         @UI.FieldGroup #General;

    Manager        @UI.FieldGroup #Organization;
}

annotate MasterDataService.ExpenseTypes with {
    @capabilities.Insertable: true
    @capabilities.Updatable : true
    @capabilities.Deletable : true

    @UI.HeaderInfo          : {
        TypeName      : 'Expense Type',
        TypeNamePlural: 'Expense Types',
        Title         : {Value: Description},
        Description   : {Value: Code}
    }

    @UI.SelectionFields     : [
        {Value: Code},
        {Value: Description},
        {Value: Active}
    ]

    @UI.LineItem            : [
        {
            Value: Code,
            Label: 'Expense Type Code'
        },
        {Value: Description},
        {Value: ReceiptRequired},
        {Value: MaxAmount},
        {Value: Active}
    ]

    @UI.Identification      : [
        {Value: Code},
        {Value: Description}
    ]

    @UI.Facets              : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'General Information',
            Target: '@UI.FieldGroup#General'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Policy Information',
            Target: '@UI.FieldGroup#Policy'
        }
    ]

    Code            @UI.FieldGroup #General;
    Description     @UI.FieldGroup #General;
    ReceiptRequired @UI.FieldGroup #Policy;
    MaxAmount       @UI.FieldGroup #Policy;
    Active          @UI.FieldGroup #General;
}
