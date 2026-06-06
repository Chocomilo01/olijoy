function formatPhone(phone) {
  if (!phone) return phone;

  phone = phone.toString().trim();

  // remove spaces
  phone = phone.replace(/\s+/g, "");

  // already international
  if (phone.startsWith("234")) {
    return phone;
  }

  // +2349033080031 -> 2349033080031
  if (phone.startsWith("+234")) {
    return phone.substring(1);
  }

  // 09033080031 -> 2349033080031
  if (phone.startsWith("0")) {
    return "234" + phone.substring(1);
  }

  return phone;
}

module.exports = formatPhone;
