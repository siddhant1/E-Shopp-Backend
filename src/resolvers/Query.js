const { forwardTo } = require("prisma-binding");
const Query = {
  items: forwardTo("db")
  // items(parent, args, { db }, info) {
  //   return db.query.items(null, info);
  // }
};

module.exports = Query;
