const fs = require('fs');
const path = require('path');
//const multer = require('multer'); // Assuming you're using multer for file uploads

const CustomerService = require("../services/customerService");
const  { generateUniqueAccountNumber } = require("../utils/uniqueNumber")
const CustomerModel = require("../model/customerModel");
const customerService = require("../services/customerService");

const TransactionModel = require("../model/transactionModel");
const formatPhone = require("../utils/phoneFormatter");


class CustomerController {

  // CREATE CUSTOMER
  async createCustomer(req, res) {
    try {
      const customer = { ...req.body };
      const picturePath = req.body.picturePath;

          customer.officerIncharge =
      `${req.user.firstName} ${req.user.lastName}`.trim();

      // Generate unique account number
      let accountNumber;
      let existingCustomer;

      do {
        accountNumber = generateUniqueAccountNumber();

        existingCustomer = await CustomerService.fetchOne({
          accountNumber,
        });
      } while (existingCustomer);

      customer.accountNumber = accountNumber;

      // Format phone number
      if (customer.customersPhoneNo) {
        customer.customersPhoneNo = formatPhone(customer.customersPhoneNo);
      }

      // Check duplicate BVN
      if (customer.bvn) {
        const existingBVN = await CustomerModel.findOne({
          bvn: customer.bvn,
        });

        if (existingBVN) {
          return res.status(400).json({
            success: false,
            message: "BVN already exists",
          });
        }
      }

      // Check duplicate phone
      if (customer.customersPhoneNo) {
        const existingPhone = await CustomerModel.findOne({
          customersPhoneNo: customer.customersPhoneNo,
        });

        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message: "Phone number already exists",
          });
        }
      }

      // Save image if supplied
      if (picturePath && fs.existsSync(picturePath)) {
        customer.picture = picturePath;
      }

      console.log("Customer to save:", customer);

      const createdCustomer = await customerService.create(customer);

      return res.status(201).json({
        success: true,
        message: "Customer Created Successfully",
        data: createdCustomer,
        accountNumber,
      });
    } catch (error) {
      console.error("CREATE CUSTOMER ERROR:", error);

      // Mongo duplicate key fallback
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];

        return res.status(400).json({
          success: false,
          message: `${field} already exists`,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error creating customer",
        error: error.message,
      });
    }
  }

  // UPDATE CUSTOMER
  async updateCustomer(req, res) {
    try {
      const customerId = req.params.id;
      const updateData = { ...req.body };

      // Format phone automatically
      if (updateData.customersPhoneNo) {
        updateData.customersPhoneNo = formatPhone(updateData.customersPhoneNo);
      }

      const existingCustomer = await CustomerService.fetchOne({
        _id: customerId,
      });

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Prevent duplicate names
      if (updateData.name) {
        const duplicateName = await CustomerService.fetchOne({
          name: new RegExp(`^${updateData.name}$`, "i"),
        });

        if (duplicateName && duplicateName._id.toString() !== customerId) {
          return res.status(400).json({
            success: false,
            message: "Customer with that name already exists",
          });
        }
      }

      // Prevent duplicate BVN
      if (updateData.bvn) {
        const duplicateBVN = await CustomerModel.findOne({
          bvn: updateData.bvn,
          _id: { $ne: customerId },
        });

        if (duplicateBVN) {
          return res.status(400).json({
            success: false,
            message: "BVN already exists",
          });
        }
      }

      // Prevent duplicate phone
      if (updateData.customersPhoneNo) {
        const duplicatePhone = await CustomerModel.findOne({
          customersPhoneNo: updateData.customersPhoneNo,
          _id: { $ne: customerId },
        });

        if (duplicatePhone) {
          return res.status(400).json({
            success: false,
            message: "Phone number already exists",
          });
        }
      }

      const updatedCustomer = await CustomerService.update(
        customerId,
        updateData,
      );

      return res.status(200).json({
        success: true,
        message: "Customer updated successfully",
        data: updatedCustomer,
      });
    } catch (error) {
      console.error("UPDATE CUSTOMER ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Error updating customer",
        error: error.message,
      });
    }
  }

  // GET ALL CUSTOMERS
  async fetchCustomers(req, res) {
    try {
      const customers = await CustomerService.fetch({});

      return res.status(200).json({
        success: true,
        message: "Customer Fetched Successfully",
        data: customers,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET ONE CUSTOMER
  async fetchOneCustomer(req, res) {
    try {
      const customerId = req.params.id;

      const customer = await CustomerService.fetchOne({
        _id: customerId,
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Customer Fetched Successfully",
        data: customer,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // DELETE CUSTOMER
  async deleteCustomer(req, res) {
    try {
      const customerId = req.params.id;

      const customer = await CustomerService.fetchOne({
        _id: customerId,
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      await CustomerService.delete(customerId);

      return res.status(200).json({
        success: true,
        message: "Customer Deleted Successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // CUSTOMER TRANSACTIONS
  async getCustomerTransactions(req, res, next) {
    try {
      const customerId = req.params.customerId;

      const transactions =
        await customerService.getCustomerTransactions(customerId);

      return res.status(200).json(transactions);
    } catch (error) {
      next(error);
    }
  }

  // SEARCH BY NAME
  async searchCustomerByName(req, res) {
    try {
      const { name } = req.query;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Please provide a name",
        });
      }

      const customers = await CustomerService.fetch({
        name: {
          $regex: name,
          $options: "i",
        },
      });

      return res.status(200).json({
        success: true,
        message: "Customers found successfully",
        data: customers,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // SAVINGS TRANSACTIONS
  async getSavingsTransactions(customerId) {
    try {
      return await TransactionModel.find({
        customer: customerId,
        type: "savings",
      });
    } catch (error) {
      throw error;
    }
  }

  // SEARCH CUSTOMERS
  async searchCustomers(req, res) {
    try {
      const { name, accountNumber, phoneNumber, dateOfBirth } = req.query;

      const query = {};

      if (name) query.name = new RegExp(name, "i");

      if (accountNumber) query.accountNumber = new RegExp(accountNumber, "i");

      if (phoneNumber) query.customersPhoneNo = new RegExp(phoneNumber, "i");

      if (dateOfBirth) query.dateOfBirth = new RegExp(dateOfBirth, "i");

      const customers = await CustomerService.searchCustomers(query);

      return res.status(200).json({
        success: true,
        message: "Customers found successfully",
        data: customers,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new CustomerController()
