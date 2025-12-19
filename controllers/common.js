const handleException = require("../decorators/error");
const Joi = require("joi");
const CommonService = require("../services/common");
const path = require("path");
const UserService = require("../services/user");

const commonRouter = require('express').Router()

const RegisterRequest = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    // contact: Joi.number().required(),
    contact: Joi.string()
        .pattern(/^\+\d{10,15}$/)
        .required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    role: Joi.string().optional(),
    company_name: Joi.string().required(),
});

commonRouter.post(
    "/register",
    handleException(async (req, res) => {
        const reqBody = await RegisterRequest.validateAsync(req.body);

        const userService = new UserService(reqBody, null);
        const userId = await userService.createUser();

        res.status(201).json({
            data: {
                message: "User registered successfully",
                userId,
            },
        });
    })
);

const LoginRequest = Joi.object({
    email: Joi.string().email().optional(),
    contact: Joi.string().optional(),
    password: Joi.string().required(),
});


commonRouter.post(
    "/login",
    handleException(async (req, res) => {
        try {
            const reqBody = await LoginRequest.validateAsync(req.body);
            const commonServ = new CommonService(reqBody, req.user);
            const tokens = await commonServ.login();

            res.json({
                data: {
                    message: "Logged in successfully.",
                    tokens,
                },
            });
        } catch (err) {
            throw err;
        }
    })
);

commonRouter.post(
    "/logout",
    handleException(async (req, res) => {
        try {
            const commonServ = new CommonService(req.body,req.user);
            await commonServ.logout();
            res.json({
                data: {
                    message: "Logged out successfully.",
                },
            });
        } catch (err) {
            throw err;
        }
    })
);

commonRouter.post(
    "/refresh-token",
    handleException(async (req, res) => {
        const refreshToken = req.headers["auth_jwt_refresh"];

        const commonServ = new CommonService({
            refreshToken,
        });

        const tokens = await commonServ.refreshToken(req);

        res.json({
            data: {
                message: "Token refreshed",
                tokens,
            },
        });
    })
);

commonRouter.get('/profile-pic/:file', (req, res) => {
    const fileName = req.params.file;
    const filePath = path.join(__dirname, '../assets/avatars' , fileName);

    res.sendFile(filePath);
});

commonRouter.get('/send-notification', async (req, res) => {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const client = require('twilio')(accountSid, authToken);

        const notification = await client.messages.create({
            from: '+16592157593',
            body: 'Hello there, this is a Twilio WhatsApp message!',
            to: 'whatsapp:+919313582375'
        });

        res.json({
            data: {
                message: "Notification sent successfully",
                notification,
            },
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({
            error: "Internal Server Error",
        });
    }
});


module.exports = commonRouter