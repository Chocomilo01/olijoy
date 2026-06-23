const mongoose = require("mongoose");
const TransactionService = require("../services/transactionService");
const CustomerService = require("../services/customerService");
// const { sendSMS } = require("../services/smsService");
const { sendSMS } = require("../services/smsService");

class TransactionController {
  // Inside the createDeposit method
  async createDeposit(req, res) {
    console.log("================================");
    console.log("CREATE DEPOSIT CALLED");
    console.log("BODY:", req.body);
    console.log("================================");
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const {
        customerId,
        amount,
        description,
        collectedBy,
        uploadedBy,
        modeOfPayment,
        paymentDate,
        name,
      } = req.body;

      const customer = await CustomerService.fetchOne(
        { _id: customerId },
        null,
        { session },
      );

      if (!customer) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      const userId = req.body.id;
      const firstName = req.body.firstName;
      const middleName = req.body.middleName;

      const depositAmount = Number(amount);

      customer.accountBalance += depositAmount;

      await customer.save({ session });

      const updatedBalance = customer.accountBalance;

      const depositTransaction = await TransactionService.create(
        {
          type: "deposit",
          amount: depositAmount,
          customer: customer._id,
          description,
          choose: "credit",
          collectedBy,
          uploadedBy,
          modeOfPayment,
          paymentDate,
          userId,
          balance: updatedBalance,
          name,
        },
        { session },
      );

      // Commit transaction first
      await session.commitTransaction();

      // Build SMS message
      const shortName = customer.name?.split(" ").slice(0, 4).join(" ");

      const message = `Acct: ${customer.accountNumber.replace("OLJ-", "")}.
NGN${Number(depositAmount).toLocaleString("en-NG")}.CR
DESC:${shortName} to Olijoy
Avail Bal: NGN${Number(updatedBalance).toLocaleString("en-NG")}.
Thank you for banking with OLIJOY.`;

      // Debug logs
      console.log("===== DEPOSIT REQUEST =====");
      console.log(req.body);

      console.log("=== SMS DEBUG ===");
      console.log("Customer ID:", customer._id);
      console.log("Phone:", customer.customersPhoneNo);
      console.log("Amount:", depositAmount);
      console.log("Balance:", updatedBalance);
      console.log("Message:", message);

      // Send SMS
      
      try {
        console.log("CALLING SMS SERVICE...");
        const smsResult = await sendSMS(customer.customersPhoneNo, message);

        console.log("SMS SUCCESS:", smsResult);
      } catch (err) {
        console.error("SMS FAILED:", err);
      }

      return res.status(201).json({
        success: true,
        message: "Deposit created successfully",
        data: {
          transaction: depositTransaction,
          balance: updatedBalance,
          user: {
            id: userId,
            firstName,
            middleName,
          },
        },
      });
    } catch (error) {
      await session.abortTransaction();

      return res.status(500).json({
        success: false,
        message: "Error creating deposit",
        error: error.message,
      });
    } finally {
      session.endSession();
    }
  }
  //     return res.status(500).json({
  //       success: false,
  //       message: "Error creating deposit",
  //       error: error.message
  //     });
  //   }
  // }

  async createWithdrawal(req, res) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const {
        customerId,
        amount,
        description,
        paymentDate,
        collectedBy,
        uploadedBy,
        modeOfPayment,
        name,
      } = req.body;

      const customer = await CustomerService.fetchOne(
        { _id: customerId },
        null,
        { session },
      );

      if (!customer) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      const withdrawalAmount = Number(amount);

      if (customer.accountBalance < withdrawalAmount) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message: "Insufficient funds for withdrawal",
        });
      }

      const userId = req.body.id;
      const firstName = req.body.firstName;
      const middleName = req.body.middleName;

      customer.accountBalance -= withdrawalAmount;

      await customer.save({ session });

      const updatedBalance = customer.accountBalance;

      const withdrawalTransaction = await TransactionService.createWithdrawal(
        {
          type: "withdrawal",
          amount: withdrawalAmount,
          customer: customer._id,
          userId,
          firstName,
          middleName,
          description,
          choose: "Debit",
          modeOfPayment,
          paymentDate,
          collectedBy,
          uploadedBy,
          balance: updatedBalance,
          name,
        },
        { session },
      );

      await session.commitTransaction();
      const shortName = customer.name?.split(" ").slice(0, 4).join(" ");

      const message = `acct: ${customer.accountNumber.replace("OLJ-", "")}
      NGN${Number(amount).toLocaleString("en-NG")}.DR
      DESC:Olijoy to ${shortName}
      Avail Bal: NGN${Number(updatedBalance).toLocaleString("en-NG")}.
      Thank you for banking with OLIJOY.`;

      try {
        await sendSMS(customer.customersPhoneNo, message);
      } catch (err) {
        console.error("ALL SMS PROVIDERS FAILED:", err.message);
      }

      return res.status(201).json({
        success: true,
        message: "Withdrawal created successfully",
        data: {
          transaction: withdrawalTransaction,
          balance: updatedBalance,
          user: {
            id: userId,
            firstName,
            middleName,
          },
        },
      });
    } catch (error) {
      await session.abortTransaction();

      return res.status(500).json({
        success: false,
        message: "Error creating withdrawal",
        error: error.message,
      });
    } finally {
      session.endSession();
    }
  }
  // async updateTransaction(req, res) {
  //   try {
  //     const { id } = req.params; // Transaction ID
  //     const updateData = req.body; // Data to update

  //     // Call the service to update the transaction
  //     const updatedTransaction = await TransactionService.updateTransaction(id, updateData);

  //     return res.status(200).json({
  //       success: true,
  //       message: "Transaction updated successfully",
  //       data: updatedTransaction,
  //     });
  //   } catch (error) {
  //     return res.status(500).json({
  //       success: false,
  //       message: "Error updating transaction",
  //       error: error.message,
  //     });
  //   }
  // }
  async getAllDeposits(req, res) {
    try {
      // Call the service to get all deposit transactions
      const deposits = await TransactionService.getAllDeposits();

      return res.status(200).json({
        success: true,
        message: "All deposit transactions retrieved successfully",
        data: deposits,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving deposit transactions",
        error: error.message,
      });
    }
  }
  async getAllWithdrawals(req, res) {
    try {
      // Get parameters from query string
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const { startDate, endDate, modeOfPayment, collectedBy, uploadedBy } =
        req.query;

      // Validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid pagination parameters. Page must be ≥ 1, limit must be between 1-100",
        });
      }

      const skip = (page - 1) * limit;

      // Build filter object
      const filter = { type: "withdrawal" };

      // Add date filter if provided
      if (startDate && endDate) {
        filter.paymentDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      // Add modeOfPayment filter if provided
      if (modeOfPayment && ["cash", "transfer"].includes(modeOfPayment)) {
        filter.modeOfPayment = modeOfPayment;
      }

      // Add collectedBy filter if provided
      if (collectedBy) {
        filter.collectedBy = { $regex: collectedBy, $options: "i" };
      }

      // Add uploadedBy filter if provided
      if (uploadedBy) {
        filter.uploadedBy = { $regex: uploadedBy, $options: "i" };
      }

      // Call the service with filters
      const [withdrawals, total] = await Promise.all([
        TransactionService.getAllWithdrawalsPaginated(filter, skip, limit),
        TransactionService.countAllWithdrawals(filter),
      ]);

      return res.status(200).json({
        success: true,
        message: "Withdrawal transactions retrieved successfully",
        data: withdrawals,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
        filters: {
          startDate,
          endDate,
          modeOfPayment,
          collectedBy,
          uploadedBy,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving withdrawal transactions",
        error: error.message,
      });
    }
  }
  async getWithdrawalById(req, res) {
    try {
      const withdrawalId = req.params.withdrawalId;

      // Query the database for the withdrawal transaction with the specified ID
      const withdrawal =
        await TransactionService.getWithdrawalById(withdrawalId);

      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          message: "Withdrawal not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Withdrawal retrieved successfully",
        data: withdrawal,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving withdrawal transaction",
        error: error.message,
      });
    }
  }

  async getDepositById(req, res) {
    try {
      const depositId = req.params.depositId;
      const deposit = await TransactionService.getDepositById(depositId);

      if (!deposit) {
        return res.status(404).json({
          success: false,
          message: "Deposit not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Deposit retrieved successfully",
        data: deposit,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving deposit",
        error: error.message,
      });
    }
  }

  async searchTransactionsByPaymentDate(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Check if startDate and endDate are provided
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Please provide both startDate and endDate for the search.",
        });
      }

      // Parse the input date strings into JavaScript Date objects
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      // Call the service method to search transactions by payment date
      const transactions =
        await TransactionService.searchTransactionsByPaymentDate(
          parsedStartDate,
          parsedEndDate,
        );

      // Return the transactions in the response
      return res.status(200).json({
        success: true,
        message: "Transactions found successfully",
        data: transactions,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error searching transactions by payment date",
        error: error.message,
      });
    }
  }

  async searchTransactionsByDate(req, res) {
    try {
      const { date } = req.query;
      console.log("Received date:", date);

      // Check if a date parameter is provided
      if (!date) {
        return res.status(400).json({
          success: false,
          message: "Please provide a date for the search.",
        });
      }

      // Parse the input date string into a JavaScript Date object
      const searchDate = new Date(date);
      console.log("Parsed date:", searchDate);

      // Calculate the end date by adding one day to the search date
      const endDate = new Date(searchDate);
      endDate.setDate(searchDate.getDate() + 1);

      // Use the TransactionService to search transactions by date range
      const transactions = await TransactionService.searchTransactionsByDate(
        searchDate,
        endDate,
      );

      // Return the transactions in the response
      return res.status(200).json({
        success: true,
        message: "Transactions found successfully",
        data: transactions,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving transactions by date",
        error: error.message,
      });
    }
  }

  async getTotalDepositByTransferByPaymentDate(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Check if startDate and endDate are provided
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Please provide both startDate and endDate for the search.",
        });
      }

      // Parse the input date strings into JavaScript Date objects
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      // Call the service method to retrieve total deposit transactions made by transfer by payment date
      const totalDepositAmount =
        await TransactionService.getTotalDepositByTransferByPaymentDate(
          parsedStartDate,
          parsedEndDate,
        );

      // Return the total deposit amount in the response
      return res.status(200).json({
        success: true,
        message:
          "Total deposit transactions made by transfer retrieved successfully",
        data: {
          totalDepositAmount,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Error retrieving total deposit transactions by transfer by payment date",
        error: error.message,
      });
    }
  }

  async getTotalDepositByCashByPaymentDate(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Check if startDate and endDate are provided
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Please provide both startDate and endDate for the search.",
        });
      }

      // Parse the input date strings into JavaScript Date objects
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      // Call the service method to retrieve total deposit transactions made by cash by payment date
      const totalDepositAmount =
        await TransactionService.getTotalDepositByCashByPaymentDate(
          parsedStartDate,
          parsedEndDate,
        );

      // Return the total deposit amount in the response
      return res.status(200).json({
        success: true,
        message:
          "Total deposit transactions made by cash retrieved successfully",
        data: {
          totalDepositAmount,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Error retrieving total deposit transactions by cash by payment date",
        error: error.message,
      });
    }
  }

  async getTotalWithdrawalsByTransferByPaymentDate(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Please provide both startDate and endDate for the search.",
        });
      }

      const totalWithdrawalsAmount =
        await TransactionService.getTotalWithdrawalsByTransferByPaymentDate(
          new Date(startDate),
          new Date(endDate),
        );

      return res.status(200).json({
        success: true,
        message:
          "Total withdrawal transactions made by transfer retrieved successfully",
        data: {
          totalWithdrawalsAmount,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Error retrieving total withdrawal transactions by transfer by payment date",
        error: error.message,
      });
    }
  }

  async getTotalWithdrawalsByCashByPaymentDate(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Check if startDate and endDate are provided
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Please provide both startDate and endDate for the search.",
        });
      }

      // Parse the input date strings into JavaScript Date objects
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);
      console.log(parsedStartDate, parsedEndDate);

      // Call the service method to retrieve total withdrawal transactions made by cash by payment date
      const totalWithdrawalsAmount =
        await TransactionService.getTotalWithdrawalsByCashByPaymentDate(
          parsedStartDate,
          parsedEndDate,
        );

      // Return the total withdrawal amount in the response
      return res.status(200).json({
        success: true,
        message:
          "Total withdrawal transactions made by cash retrieved successfully",
        data: {
          totalWithdrawalsAmount,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Error retrieving total withdrawal transactions by cash by payment date",
        error: error.message,
      });
    }
  }

  async getAllWithdrawalsByPaymentDate(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Check if startDate and endDate are provided
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Please provide both startDate and endDate for the search.",
        });
      }

      // Parse the input date strings into JavaScript Date objects
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      // Call the new service method to retrieve all withdrawal transactions by payment date
      const withdrawalTransactions =
        await TransactionService.getAllWithdrawalsByPaymentDate(
          parsedStartDate,
          parsedEndDate,
        );

      // Return the withdrawal transactions in the response
      return res.status(200).json({
        success: true,
        message:
          "All withdrawal transactions by payment date retrieved successfully",
        data: withdrawalTransactions,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving all withdrawal transactions by payment date",
        error: error.message,
      });
    }
  }
  async getTotalDepositByPaymentDate(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Check if startDate and endDate are provided
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Please provide both startDate and endDate for the search.",
        });
      }

      // Parse the input date strings into JavaScript Date objects
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      // Call the service method to retrieve total deposit transactions by payment date
      const totalDepositAmount =
        await TransactionService.getTotalDepositByPaymentDate(
          parsedStartDate,
          parsedEndDate,
        );

      // Return the total deposit amount in the response
      return res.status(200).json({
        success: true,
        message: "Total deposit transactions retrieved successfully",
        data: {
          totalDepositAmount,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving total deposit transactions by payment date",
        error: error.message,
      });
    }
  }

  async getAllTransactions(req, res) {
    try {
      // Default values if none provided
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // Calculate skip value
      const skip = (page - 1) * limit;

      // Fetch paginated data and total count
      const [transactions, total] = await Promise.all([
        TransactionService.getAllTransactionsPaginated(skip, limit),
        TransactionService.countAllTransactions(),
      ]);

      return res.status(200).json({
        success: true,
        message: "Transactions retrieved successfully",
        data: transactions,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving transactions",
        error: error.message,
      });
    }
  }

  async getAllTransactionsByCash(req, res) {
    try {
      // Call the service to get all transactions with modeOfPayment set to 'cash'
      const cashTransactions =
        await TransactionService.getAllTransactionsByCash();

      return res.status(200).json({
        success: true,
        message: "All transactions by cash retrieved successfully",
        data: cashTransactions,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving transactions by cash",
        error: error.message,
      });
    }
  }

  async getAllTransactionsByTransfer(req, res) {
    try {
      // Call the service to get all transactions with modeOfPayment set to 'transfer'
      const transferTransactions =
        await TransactionService.getAllTransactionsByTransfer();

      return res.status(200).json({
        success: true,
        message: "All transactions by transfer retrieved successfully",
        data: transferTransactions,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving transactions by transfer",
        error: error.message,
      });
    }
  }
  async getAllTransactionsByUploader(req, res) {
    try {
      const {
        uploadedBy,
        page = 1,
        limit = 50,
        startDate,
        endDate,
      } = req.query;

      if (!uploadedBy) {
        return res.status(400).json({
          success: false,
          message: "Please provide uploadedBy in query params",
        });
      }

      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const skip = (pageNumber - 1) * limitNumber;

      const query = { uploadedBy };

      // ✅ Filter by date range (if provided)
      if (startDate && endDate) {
        query.paymentDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      // Get total and paginated results
      const [transactions, total] = await Promise.all([
        TransactionService.getTransactions(query, skip, limitNumber),
        TransactionService.countTransactions(query),
      ]);

      res.status(200).json({
        success: true,
        message: "Transactions retrieved successfully",
        data: transactions,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving transactions by uploader",
        error: error.message,
      });
    }
  }
  async getAllTransactionsByCollector(req, res) {
    try {
      const {
        collectedBy,
        page = 1,
        limit = 50,
        startDate,
        endDate,
      } = req.query;

      if (!collectedBy) {
        return res.status(400).json({
          success: false,
          message: "Please provide collectedBy in query params",
        });
      }

      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const skip = (pageNumber - 1) * limitNumber;

      const query = { collectedBy };

      // ✅ Filter by date range (if provided)
      if (startDate && endDate) {
        query.paymentDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      // Get total and paginated results
      const [transactions, total] = await Promise.all([
        TransactionService.getTransactions(query, skip, limitNumber),
        TransactionService.countTransactions(query),
      ]);

      res.status(200).json({
        success: true,
        message: "Transactions retrieved successfully",
        data: transactions,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving transactions by collector",
        error: error.message,
      });
    }
  }

  async getAllTransactionsByCustomer(req, res) {
    try {
      const { customerId } = req.params;

      // Check if customerId is provided
      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: "Please provide a customerId for the search.",
        });
      }

      // Call the service method to retrieve all transactions for a customer
      const transactions =
        await TransactionService.getAllTransactionsByCustomer(customerId);

      return res.status(200).json({
        success: true,
        message: "Transactions retrieved successfully",
        data: transactions,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving transactions for customer",
        error: error.message,
      });
    }
  }
}

module.exports = new TransactionController();
