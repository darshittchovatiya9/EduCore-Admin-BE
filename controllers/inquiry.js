const express = require("express");
const Joi = require("joi");
const handleException = require("../decorators/error");
const InquiryService = require("../services/Inquiry");

const inquiryRouter = express.Router();

const inquirySchema = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    occupation: Joi.string().required(),
    contact: Joi.string().required(),
    email: Joi.string().email().required(),
    education: Joi.string().required(),
    dob: Joi.string().isoDate().required(),
    address_line1: Joi.string().required(),
    address_line2: Joi.string(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    zip_code: Joi.string().required(),
    reference_by: Joi.string(),
    fatherName: Joi.string(),
    father_contact: Joi.string(),
    father_occupation: Joi.string(),
    interested_in: Joi.array().items(Joi.string()).required(),
    suggested_by: Joi.string(),
});

inquiryRouter.post("/:companyId/inquiry", handleException(async (req, res) => {
    try {
        const reqBody = await inquirySchema.validateAsync(req.body);
        const companyId = req.params.companyId;
        const inquiryServ = new InquiryService(reqBody, req.user);
        const data = await inquiryServ.createInquiry(companyId);

        res.json({
            success: true,
            data,
            message: 'Inquiry added successfully.'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

inquiryRouter.get("/:companyId/inquiry", handleException(async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const inquiryServ = new InquiryService(req, res, req.query);
        const data = await inquiryServ.getInquirys(companyId);

        res.json({
            data: {
                message: "Inquiries retrieved successfully.",
                inquiry: data.inquiries,
                currentPage: data.currentPage,
                totalPages: data.totalPages,
                totalStudents: data.total,
                per_page: data.per_page,
            },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

inquiryRouter.get("/:companyId/:id/inquiry", handleException(async (req, res) => {
    try {
        const inquiryServ = new InquiryService(req, res, req.query);
        const data = await inquiryServ.getInquiry();

        res.json({
            data: {
                message: "Inquiry retrieved successfully.",
                inquiry: data,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

inquiryRouter.put("/:companyId/:id/updateInquiry", handleException(async (req, res) => {
    try {
        const inquiryServ = new InquiryService(req, res, req.query);
        const data = await inquiryServ.updateInquiry();

        res.json({
            data: {
                message: "Inquiry updated successfully.",
                student: data,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

inquiryRouter.delete("/:companyId/:id/deleteInquiry", handleException(async (req, res) => {
    try {
        const inquiryServ = new InquiryService(req, res, req.query);
        const data = await inquiryServ.deleteInquiry();

        res.json({
            data: {
                message: "Inquiry deleted successfully",
                student: data,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

inquiryRouter.delete("/:companyId/delete/all-inquiry", handleException(async (req, res) => {
    try {
        const inquiryServ = new InquiryService(req, res, req.query);
        const data = await inquiryServ.deletemultipalInquiry();

        res.json({
            data: {
                message: "Inquiry deleted successfully",
                student: data,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));


module.exports = inquiryRouter;