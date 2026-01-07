namespace my.expense;

using {
    Country,
    cuid,
    Currency,
    managed,
} from '@sap/cds/common';

type Status   : String enum {
    Draft = 'Draft';
    Submitted = 'Submitted';
    Approved = 'Approved';
    Rejected = 'Rejected';
    Reimbursed = 'Reimbursed';
}

type Decision : String enum {
    Approved = 'Approved';
    Rejected = 'Rejected';
}

entity Employees : cuid, managed {
    EmployeeNumber : String(10) not null;
    FirstName      : String(40) not null;
    LastName       : String(40) not null;
    Email          : String(100) not null;
    Manager        : Association to Employees;
    CostCenter     : String(10) not null;
    Country        : Country not null;
    Active         : Boolean default true not null;
}

/* entity ExpenseTypes : cuid, managed {
    Code            : String(10) not null;
    Description     : String(50) not null;
    ReceiptRequired : Boolean not null;
    MaxAmount       : Decimal(15, 2);
    Active          : Boolean default true not null;
} */

entity ExpenseTypes : managed {
    key Code            : String(10) not null;
        Description     : String(50) not null;
        ReceiptRequired : Boolean not null;
        MaxAmount       : Decimal(15, 2);
        Active          : Boolean default true not null;
}

@odata.draft.enabled
entity ExpenseRequests : cuid, managed {
    RequestNumber    : String(15) not null;
    Notes            : String(255) not null;
    Employee         : Association to Employees not null;
    Status           : Status default #Draft not null;
    SubmissionDate   : DateTime not null;
    ApprovalDate     : DateTime;
    Approver         : Association to Employees;
    TotalAmount      : Decimal(15, 2) not null;
    Currency         : Currency not null;
    ReimbursedDate   : DateTime;
    ReimbursedBy     : Association to Employees;
    ExpenseItems     : Composition of many ExpenseItems
                           on ExpenseItems.ExpenseRequest = $self;
    ExpenseApprovals : Composition of many ExpenseApprovals
                           on ExpenseApprovals.ExpenseRequest = $self;
}

entity ExpenseItems : cuid, managed {
    ExpenseRequest : Association to ExpenseRequests not null;
    ExpenseType    : Association to ExpenseTypes not null;
    ExpenseDate    : DateTime not null;
    Amount         : Decimal(15, 2) not null;
    Description    : String(255);
    ReceiptId      : String(36);
    Justification  : String(255);
}

entity ExpenseApprovals : cuid, managed {
    ExpenseRequest : Association to ExpenseRequests not null;
    Approver       : Association to Employees not null;
    Decision       : Decision not null;
    DecisionDate   : DateTime not null;
    Comments       : String(255);
}
