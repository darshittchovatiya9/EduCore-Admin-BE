const handleException = require("../decorators/error");
const ExpenseService = require("../services/expense");
const expenseRouter = require("express").Router()


expenseRouter.post(
    "/expense",
    handleException(async (req, res) => {
        try {
            const expenseServ = new ExpenseService(req.body, req.user, req.query);
            const expense = await expenseServ.addExpense();

            res.json({
                data: {
                    message: "Expense request created successfully.",
                    data: expense,
                },
            });
        } catch (err) {
            throw err;
        }
    })
);

expenseRouter.get(
    "/:companyId/expense",
    handleException(async (req, res) => {
        try {
            const companyId = req.params.companyId;
            const expenseServ = new ExpenseService(req.body, req.user, req.query);
            const data = await expenseServ.getExpenses(companyId);

            res.status(200).json({ success: true, data, message: 'Expenses retrieved successfully.' });

        } catch (error) {
            console.error('Error fetching Expenses:', error);

            if (error.name === 'ValidationError') {
                return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
            }

            res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
        }
    })
);

expenseRouter.get("/:companyId/:id/expense", handleException(async (req, res) => {
        try {
            const expenseServ = new ExpenseService(req.body, req.user, req.query);
            const id = req.params.id;
            const data = await expenseServ.getExpense(id);

            res.status(200).json({ data, message: 'Expense retrieved successfully.' });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    })
);

expenseRouter.put("/:companyId/:id/update-expense", handleException(async (req, res) => {
    try {
        const expenseId = req.params.id;
        const expenseServ = new ExpenseService(req.body, req.user);
        const data = await expenseServ.updateExpense(expenseId);

        res.status(200).json({ data, message: 'Expense updated successfully.' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

expenseRouter.delete("/:companyId/delete/all-expense", handleException(async (req, res) => {
    try {
        const expenseServ  = new ExpenseService(req.body, req.user, req.query);
        const data = await expenseServ.deleteMultipleExpense();

        res.json({
            data: {
                message: "Expense deleted successfully",
                expenses: data,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));





module.exports = expenseRouter;