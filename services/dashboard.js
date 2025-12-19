const BaseService = require(".");
const User = require("../models/User");
const Inquiry = require("../models/inquiry");

class GetdashboardService extends BaseService {
    constructor(req, res, reqQuery) {
        super();
        this.req = req;
        this.res = res;
        this.reqQuery = reqQuery;
    }

    async getdashboardData(companyId) {
        try {
            const [studentCount, employeeCount, facultyCount, inquiries] = await Promise.all([
                User.countDocuments({ role: 'Student', company_id: companyId, deleted_at: null }),
                User.countDocuments({ role: 'Employee', company_id: companyId, deleted_at: null  }),
                User.countDocuments({ role: 'Faculty', company_id: companyId, deleted_at: null  }),
                Inquiry.countDocuments({ company_id: companyId, deleted_at: null })
            ]);

            return { studentCount, employeeCount, facultyCount, inquiries };
        } catch (error) {
            throw new Error(`Error in getdashboardData: ${error.message}`);
        }
    }
}

module.exports = GetdashboardService;