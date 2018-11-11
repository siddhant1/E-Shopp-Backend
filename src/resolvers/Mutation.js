const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mutations = {
  createItem(parent, { data }, { db }, info) {
    //TODO : Check if they are logged in
    return db.mutation.createItem(
      {
        data
      },
      info
    );
  },
  updateItem(parent, { data, where }, { db }, info) {
    const updates = data;
    delete updates.id;
    return db.mutation.updateItem(
      {
        data: updates,
        where: {
          id: where.id
        }
      },
      info
    );
  },
  deleteItem(parent, { where }, { db }, info) {
    return db.mutation.deleteItem(
      {
        where
      },
      info
    );
  },
  async signup(
    parent,
    { email, name, password },
    { db, response, request },
    info
  ) {
    email = email.toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.mutation.createUser(
      {
        data: {
          name,
          email,
          password: hashedPassword,
          permissions: { set: ["USER"] }
        }
      },
      info
    );
    const token = jwt.sign({ Userid: user.id }, process.env.APP_SECRET);
    response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    return user;
  },
  async signin(parent, { email, password }, ctx, info) {
    //Check user
    const user = await ctx.db.query.user({
      where: { email }
    });
    if (!email) {
      throw new Error("Unable to login");
    }
    //check pass
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error("Unable to login");
    }
    //generate JWT
    const token = jwt.sign({ Userid: user.id }, process.env.APP_SECRET);
    //SET cookie
    ctx.response.cookie(
      "token",
      token,
      {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365
      },
      info
    );
    //return the user
    return user;
  },
  signOut(parent, args, ctx, info) {
    ctx.response.clearCookie("token");
    return {
      message: "signedOut"
    };
  }
};

module.exports = mutations;
