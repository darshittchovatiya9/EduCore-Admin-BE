const handleException = require("../decorators/error");
const DemoService = require("../services/demo");
const demoRouter = require("express").Router();

demoRouter.post("/:companyId/demo", handleException(async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const demoServ = new DemoService(req, res, req.query);
        const result = await demoServ.createDemo(companyId);

        res.json({
            message: result.message,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

demoRouter.get("/:companyId/demo", handleException(async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const demoServ = new DemoService(req, res, req.query);
        const data = await demoServ.getDemos(companyId);

        res.json({
            success: true,
            message: 'Demo retrieved successfully.' ,
            data,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

demoRouter.get("/:companyId/:id/demo", handleException(async (req, res) => {
    try {
        const demoServ = new DemoService(req, res, req.query);
        const data = await demoServ.getDemo();

        res.json({
            data,
            message: 'Demo retrieved successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

demoRouter.put("/:companyId/:id/:entryId/updateDemo", handleException(async (req, res) => {
    try {
        const demoServ = new DemoService(req, res, req.query);
        const data = await demoServ.updateDemo();

        res.json({
            data,
            message: data.message,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

demoRouter.delete("/:companyId/:id/:entryId/deleteDemo", handleException(async (req, res) => {
    try {
        const demoServ = new DemoService(req, res, req.query);
        await demoServ.deleteDemo();

        res.json({
            message: 'Demo entry deleted successfully.',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

module.exports = demoRouter;


