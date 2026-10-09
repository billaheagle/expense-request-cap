sap.ui.define([
],
    function () {
        "use strict";

        return {
            formatDate(sValue) {
                if (!sValue) return "";
                const [sYear, sMonth, sDay] = sValue.split("-");
                return `${sDay}/${sMonth}/${sYear}`;
            },

            formatStatusState(sStatus) {
                switch (sStatus) {
                    case "Approved":
                    case "Reimbursed":
                        return "Success";
                    case "Submitted":
                        return "Warning";
                    case "Rejected":
                        return "Error";
                    default:
                        return "None";
                }
            },
        }
    }
)