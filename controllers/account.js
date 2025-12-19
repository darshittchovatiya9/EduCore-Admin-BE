const handleException = require("../decorators/error");
const AccountService = require("../services/account");
const accountRouter = require("express").Router()

accountRouter.get(
    "/:companyId/account",
    handleException(async (req, res) => {
        try {
            const companyId = req.params.companyId
            const accountServ = new AccountService(req.body, req.user, req.query);
            const accountDetails = await accountServ.getAccountDetails(companyId);

            res.json({
                data: {
                    message: "Account details retrieved successfully.",
                    data: accountDetails,
                },
            });
        } catch (err) {
            throw err;
        }
    })
);

module.exports = accountRouter