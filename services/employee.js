const BaseService = require(".");
const { createHash } = require("../common/hash");
const User = require("../models/User");
const EmployeeModel = require("../models/employee");

class EmployeeService extends BaseService {
    constructor(req, res, reqQuery) {
        super();
        this.req = req;
        this.res = res;
        this.reqQuery = reqQuery;
    }

    async createEmployee(companyId,result) {

        const isEmailExist = await this.isEmpEmailExist(this.req.email)
        const isContactExist = await this.isEmpContactExist(this.req.contact)

        if (isEmailExist) {
            throw new Error("Employee with this email already exists");
        }
        if (isContactExist) {
            throw new Error("Employee with this contact already exists");
        }

        const tempPassword = `${this.req.firstName}${this.req.contact}#`
        const encryptedPassword = await createHash(tempPassword);

        const dbUser = new User({
            firstName: this.req.firstName,
            lastName: this.req.lastName,
            email: this.req.email,
            contact: this.req.contact,
            role: this.req.role,
            password: encryptedPassword,
            avatar_url: result,
            company_id: companyId,
        });

        const user = await dbUser.save();

        const payload = {
            ...this.req, address: {
                address_1: this.req.address_1,
                address_2: this.req.address_2,
                city: this.req.city,
                state: this.req.state,
                country: this.req.country,
                zipcode: this.req.zipcode,
            },
            company_id: companyId,
            emp_user_id: user._id,
            avatar_url: result
        }

        const dbEmp = new EmployeeModel(payload)

        const emp = await dbEmp.save();

        return emp.id;
    }

    async getAllEmployees(companyId) {

        const page = parseInt(this.reqQuery.page) || 1;
        const limit = parseInt(this.reqQuery.limit) || 10;
        const startIndex = (page - 1) * limit;

        let query = { deleted_at: null, company_id: companyId };
        const searchKey = this.reqQuery.searchKey;

        if (searchKey) {
            query = {
                deleted_at: null,
                $or: [
                    { firstName: { $regex: new RegExp(searchKey, 'i') } },
                    { email: { $regex: new RegExp(searchKey, 'i') } },
                    { contact: { $regex: new RegExp(searchKey, 'i') } },
                ],
            };
        }

        const employees = await EmployeeModel.find(query)
            .skip(startIndex)
            .limit(limit);

        const total = await EmployeeModel.countDocuments(query);

        const data = {
            employees,
            total,
            currentPage: page,
            per_page: limit,
            totalPages: Math.ceil(total / limit),
        };

        return data
    }

    async getEmployee(id) {
        const empId = id

        const emp = await EmployeeModel.findOne({
            _id: empId,
            deleted_at: null
        });

        if (!emp) {
            this.res.status(404);
            throw new Error("Employee not found.");
        }

        return emp
    }

    async updateEmp(empId) {

        if (!this.req || Object.keys(this.req).length === 0) {
            this.res.status(400);
            throw new Error("No updates provided");
        }
        
        const emp = await EmployeeModel.findByIdAndUpdate(empId, this.req, { new: true });

        if (!emp) {
            this.res.status(404);
            throw new Error('Employee not found');
        }

        const tempPassword = `${this.req.firstName}${this.req.contact}#`;
        const encryptedPassword = await createHash(tempPassword);

        await User.findOneAndUpdate({ _id: emp.emp_user_id }, {
            $set: {
                firstName: this.req.firstName,
                lastName: this.req.lastName,
                contact: this.req.contact,
                email: this.req.email,
                role:this.req.role,
                password: encryptedPassword,
            },
            $currentDate: { updated_at: true }
        }, { new: true });

        return emp
    }

    async isEmpEmailExist(email) {
        return EmployeeModel.findOne({ email })
    }

    async isEmpContactExist(contact) {
        return EmployeeModel.findOne({ contact })
    }


    async deleteMultipleEmp() {
        const idsToDelete = this.req.body.ids;
        const result = await EmployeeModel.updateMany(
            { _id: { $in: idsToDelete } },
            { $set: { deleted_at: new Date() } }
        );
        return result;
    }

}

module.exports = EmployeeService;