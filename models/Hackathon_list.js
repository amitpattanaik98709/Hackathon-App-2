const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  university: { type: String, required: true },
  role: { type: String, required: true },
  fieldOfStudy: { type: String, required: true },
  graduationYear: { type: String, required: true },
  teamName: { type: String, required: true },
  teamRole: { type: String, required: true },
  skills: { type: String, required: true },
  hackathonExperience: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  agreeTerms: { type: Boolean, required: true },
  parentalConsent: { type: Boolean, required: true },
  photoRelease: { type: Boolean, required: true },
  linkedIn: { type: String, required: true },
  gitHub: { type: String, required: true },
  teamMembers: [{ type: String }], // Updated to support an array of team members
});

const listschema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  image: { type: String, required: true },
  level: { type: String, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  location: { type: String, required: true },
  time: { type: String, required: true },
  participants: [participantSchema], // Updated to hold participant data
  problemStatements: [
    {
      statement: { type: String, required: true },
      theme: { type: String, required: true },
      category: {
        software: { type: Boolean, required: true },
        hardware: { type: Boolean, required: true },
      },
    },
  ],
});

module.exports = mongoose.model("Hackathon", listschema);
