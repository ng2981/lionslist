export function validateRegistration({ name, email, gradYear, whatsapp, school }) {
  const errors = {};
  if (!name?.trim()) errors.name = "Name is required";
  if (!email?.endsWith("@columbia.edu"))
    errors.email = "Must be a @columbia.edu email";
  if (!gradYear || gradYear < 2020 || gradYear > 2035)
    errors.gradYear = "Enter a valid year";
  const digitsOnly = (whatsapp || "").replace(/\D/g, "");
  if (!digitsOnly || digitsOnly.length !== 10)
    errors.whatsapp = "Enter valid phone number";
  if (!school) errors.school = "Please select your school";
  return errors;
}

export function validateListing(form, marketplace) {
  const errors = {};
  if (!form.name?.trim()) errors.name = "Item name is required";
  if (marketplace.pricing_mode !== "free") {
    if (form.price === "" || Number(form.price) < 0)
      errors.price = "Enter a valid price";
    if (
      marketplace.pricing_mode === "max" &&
      Number(form.price) > marketplace.price_max
    )
      errors.price = `Price cannot exceed $${marketplace.price_max}`;
  }
  return errors;
}
