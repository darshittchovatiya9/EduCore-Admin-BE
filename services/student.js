const BaseService = require(".")
const Student = require("../models/student");
const mongoose = require('mongoose');
const User = require("../models/User");
const { createHash } = require("../common/hash");
const { uploadFile } = require("../helpers/avatar");
const EmployeeModel = require("../models/employee");

class StudentService extends BaseService {
    constructor(req, res, reqQuery) {
        super();
        this.req = req;
        this.res = res;
        this.reqQuery = reqQuery;
    }

    async createStudent(companyId, result) {
        const {
            firstName, lastName, email, contact, dob,
            education, college, blood_group, gender, course,
            joining_date, profile_pic, address_1, address_2, city, state, country, zipcode, total_amount,
            amount_paid, amount_remaining, admission_amount,
            upcoming_installment_date, upcoming_installment_amount, guardian_info, discount,
            no_of_installments, enrollment_no
        } = this.req;
    
        const isStudentExists = await Student.exists({
            $or: [{"personal_info.contact": contact}, {"personal_info.email": email}],
        });
    
        if (isStudentExists) {
            throw new Error("Student with this information already exists.");
        }
    
        const tempPassword = `${firstName}${contact}#`;
        const encryptedPassword = await createHash(tempPassword);
    
        const user = new User({
            firstName,
            lastName,
            email,
            contact,
            role: "Student",
            password: encryptedPassword,
            avatar_url: result,
            company_id: companyId,
        });
    
        const savedUser = await user.save();
    
        const studentData = {
            personal_info: {
                firstName, lastName, email, contact, dob,
                education, college, blood_group, gender, course,
                joining_date, profile_pic: result, enrollment_no
            },
            address_info: {
                address_1, address_2, city, state, country, zipcode
            },
            guardian_info,
            fees_info: installmentData({
                discount,
                no_of_installments,
                total_amount,
                amount_paid,
                amount_remaining,
                admission_amount,
                upcoming_installment_date,
                upcoming_installment_amount,
            }),
            company_id: companyId,
            status: "Running",
            student_user_id: savedUser._id
        };
    
        const student = new Student(studentData);
        const savedStudent = await student.save();
    
        return savedStudent;
    }


    async getStudents(companyId) {
        try {
            let query = { deleted_at: null, company_id: companyId };

            const searchKey = this.reqQuery.searchKey;

            if (searchKey) {
                query = {
                    deleted_at: null,
                    $or: [
                        { "personal_info.firstName": { $regex: new RegExp(searchKey, 'i') } },
                        { "personal_info.lastName": { $regex: new RegExp(searchKey, 'i') } },
                        { "personal_info.contact": { $regex: new RegExp(searchKey, 'i') } },
                        { "personal_info.email": { $regex: new RegExp(searchKey, 'i') } }
                    ]
                };
            }

            let students;
            let total;

            if (this.reqQuery.page && this.reqQuery.limit) {
                const page = parseInt(this.reqQuery.page) || 1;
                const limit = parseInt(this.reqQuery.limit) || 10;
                const startIndex = (page - 1) * limit;

                students = await Student.find(query)
                    .skip(startIndex)
                    .limit(limit);

                total = await Student.countDocuments(query);
            } else {
                students = await Student.find(query);
                total = students.length;
            }

            const filteredStudent = students.map(demo => ({
                ...demo.toObject(),
                guardian_info: demo.guardian_info.filter(entry => entry.deleted_at === null)
            }));

            return { filteredStudent, total };
        } catch (error) {
            throw new Error(`Error in getStudents: ${error.message}`);
        }
    }


    async getStudent(id) {
        try {
            const studentId = id;
            const student = await Student.findOne({
                _id: studentId,
                deleted_at: null
            });

            if (!student) {
                this.res.status(404);
                throw new Error("Student not found.");
            }

            student.guardian_info = student.guardian_info.filter(entry => entry.deleted_at === null);

            return student;
        } catch (error) {
            throw new Error(`Error in getStudents: ${error.message}`);
        }
    }

    async updateStudent(userId) {

        if (!this.req || Object.keys(this.req).length === 0) {
            throw new Error("No updates provided");
        }
    
        const student = await Student.findByIdAndUpdate(userId, { $set: this.req }, { new: true });

        if (!student) {
            throw new Error('Student not found');
        }

        const tempPassword = `${this.req.personal_info.firstName}${this.req.personal_info.contact}#`;
        const encryptedPassword = await createHash(tempPassword);

        await User.findOneAndUpdate({ _id: student.student_user_id }, {
            $set: {
                firstName: this.req.personal_info.firstName,
                lastName: this.req.personal_info.lastName,
                contact: this.req.personal_info.contact,
                email: this.req.personal_info.email,
                password: encryptedPassword,
            },
            $currentDate: { updated_at: true }
        }, { new: true });

        return student;
    }

    async deleteStudent(userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const deletedStudent = await Student.findByIdAndUpdate(
            userId,
            {$set: {deleted_at: new Date()}},
            {new: true}
        );

        if (!deletedStudent) {
            this.res.status(404);
            throw new Error("Student not found");
        }

        await User.findOneAndUpdate(
            { _id: deletedStudent.student_user_id },
            { $set: { deleted_at: new Date() } },
            { new: true }
        );

        return deletedStudent;
    }

    async deleteStudentGuardian(userId, entryId) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(entryId)) {
                throw new Error('Invalid user ID or entry ID');
            }

            const student = await Student.findById(userId);

            if (!student) {
                throw new Error("Student not found");
            }

            const guardianIndex = await Student.findOneAndUpdate(
                {_id: userId, 'guardian_info._id': entryId},
                {
                    $set: {
                        'guardian_info.$.deleted_at': new Date()
                    }
                },
                {
                    new: true
                }
            );

            if (!guardianIndex) {
                throw new Error("Guardian not found");
            }

            return guardianIndex;

        } catch (error) {
            throw new Error(`Error in deleteStudentGuardian: ${error.message}`);
        }
    }

    async updateStudentGuardian(userId, guardianId) {

        try {
            if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(guardianId)) {
                throw new Error('Invalid user ID or entry ID');
            }

            const student = await Student.findById(userId);

            if (!student) {
                throw new Error("Student not found");
            }

            const guardianIndex = await Student.findOneAndUpdate(
                {_id: userId, 'guardian_info._id': guardianId},
                {
                    $set: {
                        'guardian_info.$.firstName': this.req.firstName,
                        'guardian_info.$.lastName': this.req.lastName,
                        'guardian_info.$.contact': this.req.contact,
                    }
                },
                {
                    new: true
                }
            );

            if (!guardianIndex) {
                throw new Error("Guardian not found");
            }

            return student;

        } catch (error) {
            throw new Error(`Error in deleteStudentGuardian: ${error.message}`);
        }
    }

    async updateFeesDetails(userId, feesId) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(feesId)) {
                throw new Error('Invalid user ID or fees ID');
            }

            const student = await Student.findById(userId);
            if (!student) {
                throw new Error("Student not found");
            }


            const installmentToUpdate = student?.fees_info?.installments.find(installment => installment?._id.equals(feesId));
            if (!installmentToUpdate) {
                throw new Error("Installment not found");
            }



            if (this.req.status === 'Paid') {
                installmentToUpdate.status = this.req.status;
                student.fees_info.amount_paid += installmentToUpdate.amount;
                student.fees_info.amount_remaining -= installmentToUpdate.amount;
                installmentToUpdate.payment_date = new Date()
            } else {
                installmentToUpdate.status = this.req.status;
                student.fees_info.amount_paid -= installmentToUpdate.amount;
                student.fees_info.amount_remaining += installmentToUpdate.amount;
                installmentToUpdate.payment_date = null
            }


            const updatedStudent = await Student.findByIdAndUpdate(userId, { fees_info: student.fees_info }, { new: true });

            if (!updatedStudent) {
                throw new Error("Failed to update student information");
            }

            return updatedStudent;
        } catch (error) {
            throw new Error(`Error in updating payment info: ${error.message}`);
        }
    }


    async deleteMultipleStudents() {
        const idsToDelete = this.req.body.ids;
        const result = await Student.updateMany(
            { _id: { $in: idsToDelete } },
            { $set: { deleted_at: new Date() } }
        );
        return result;
    }
}

 function installmentData(fees_info) {
    const {discount,
        no_of_installments,
        total_amount,
        amount_paid,
        amount_remaining,
        admission_amount,
        upcoming_installment_date,
        upcoming_installment_amount} = fees_info

    const installmentsArray = [{
        installment_date: new Date(),
        amount: amount_paid + admission_amount + discount,
        status: "Paid",
        payment_date: new Date()
    }];

    let currentDate = new Date(upcoming_installment_date);

    for (let i = 1; i <= no_of_installments; i++) {
        const installmentDue = {
            amount: Math.round(amount_remaining / no_of_installments),
            status: "Pending",
            installment_date: currentDate.getTime(),
        };

        installmentsArray.push(installmentDue);

        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    const feesData = {
        amount_paid: amount_paid + admission_amount + discount,
        amount_remaining,
        total_amount,
        no_of_installments,
        discount,
        admission_amount,
        installments: installmentsArray
    }

    return feesData
}

module.exports = StudentService