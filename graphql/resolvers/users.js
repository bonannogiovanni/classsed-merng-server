const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { UserInputError } = require("apollo-server");

const {
  validateRegisterInput,
  validateLoginInput,
} = require("../../util/validators");
const { SECRET_KEY } = require("../../config");
const User = require("../../models/User");

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    SECRET_KEY,
    { expiresIn: "3600S" }
  );
}

module.exports = {
  Mutation: {
    async login(parent, { username, password }) {
      const { valid, errors } = validateLoginInput(username, password);

      if(!valid){
        throw new UserInputError("Errors", { errors });
      }

      const user = await User.findOne({ username });

      if (!user) {
        errors.general = "User not found";
        throw new UserInputError("User not found", { errors });
      } else {
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          errors.general = "Wrong Credentials";
          throw new UserInputError("Wrong Credentials", { errors });
        }
      }

      const token = generateToken(user);

      console.log(user);
      console.log(token);

      return {
        id: user._id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        token,
      };
    },
    async register(
      parent,
      { registerInput: { username, email, password, confirmPassword } },
      context,
      info
    ) {
      const { valid, errors } = validateRegisterInput(
        username,
        email,
        password,
        confirmPassword
      );

      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }

      const user = await User.findOne({ username });

      if (user) {
        throw new UserInputError("Username is taken", {
          errors: {
            username: "This username is taken",
          },
        });
      }

      password = await bcrypt.hash(password, 12);

      const newUser = new User({
        email,
        username,
        password,
        createdAt: new Date().toISOString(),
      });

      const res = await newUser.save();

      console.log(res);

      const token = generateToken(res);

      return {
        id: res._id,
        email: res.email,
        username: res.username,
        createdAt: res.createdAt,
        token,
      };
    },
  },
};
