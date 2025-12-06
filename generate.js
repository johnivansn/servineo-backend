const bcrypt = require("bcrypt");

(async () => {
  const password = "ser123vineo#";
  const hash = await bcrypt.hash(password, 10);

  console.log("HASH GENERADO:");
  console.log(hash);
})();
