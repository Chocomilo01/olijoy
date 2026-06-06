const axios = require("axios");

const formatPhone = (phone) => {
  if (!phone) return "";

  phone = phone.toString().trim();

  // +2349031234567 => 2349031234567
  if (phone.startsWith("+234")) {
    return phone.replace("+", "");
  }

  // 09031234567 => 2349031234567
  if (phone.startsWith("0")) {
    return "234" + phone.slice(1);
  }

  return phone;
};

const sendSMS = async (phone, message) => {
  try {
    const formattedPhone = formatPhone(phone);

    const response = await axios.post(
      "https://api.ng.termii.com/api/sms/send",
      {
        api_key: process.env.TERMII_API_KEY,
        to: formattedPhone,
        from: process.env.TERMII_SENDER_ID,
        sms: message,
        type: "plain",
        channel: "generic",
      },
    );

    console.log("TERMII RESPONSE:", response.data);

    return response.data;
  } catch (error) {
    console.error("TERMII ERROR:", error.response?.data || error.message);

    return null;
  }
};

module.exports = {
  sendSMS,
};
