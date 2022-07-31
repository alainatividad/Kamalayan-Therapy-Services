const { AuthenticationError } = require("apollo-server-express");
const { Client, Consultant, Availability } = require("../models");
const { signToken } = require("../utils/auth");
const { GraphQLScalarType, Kind } = require("graphql");

// from https://www.apollographql.com/docs/apollo-server/schema/custom-scalars/
const dateScalar = new GraphQLScalarType({
  name: "Date",
  description: "Date custom scalar type",
  serialize(value) {
    return value.getTime(); // Convert outgoing Date to integer for JSON
  },
  parseValue(value) {
    return new Date(value); // Convert incoming integer to Date
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      return new Date(parseInt(ast.value, 10)); // Convert hard-coded AST string to integer and then to Date
    }
    return null; // Invalid hard-coded value (not an integer)
  },
});

const resolvers = {
  Date: dateScalar,
  Query: {
    // query for getting own data
    meClient: async (parent, args, context) => {
      if (context.user) {
        const client = await Client.findOne({ _id: context.user._id });
        if (!client) {
          throw new AuthenticationError("No user with this email found.");
        }
        return client;
      }
      throw new AuthenticationError("You need to be logged in");
    },
    meConsultant: async (parent, args, context) => {
      if (context.user) {
        const consultant = await Consultant.findOne({ _id: context.user._id })
          .populate("availabilities")
          .populate("clients");
        if (!consultant) {
          throw new AuthenticationError("No user with this email found.");
        }
        return consultant;
      }
      throw new AuthenticationError("You need to be logged in");
    },
    getAvailability: async (parent, { consultantId }, context) => {
      if (context.user) {
        return await Availability.find({
          consultantId: consultantId,
          "sched.booked": false,
        });
      }
    },
    getAllAvailability: async (parent, args, context) => {
      if (context.user) {
        return await Availability.find();
      }
    },
    getConsultants: async (parent, args, context) => {
      return await Consultant.find();
    },
    getClient: async (parent, { clientId }, context) => {
      if (context.user) {
        return await Client.findOne({ _id: clientId });
      }
    },
  },

  Mutation: {
    loginClient: async (parent, { email, password }) => {
      const user = await Client.findOne({ email });
      if (!user) {
        throw new AuthenticationError("No user with this email found.");
      }
      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError("Invalid credentials");
      }
      const token = signToken(user);
      return { token, user };
    },
    loginConsultant: async (parent, { email, password }) => {
      const user = await Consultant.findOne({ email })
        .populate("availabilities")
        .populate("clients");
      if (!user) {
        throw new AuthenticationError("No user with this email found.");
      }
      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError("Invalid credentials");
      }
      const token = signToken(user);
      return { token, user };
    },
    createClient: async (parent, { email, password, firstName, lastName }) => {
      const user = await Client.create({
        email,
        password,
        firstName,
        lastName,
      });
      if (!user) {
        throw new AuthenticationError("There is an issue logging in.");
      }
      const token = signToken(user);
      return { token, user };
    },
    createConsultant: async (
      parent,
      { email, password, firstName, lastName }
    ) => {
      const user = await Consultant.create({
        email,
        password,
        firstName,
        lastName,
      });
      if (!user) {
        throw new AuthenticationError("There is an issue logging in.");
      }
      const token = signToken(user);
      return { token, user };
    },
    addBooking: async (
      parent,
      { consultantId, scheduleDate, concern },
      context
    ) => {
      // update Availability, Client, and Consultant tables
      if (context.user) {
        const consultantSaved = await Consultant.findOneAndUpdate(
          { _id: consultantId },
          { $addToSet: { clients: context.user._id } }
        );

        if (consultantSaved) {
          const client = await Client.findOneAndUpdate(
            { _id: context.user._id },
            {
              scheduleDate: scheduleDate,
              consultant: consultantSaved.fullName,
              concern: concern,
            },
            { new: true, runValidators: true }
          );

          await Availability.findOneAndUpdate(
            {
              consultantId: consultantId,
              "sched.time": scheduleDate,
            },
            { $set: { "sched.$.booked": true } },
            { new: true, runValidators: true }
          );
          return client;
        } else {
          throw new Error("Did not find consultant");
        }
      }
    },
    updateAvailability: async (parent, { consultantId, time }, context) => {
      if (context.user) {
        // console.log(date);
        return Availability.findOneAndUpdate(
          {
            consultantId: consultantId,
            "sched.time": time,
          },
          { $set: { "sched.$.booked": true } },
          { new: true, runValidators: true }
        );
      }
    },
    addClientToConsultant: async (parent, { consultantId }, context) => {
      if (context.user) {
        return Consultant.findOneAndUpdate(
          { _id: consultantId },
          { $addToSet: { client: context.user._id } },
          { new: true, runValidators: true }
        );
      }
      throw new AuthenticationError("You need to be logged in");
    },
    updateConsultantDetails: async (parent, { consultantInput }, context) => {
      if (context.user) {
        return Consultant.findOneAndUpdate(
          { _id: context.user._id },
          { $set: { "consultant.$": { consultantInput } } },
          { new: true, runValidators: true }
        );
      }
      throw new AuthenticationError("You need to be logged in");
    },
    // updateAvailability: async (parent, { date }, context) => {
    //   if (context.user) {
    //     console.log(date);
    //     return Availability.create({
    //       consultantId: context.user._id,
    //       date: date,
    //     });
    //   }
    // },
    // updateClientDetails: async (parent, { client }, context) => {
    //   if (context.user) {
    //     return Client.findOneAndUpdate(
    //       { _id: context.user._id },
    //       { $pull: { savedBooks: { bookId: bookId } } },
    //       { new: true, runValidators: true }
    //     );
    //   }
    //   throw new AuthenticationError("You need to be logged in");
    // },
  },
};

module.exports = resolvers;
