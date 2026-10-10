sap.ui.define([
],
    function () {
        "use strict";

        return {
            formatDate(sValue) {
                console.log(sValue)
                if (!sValue) return "";
                sValue = sValue.slice(0, 10);
                const [sYear, sMonth, sDay] = sValue.split("-");
                return `${sDay}/${sMonth}/${sYear}`;
            },

            formatDateTime(sValue) {
                if (!sValue)  return "";
                const oDate = new Date(sValue);
                const day = String(oDate.getDate()).padStart(2, "0");
                const month = String(oDate.getMonth() + 1).padStart(2, "0");
                const year = oDate.getFullYear();
                return `${day}/${month}/${year}`;
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