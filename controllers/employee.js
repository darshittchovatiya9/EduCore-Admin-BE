const EmployeeModel = require("../models/employee")
const Joi = require('joi')
const handleException = require("../decorators/error");
const empRouter = require('express').Router()
const multer = require("multer");
// Multer configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {uploadFile} = require("../helpers/avatar");
const EmployeeService = require("../services/employee");
const User = require("../models/User");

const CreateEmployeeRequest = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    contact: Joi.string().required(),
    email: Joi.string().email().required(),
    gender: Joi.string().required(),
    role: Joi.string().required(),
    qualification: Joi.string().required(),
    experience: Joi.number().required(),
    technology: Joi.string().required(),
    dob: Joi.date().required(),
    joining_date: Joi.date().required(),
    address_1: Joi.string().required(),
    address_2: Joi.string().optional(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    zipcode: Joi.number().required(),
});

empRouter.post("/:companyId/employee",upload.single("profile-pic"), handleException(async (req, res) => {
    try {
        const reqBody = await CreateEmployeeRequest.validateAsync(req.body);
        const companyId = req.params.companyId;
        const empServ = new EmployeeService(reqBody, req.user, req.query);
        
        if (req.file && req.file.buffer) {
            try {
                const result = await uploadFile(req.file.buffer);
                const data = await empServ.createEmployee(companyId,result);

                res.json({
                    data,
                    status: 200,
                    message: "Employee created successfully."
                });
            } catch (uploadError) {
                if (uploadError.message === "File size exceeds the maximum allowed limit.") {
                    return res.status(400).json({ error: "File size exceeds the maximum allowed limit." });
                }
                throw uploadError;
            }
        } else {
            const data = await empServ.createEmployee(companyId);

            res.json({
                data,
                status: 200,
                message: "Employee created successfully."
            });
        }

    } catch (err) {
        throw err;
    }
})
);

empRouter.get("/:companyId/employee", handleException(async (req, res) => {
    try {
        const empServ = new EmployeeService(req, res, req.query);
        const companyId = req.params.companyId;
        const data = await empServ.getAllEmployees(companyId);

        res.status(200).json({ success: true, data, message: 'Employees retrieved successfully.' });

    } catch (error) {
        console.error('Error fetching inquiries:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
        }

        res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
    }
})
);

empRouter.get("/:companyId/:id/employee", handleException(async (req, res) => {
    try {
        const empServ = new EmployeeService(req, res, req.query);
        const id = req.params.id;
        const data = await empServ.getEmployee(id);

        res.status(200).json({ data, message: 'Employees retrieved successfully.' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})
);

empRouter.put("/:companyId/:id/updateEmployee", handleException(async (req, res) => {
    try {
        const empId = req.params.id;
        const empServ = new EmployeeService(req.body, req.user);
        const data = await empServ.updateEmp(empId);

        res.status(200).json({ data, message: 'Employee updated successfully.' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

empRouter.put(
    "/:id/employee/profile-pic",
    upload.single("profile-pic"),
    handleException(async (req, res) => {
        const empId = req.params.id;
        const file = req.file;
        const imageUrl = await uploadFile(file.buffer);
        await EmployeeModel.findByIdAndUpdate(empId, { avatar_url: imageUrl }, { new: true });

        const employee = await EmployeeModel.findById(empId);
        const userId = employee.emp_user_id;

        await UserModel.findOneAndUpdate({ _id: userId }, { avatar_url: imageUrl }, { new: true });

        res.json({
            data: {
                message: "Profile pic uploaded successfully",
            },
        });
    })
);

empRouter.delete("/:companyId/:id/deleteEmployee", handleException(async (req, res) => {
    try {
        const empId = req.params.id;

        const deletedEmp = await EmployeeModel.findByIdAndUpdate(empId, { deleted_at: new Date() }, { new: true });

        await User.findOneAndUpdate(
            { _id: deletedEmp.emp_user_id },
            { $set: { deleted_at: new Date() } },
            { new: true }
        );

        res.status(200).json({ deletedEmp, message: 'Employee deleted successfully.' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})
);

empRouter.delete("/:companyId/delete/all-employee", handleException(async (req, res) => {
    try {
        const empServ = new EmployeeService(req, res, req.query);
        const data = await empServ.deleteMultipleEmp();

        res.json({
            data: {
                message: "Employees deleted successfully",
                student: data,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

module.exports = empRouter;