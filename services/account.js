const BaseService = require("./index");
const ExpenseModel = require("../models/expense");
const StudentModel = require("../models/student");
const e = require("express");

class AccountService extends BaseService {
    async getAccountDetails(companyId) {
        const query = {
            deleted_at: null,
            company_id: companyId
        };

        if (this.reqQuery.startDate && this.reqQuery.endDate) {
            const startDate = new Date(`${this.reqQuery.startDate}T00:00:00.000Z`);
            const endDate = new Date(`${this.reqQuery.endDate}T00:00:00.000Z`);
            query.date = {$gte: startDate, $lte: endDate};
        }

        const getExpenses = ExpenseModel.aggregate([
            {
                $group: {
                    _id: "$type",
                    totalAmount: {$sum: "$amount"}
                }
            },
            {
                $group: {
                    _id: null,
                    expensesByType: {$push: {type: "$_id", totalAmount: "$totalAmount"}},
                    totalExpense: {$sum: "$totalAmount"}
                }
            }
        ]);

        const studentQuery = {
            'personal_info.joining_date': {
                $gte: new Date(`${this.reqQuery.startDate}T00:00:00.000Z`),
                $lt: new Date(`${this.reqQuery.endDate}T00:00:00.000Z`)
            },
            deleted_at: null
        };

        const getExistingAdmissions = StudentModel.countDocuments({
            'personal_info.joining_date': {
                $lt: new Date(`${this.reqQuery.startDate}T00:00:00.000Z`)
            },
            deleted_at: null
        });

        const getFeesInfo = StudentModel.aggregate([
            {
                $match: {
                    deleted_at: null,
                    'fees_info.installments.payment_date': {
                        $gte: new Date(`${this.reqQuery.startDate}T00:00:00.000Z`),
                        $lte: new Date(`${this.reqQuery.endDate}T23:59:59.999Z`)
                    }
                }
            },
            {
                $unwind: '$fees_info'
            },
            {
                $group: {
                    _id: null,
                    totalAmountRemaining: {$sum: '$fees_info.amount.remaining'}
                }
            }
        ])

        const getNewAdmissions = StudentModel.countDocuments({...studentQuery, status: "Running"});

        const getCourseCompleted = StudentModel.countDocuments({...studentQuery, status: 'Completed'});

        const getLeavedStudents = StudentModel.countDocuments({
            ...studentQuery,
            status: {$nin: ['Completed', 'Running', null]}
        });


        const [expenses, existingAdmissions, newAdmissions, courseCompleted, leavedStudents, feesInfo] = await Promise.all([
            getExpenses,
            getExistingAdmissions,
            getNewAdmissions,
            getCourseCompleted,
            getLeavedStudents,
            getFeesInfo
        ]);

        const [expenseData] = expenses ?? [];

        const data = {
            expenses: expenseData,
            students: {
                existingAdmissions,
                newAdmissions,
                courseCompleted,
                leavedStudents
            },
            feesInfo,
            otherInfo: {
                openingCash : 100,
                cashInvestment: 100,
                feesReceived: 10000,
                totalExpense: expenseData.totalExpense,
                withdrawal: 100,
            }
        };

        data.nextMonth = {
            admissions: data.students.existingAdmissions,
            cash: data.otherInfo.openingCash + data.otherInfo.cashInvestment + data.otherInfo.feesReceived - data.otherInfo.withdrawal - data.otherInfo.totalExpense, // Corrected usage of data
            pending_fee: 0
        };

        return data;
    }

}

module.exports = AccountService;