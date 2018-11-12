require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const db = require("./db");

const createServer = require("./createServer");

const server = createServer();

server.express.use(cookieParser());

server.express.use((req, res, next) => {
  const token = req.cookies.token;
  if (!token) return next();
  const { Userid } = jwt.verify(token, process.env.APP_SECRET);
  req.Userid = Userid;
  next();
});
//Populate the user itself
server.express.use(async (req, res, next) => {
  if (!req.Userid) return next();
  const user = await db.query.user({
    where: { id: req.Userid }
  },'{id name email permissions}');
  req.user = user;
  next();
});

server.start(
  {
    cors: {
      credentials: true,
      origin: process.env.FRONTEND_URL
    }
  },
  ({ port }) => {
    console.log(`server is running on ${port}`);
  }
);
