const axios = require("axios");

const formatPhone = (phone) => {
  if (!phone) return "";

  phone = phone.toString().trim();

  if (phone.startsWith("+234")) {
    return phone.replace("+", "");
  }

  if (phone.startsWith("0")) {
    return "234" + phone.slice(1);
  }

  return phone;
};

const sendSMS = async (phone, message) => {
  try {
    const formattedPhone = formatPhone(phone);

    const response = await axios.get(
      "https://www.bulksmsnigeria.com/api/v1/sms/create",
      {
        params: {
          api_token: process.env.BULKSMS_API_TOKEN,
          from: process.env.BULKSMS_SENDER_ID,
          to: formattedPhone,
          body: message,
          dnd: 2,
        },
      },
    );

    console.log("BULKSMS RESPONSE:", response.data);

    return response.data;
  } catch (error) {
    console.error("BULKSMS ERROR:", error.response?.data || error.message);

    return null;
  }
};

module.exports = {
  sendSMS,
};
