const { hasPermission } = require("../utils");
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
  },
  users(parent, args, ctx, info) {
    if (!ctx.request.Userid) {
      throw new Error("YOu must be logged in to continue");
    }
    hasPermission(ctx.request.user, ["ADMIN", "PERMISSIONUPDATE"]);

    return ctx.db.query.users(null, info);
  }
  // items(parent, args, { db }, info) {
  //   return db.query.items(null, info);
  // }
};

module.exports = Query;
