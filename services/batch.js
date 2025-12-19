const BaseService = require(".");
const mongoose = require("mongoose");
const Batch = require("../models/batch");
const Student = require("../models/student");

class BatchService extends BaseService {
    constructor(req, res, reqQuery) {
        super();
        this.req = req;
        this.res = res;
        this.reqQuery = reqQuery;
    }

    async createBatch(companyId) {
        const {technology, batch_time, note, lab_name, batch_members} = this.req;

        const existingBatch = await Batch.findOne({
            technology,
            batch_time,
            'batch_members.student_id': {$in: batch_members.map(member => member.student_id)},
            'batch_members.deleted_at': null
        });

        if (existingBatch) {
            const existingStudent = existingBatch.batch_members.find(member =>
                batch_members.some(newMember => newMember.student_id === member.student_id)
            );

            throw new Error(`Student with ID ${existingStudent.student_id} is already part of the batch (Technology: ${technology}, Batch Time: ${batch_time}).`);
        }

        const populatedBatchMembers = await Promise.all(
            batch_members.map(async (member) => {
                const studentDetails = await Student.findOne({
                    "_id": member.student_id,
                });

                if (studentDetails) {
                    return {
                        student_id: member.student_id,
                        firstName: studentDetails.personal_info.firstName,
                        lastName: studentDetails.personal_info.lastName,
                        contact: studentDetails.personal_info.contact,
                        course: studentDetails.personal_info.course,
                        joining_date: studentDetails.personal_info.joining_date,
                    };
                } else {
                    throw new Error(`Student not found with ID: ${member.student_id}`);
                }
            })
        );

        const newBatch = new Batch({
            technology,
            batch_time,
            note,
            lab_name,
            company_id: companyId,
            batch_members: populatedBatchMembers,
        });

        const savedBatch = await newBatch.save();
        return savedBatch;
    }

    async getBatches(companyId) {

        const page = parseInt(this.reqQuery.page) || 1;
        const limit = parseInt(this.reqQuery.limit) || 10;
        const startIndex = (page - 1) * limit;
        const batchLimit = parseInt(this.reqQuery.batchLimit) || 10;

        let query = {deleted_at: null, company_id: companyId};
        const searchKey = this.reqQuery.searchKey;

        if (searchKey) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateRegex.test(searchKey)) {
                query = {
                    deleted_at: null,
                    batch_time: {
                        $gte: new Date(searchKey),
                        $lt: new Date(new Date(searchKey).setDate(new Date(searchKey).getDate() + 1))
                    }
                };
            } else {
                query = {
                    deleted_at: null,
                    $or: [
                        {"lab_name": {$regex: new RegExp(searchKey, 'i')}},
                        {"technology": {$regex: new RegExp(searchKey, 'i')}}
                    ]
                };
            }
        }

        const filteredbatches = await Batch.find(query)
            .skip(startIndex)
            .limit(limit);

        const total = await Batch.countDocuments(query);

        const batches = filteredbatches.map(demo => ({
            ...demo.toObject(),
            batch_members: demo.batch_members.filter(entry => entry.deleted_at === null).slice(0, batchLimit)
        }));

        return {batches, total, currentPage: page, totalPages: Math.ceil(total / limit), par_page: limit};

    }

    async getBatch() {
        const batchId = this.req.params.id;
        const page = parseInt(this.reqQuery.page) || 1;
        const limit = parseInt(this.reqQuery.limit) || 10;
        const startIndex = (page - 1) * limit;

        const batch = await Batch.findOne({
            _id: batchId,
            deleted_at: null
        });

        if (!batch) {
            this.res.status(404);
            throw new Error("Batch not found.");
        }

        const totalBatchMembers = batch.batch_members.length;
        batch.batch_members = batch.batch_members.filter(entry => entry.deleted_at === null).slice(startIndex, startIndex + limit);

        const responseData = {
            batch_members: batch,
            total: totalBatchMembers,
            currentPage: page,
            totalPages: Math.ceil(totalBatchMembers / limit),
            per_page: limit
        };

        return responseData;
    }

    async updateBatch(batchId) {
        if (!this.req.body || Object.keys(this.req.body).length === 0) {
            this.res.status(400);
            throw new Error("No updates provided");
        }

        const batch = await Batch.findByIdAndUpdate(batchId, this.req.body, {new: true});

        if (!batch) {
            this.res.status(404);
            throw new Error('Batch not found');
        }

        return batch;
    }

    async deleteBatch(batchId) {
        try {
            if (!mongoose.Types.ObjectId.isValid(batchId)) {
                throw new Error('Invalid Batch ID');
            }

            const deletedBatch = await Batch.findByIdAndUpdate(
                batchId,
                {$set: {deleted_at: new Date()}},
                {new: true}
            );

            if (!deletedBatch) {
                this.res.status(404);
                throw new Error("User not found");
            }

            return deletedBatch;
        } catch (error) {
            throw new Error(`Error in deleteBatch: ${error.message}`);
        }
    }

    async deleteBatchMember(userId, entryId) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(entryId)) {
                throw new Error('Invalid Batch ID or entry ID');
            }

            const batch = await Batch.findById(userId);

            if (!batch) {
                throw new Error("Batch not found");
            }

            const batchIndex = await Batch.findOneAndUpdate(
                {_id: userId, 'batch_members._id': entryId},
                {
                    $set: {
                        'batch_members.$.deleted_at': new Date()
                    }
                },
                {
                    new: true
                }
            );

            if (!batchIndex) {
                throw new Error("Batch Member not found");
            }

            return batchIndex;

        } catch (error) {
            throw new Error(`Error in deleteBatchMember: ${error.message}`);
        }
    }

    async deleteMultipleBatchMember(userId, entryIds) {
        try {
            const batch = await Batch.findById(userId);

            if (!batch) {
                throw new Error("Batch not found");
            }

            const result = await Batch.updateMany(
                {_id: userId, 'batch_members._id': {$in: entryIds}},
                {
                    $set: {
                        'batch_members.$.deleted_at': new Date()
                    }
                }, {new: true}
            );

            if (!result) {
                throw new Error("Batch Members not found");
            }

            return result;

        } catch (error) {
            throw new Error(`Error in deleteBatchMember: ${error.message}`);
        }
    }

    async deleteMultipleBatches() {
        const idsToDelete = this.req.body.ids;
        const result = await Batch.updateMany(
            { _id: { $in: idsToDelete } },
            { $set: { deleted_at: new Date() } }
        );
        return result;
    }
}


module.exports = BatchService;






