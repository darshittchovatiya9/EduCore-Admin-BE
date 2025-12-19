const handleException = require("../decorators/error");
const Joi = require("joi");
const StudentService = require("../services/student");
const studentRouter = require("express").Router()
const mongoose = require('mongoose');
const Student = require("../models/student");
const multer = require("multer");
// Multer configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {uploadFile} = require("../helpers/avatar");
const EmployeeModel = require("../models/employee");
const User = require("../models/User");
const EmployeeService = require("../services/employee");

const CreateStudentRequest = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    contact: Joi.string().required(),
    email: Joi.string().email().required(),
    student_user_id: Joi.string().optional(),
    dob: Joi.date().required(),
    education: Joi.string().required(),
    college: Joi.string().optional(),
    blood_group: Joi.string().optional(),
    gender: Joi.string().required(),
    course: Joi.string().required(),
    joining_date: Joi.date().required(),
    profile_pic: Joi.string().optional(),
    address_1: Joi.string().required(),
    address_2: Joi.string().optional(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    zipcode: Joi.number().required(),
    guardian_info: Joi.array().items({
        relation_type: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        contact: Joi.string().required(),
    }),
    total_amount: Joi.number().required(),
    amount_paid: Joi.number().required(),
    amount_remaining: Joi.number().required(),
    admission_amount: Joi.number().required(),
    upcoming_installment_date: Joi.date().required(),
    upcoming_installment_amount: Joi.number().required(),
    no_of_installments: Joi.number().required(),
    discount: Joi.number().optional(),
    enrollment_no: Joi.number().required()
});


studentRouter.post("/:companyId/student",upload.single("profile-pic"), handleException(async (req, res) => {
    try {
        const reqBody = await CreateStudentRequest.validateAsync(req.body);
        const companyId = req.params.companyId;
        const studentServ = new StudentService(reqBody, req.user, req.query);

        if (req.file && req.file.buffer) {
            try {
                const result = await uploadFile(req.file.buffer);
                const data = await studentServ.createStudent(companyId,result);

                res.json({
                    data,
                    status: 200,
                    message: "Student created successfully.."
                });
            } catch (uploadError) {
                if (uploadError.message === "File size exceeds the maximum allowed limit.") {
                    return res.status(400).json({ error: "File size exceeds the maximum allowed limit." });
                }
                throw uploadError;
            }
        } else {
            const data = await studentServ.createStudent(companyId);
            res.json({
                data,
                status: 200,
                message: "Student created successfully.."
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

studentRouter.get("/:companyId/student", handleException(async (req, res) => {
    try {
        const studentServ = new StudentService(req, res, req.query);
        const companyId = req.params.companyId;
        const data = await studentServ.getStudents(companyId);

        res.json({
            data: {
                message: "Students retrieved successfully.",
                students: data.filteredStudent,
                currentPage: data.currentPage,
                totalPages: data.totalPages,
                totalStudents: data.total,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

studentRouter.get("/:companyId/:id/student", handleException(async (req, res) => {
    try {
        const studentServ = new StudentService(req, res, req.query);
        const id = req.params.id;
        const data = await studentServ.getStudent(id);

        res.json({
            data: {
                message: "Student retrieved successfully.",
                student: data,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

studentRouter.put("/:companyId/:id/updateStudent", handleException(async (req, res) => {
    try {
        const userId = req.params.id
        const studentServ = new StudentService(req.body, req.user);
        const data = await studentServ.updateStudent(userId);

        res.json({
            data: {
                message: "Student updated successfully.",
                student: data,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

studentRouter.delete("/:companyId/:id/deleteStudent", handleException(async (req, res) => {
    try {
        const userId = req.params.id;
        const studentServ = new StudentService();
        const data = await studentServ.deleteStudent(userId);

        res.json({
            data: {
                message: "Student deleted successfully.",
                student: data,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

studentRouter.delete("/:companyId/:id/:entryId/deleteGuardian", handleException(async (req, res) => {
    try {
        const userId = req.params.id;
        const entryId = req.params.entryId;

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(entryId)) {
            return res.status(400).json({ error: 'Invalid user ID or entry ID' });
        }

        const studentServ = new StudentService();
        const data = await studentServ.deleteStudentGuardian(userId, entryId);

        if (!data) {
            return res.status(404).json({ error: "Guardian not found for the given student ID and entry ID" });
        }

        res.json({
            data: {
                message: "Student Guardian deleted successfully.",
                student: data,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

studentRouter.put("/:companyId/:id/:guardianId/update-guardian", handleException(async (req, res) => {
    try {
        const userId = req.params.id;
        const guardianId = req.params.guardianId;

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(guardianId)) {
            return res.status(400).json({ error: 'Invalid user ID or entry ID' });
        }

        const studentServ = new StudentService(req.body, req.user, req.query);
        const data = await studentServ.updateStudentGuardian(userId, guardianId);

        if (!data) {
            return res.status(404).json({ error: "Guardian not found for the given student ID and entry ID" });
        }

        res.json({
            data: {
                message: "Student Guardian updated successfully.",
                student: data,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

studentRouter.put(
    "/student/:id/profile-pic",
    upload.single("profile-pic"),
    handleException(async (req, res) => {
        const studentId = req.params.id;
        const file = req.file;
        const imageUrl = await uploadFile(file.buffer);


        const studentData = await Student.findById(studentId)

        if(!studentData){
            return res.status(404).json({ error: "Student not found" });
        }

        studentData.personal_info.profile_pic = imageUrl

        await studentData.save()

        const user = await User.findOne({ _id: studentData.student_user_id });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.avatar_url = imageUrl;

        await user.save();

        res.json({
            data: {
                message: "Profile pic uploaded successfully",
            },
        });
    })
);

studentRouter.delete("/:companyId/delete/all-students", handleException(async (req, res) => {
    try {
        const empServ = new StudentService(req, res, req.query);
        const data = await empServ.deleteMultipleStudents();

        res.json({
            data: {
                message: "Students deleted successfully",
                student: data,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

// studentRouter.get('/profile-pic/:file', (req, res) => {
//     const fileName = req.params.file;
//     const filePath = path.join(__dirname, '../assets/avatars', fileName);

//     res.sendFile(filePath);
// });


module.exports = studentRouter;
