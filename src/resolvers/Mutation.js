const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("crypto");
const { promisify } = require("util");
const { createResetMessage, transport } = require("../mail");
const mutations = {
  createItem(parent, { data }, { db, request }, info) {
    //TODO : Check if they are logged in
    if (!request.Userid) {
      throw new Error("Not logged in");
    }
    console.log(request.Userid);
    return db.mutation.createItem(
      {
        data: {
          ...data,
          user: {
            connect: {
              id: request.Userid
            }
          }
        }
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
    if (!user) {
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
  },
  async requestReset(parent, { email }, ctx, info) {
    const user = await ctx.db.query.user({
      where: {
        email
      }
    });
    if (!user) {
      throw new Error("User Not found");
    }
    const resetToken = (await promisify(randomBytes)(20)).toString("hex");
    const res = await ctx.db.mutation.updateUser({
      where: { email },
      data: {
        refreshToken: resetToken,
        refreshTokenExpiry: Date.now() + 3600000
      }
    });
    //mail
    const mailRes = await transport.sendMail({
      from: "sidhant.manchanda@gmail.com",
      to: user.email,
      subject: "Password Reset Token",
      html: createResetMessage(
        `<a href=${
          process.env.FRONTEND_URL
        }/reset?reset=${resetToken}>Reset Password</a>`
      )
    });
    return { message: "Success" };
  },
  async resetPassword(
    parent,
    { refreshToken, newPassword, confirmPassword },
    ctx,
    info
  ) {
    if (newPassword !== confirmPassword) {
      throw new Error("passwords dont match");
    }
    const [user] = await ctx.db.query.users({
      where: {
        refreshToken,
        refreshTokenExpiry_gte: Date.now() - 3600000
      }
    });
    if (!user) {
      throw new Error("refresh token is either invalid or expired");
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await ctx.db.mutation.updateUser({
      where: {
        id: user.id
      },
      data: {
        password: hashedPassword,
        refreshToken: null,
        refreshTokenExpiry: null
      }
    });
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
    return updatedUser;
  }
};

module.exports = mutations;
