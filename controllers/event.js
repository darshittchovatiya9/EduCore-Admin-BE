const Joi = require("joi");
const handleException = require("../decorators/error");
const EventService = require("../services/event");
const eventRouter = require("express").Router()
const EventModel = require("../models/event")

const CreateEventRequest = Joi.object({
    event: Joi.string(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    event_user_id: Joi.string().required(),
    leave_type: Joi.string().required(),
    leave_description: Joi.string(),
    leave_status: Joi.string(),
});

const UpdateEventRequest = Joi.object({
    event: Joi.string(),
    startDate: Joi.date(),
    endDate: Joi.date(),
    event_user_id: Joi.string(),
    leave_type: Joi.string(),
    leave_description: Joi.string(),
    leave_status: Joi.string(),
    denied_reason:Joi.string()
});

eventRouter.post("/:companyId/event",handleException(async (req, res) => {
        try {
            const reqBody = await CreateEventRequest.validateAsync(req.body);
            const eventServ = new EventService(reqBody, req.user, req.query);
            const companyId = req.params.companyId;
            const eventId = await eventServ.addEvent(companyId);

            res.json({
                data: {
                    message: "Event added successfully.",
                    id: eventId,
                },
            });
        } catch (err) {
            throw err;
        }
    })
);

eventRouter.get("/:companyId/event",handleException(async (req, res) => {
        try {
            const companyId = req.params.companyId;
            const data = await EventModel.find({deleted_at: null, company_id: companyId})
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    })
);

eventRouter.delete("/:companyId/:id/deleteEvent",handleException(async (req, res) => {
        try {
            const eventServ = new EventService()
            const data = await eventServ.deleteEvent(req.params.id)
            res.status(200).json({data, message: "Event Deleted successfully."});
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    })
); 

eventRouter.patch("/:companyId/:id/updateEvent",handleException(async (req, res) => {
        try {
            const eventId = req.params.id;
            const reqBody = await UpdateEventRequest.validateAsync(req.body);
            const eventServ = new EventService(reqBody, req.user, req.query);
            const updatedEvent = await eventServ.updateEvent(eventId);

            res.json({
                data: {
                    message: "Event updated successfully.",
                    updatedEvent,
                },
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    })
);

module.exports = eventRouter