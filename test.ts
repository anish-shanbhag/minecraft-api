const axios = require("axios");

(async () => {
  try {
    const { data } = await axios.get("http://localhost:3000/api/blocks", {
      params: {
        fields: ["name", "blastResistance"],
        order: "desc",
        sort: "blastResistance",
        transparent: true,
      },
    });
    console.log(data);
  } catch (e) {
    console.log(e.response);
  }
})();
