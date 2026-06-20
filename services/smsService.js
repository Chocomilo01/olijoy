const axios = require("axios");

const sendSMS = async (phone, message) => {
  // ==========================
  // TRY TERMII FIRST
  // ==========================
  try {
    console.log("Trying Termii...");

    const termiiResponse = await axios.post(
      "https://api.ng.termii.com/api/sms/send",
      {
        to: phone,
        from: process.env.TERMII_SENDER_ID, // e.g OLIJOY
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: process.env.TERMII_API_KEY,
      },
    );

    console.log("TERMII SUCCESS:");
    console.log(termiiResponse.data);

    return termiiResponse.data;
  } catch (termiiError) {
    console.log("TERMII FAILED:");
    console.log(termiiError.response?.data || termiiError.message);

  // ==========================
  // FALLBACK TO BULKSMSNIGERIA
  // ==========================
  try {
    console.log("Trying BulkSMSNigeria...");

    const bulkResponse = await axios.get(
      "https://www.bulksmsnigeria.com/api/v1/sms/create",
      {
        params: {
          api_token: process.env.BULKSMS_API_TOKEN,
          from: process.env.BULKSMS_SENDER_ID,
          to: phone,
          body: message,
          dnd: 2,
        },
      },
    );

    console.log("BULKSMS SUCCESS:");
    console.log(bulkResponse.data);

    return bulkResponse.data;
  } catch (bulkError) {
    console.log("BULKSMS FAILED:");
    console.log(bulkError.response?.data || bulkError.message);

    throw bulkError;
  }
    }
};

module.exports = {
  sendSMS,
};

// const axios = require("axios");

// const sendViaTermii = async (phone, message) => {
//   return axios.post("https://api.ng.termii.com/api/sms/send", {
//     to: phone,
//     from: process.env.TERMII_SENDER_ID,
//     sms: message,
//     type: "plain",
//     channel: "generic",
//     api_key: process.env.TERMII_API_KEY,
//   });
// };

// const sendViaEBulkSMS = async (phone, message) => {
//   return axios.post("http://api.ebulksms.com:8080/sendsms", null, {
//     params: {
//       username: process.env.EBULKSMS_USERNAME,
//       apikey: process.env.EBULKSMS_API_KEY,
//       sender: process.env.EBULKSMS_SENDER_ID,
//       messagetext: message,
//       flash: 0,
//       recipients: phone,
//     },
//   });
// };

// const sendSMS = async (phone, message) => {
//   try {
//     console.log("Trying Termii...");
//     const result = await sendViaTermii(phone, message);
//     console.log("Termii Success");
//     return result.data;
//   } catch (termiiError) {
//     console.log("Termii Failed");

//     try {
//       console.log("Trying eBulkSMS...");
//       const result = await sendViaEBulkSMS(phone, message);
//       console.log("eBulkSMS Success");
//       return result.data;
//     } catch (ebulkError) {
//       console.log("eBulkSMS Failed");
//       throw ebulkError;
//     }
//   }
// };

// module.exports = { sendSMS };
