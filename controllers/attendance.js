const handleException = require("../decorators/error");
const attendanceRouter = require("express").Router()
const AttendanceModel = require("../models/attendance");

attendanceRouter.post(
    "/attendance",
    handleException(async (req, res) => {
        try {
            const attendanceDetails = req.body.attendance;
            const data = await AttendanceModel.insertMany(attendanceDetails);

            res.json({
                data: {
                    attendance: data,
                    message: "Data inserted successfully.",
                },
            });
        } catch (err) {
            throw err;
        }
    })
);


attendanceRouter.get(
    "/:companyId/attendance",
    handleException(async (req, res) => {
        try {
            let query = {deleted_at: null, company_id: req.params.companyId};

            if (req.query.student) {
                query.studentId = req.query.student;
            }

            if (req.query.employee) {
                query.employee_id = req.query.employee;
            }

            if (req.query.startDate && req.query.endDate) {
                const startDate = new Date(`${req.query.startDate}T00:00:00.000Z`);
                const endDate = new Date(`${req.query.endDate}T00:00:00.000Z`);
                query.date = {$gte: startDate, $lt: endDate};
            }

            const data = await AttendanceModel.find(query);

            res.json({
                data: {
                    attendance: data,
                },
            });
        } catch (err) {
            throw err;
        }
    })
);


module.exports = attendanceRouter;