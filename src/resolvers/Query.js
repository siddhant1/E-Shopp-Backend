const { forwardTo } = require("prisma-binding");
const Query = {
  items: forwardTo("db"),
  item: forwardTo("db"),
  itemsConnection: forwardTo("db"),
  me(parent, args, ctx, info) {
    const Userid = ctx.request.Userid;
    if (!Userid) {
      return null;
    }
    return ctx.db.query.user(
      {
        where: {
          id: Userid    
        }
      },
      info
    );
  }
  // items(parent, args, { db }, info) {
  //   return db.query.items(null, info);
  // }
};

module.exports = Query;
