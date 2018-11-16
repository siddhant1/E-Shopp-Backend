const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("crypto");
const { hasPermission } = require("../utils");
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
  async updateItem(parent, { data, where }, { db, request }, info) {
    const updates = { ...data };
    delete updates.id;
    //Check if the user is logged in?
    if (!request.Userid) {
      throw new Error("Please Login ");
    }
    //Check if the user is the maker of the item
    const item = await db.query.item(
      {
        where
      },
      "{ id  user { id name }}"
    );
    const isOwned = item.user.id === request.Userid;
    const canUpdate = request.user.permissions.some(permission => {
      return ["ADMIN", "ITEMDELETE"].includes(permission);
    });
    if (isOwned || canUpdate) {
      return db.mutation.updateItem(
        {
          data: updates,
          where: {
            id: where.id
          }
        },
        info
      );
    } else {
      throw new Error("Unauthorized");
    }
  },
  async deleteItem(parent, { where }, { db, request }, info) {
    //Check if the user is logged in
    if (!request.Userid) {
      throw new Error("Please Login ");
    }
    const item = await db.query.item(
      {
        where
      },
      "{ id  user { id name }}"
    );
    //Check if the user owns the item
    const isOwned = item.user.id === request.Userid;
    //Check if the user has the permission
    const canDelete = request.user.permissions.some(permission => {
      return ["ADMIN", "ITEMDELETE"].includes(permission);
    });
    //if either of them is true delete the item
    if (isOwned || canDelete) {
      return db.mutation.deleteItem(
        {
          where
        },
        info
      );
    } else {
      throw new Error("You are not authorized to delete this item");
    }
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
  },
  async updatePermissions(parent, args, ctx, info) {
    if (!ctx.request.Userid) {
      throw new Error("Not Logged in");
    }
    const user = ctx.request.user;
    hasPermission(user, ["ADMIN", "PERMISSIONUPDATE"]);
    return ctx.db.mutation.updateUser(
      {
        data: { permissions: { set: args.permissions } },
        where: { id: args.userId }
      },
      info
    );
  },
  async addToCart(parent, { itemId }, ctx, info) {
    //Check if the user is logged in
    if (!ctx.request.Userid) {
      throw new Error("Please Log In");
    }
    //Query the current user has already put this item
    const [ExistingItemInCart] = await ctx.db.query.cartItems({
      where: {
        user: { id: ctx.request.Userid },
        item: { id: itemId }
      }
    });
    if (ExistingItemInCart) {
      return ctx.db.mutation.updateCartItem(
        {
          where: { id: ExistingItemInCart.id },
          data: {
            quantity: ExistingItemInCart.quantity + 1
          }
        },
        info
      );
    } else {
      return ctx.db.mutation.createCartItem(
        {
          data: {
            user: {
              connect: {
                id: ctx.request.Userid
              }
            },
            item: {
              connect: { id: itemId }
            }
          }
        },
        info
      );
    }
  },
  async removeFromCart(parent, { id }, ctx, info) {
    //Check id they are logged in
    if (!ctx.request.Userid) {
      throw new Error("Please log in");
    }

    //Find the cart item
    const CartItem =await ctx.db.query.cartItem(
      {
        where: {
          id
        }
      },
      "{id user {id}}"
    );
    if (!CartItem) {
      throw new Error("No item found");
    }
    if (CartItem.user.id !== ctx.request.Userid) {
      throw new Error("Delete your items please");
    }
    return ctx.db.mutation.deleteCartItem(
      {
        where: { id }
      },
      info
    );
  }
};

module.exports = mutations;
