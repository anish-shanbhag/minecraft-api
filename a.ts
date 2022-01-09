const axios = require("axios");

(async () => {
  try {
    const { data } = await axios.get("http://localhost:3000/api/items", {
      params: { fields: ["name", "image"], stackSize: 6, renewable: false },
    });
    console.log(data);
  } catch (e) {
    console.log(e.response);
  }
})();
