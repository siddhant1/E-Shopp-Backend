require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

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
