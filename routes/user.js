const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { connectToDb, getDb } = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../utils/cookiesUtils");
const {
  getLoggedInUser,
  getLocations,
  isUsernameTaken,
  updateUserInfo,
  getUserEvents,
  getUserGroups,
  getGroup,
  getGroupUsers,
  isUserInGroup,
  addMessageToGroup,
  removeUserFromGroup,
  removeGroupFromUser,
  getGroupEvents,
  getGroupSuggestedEvents,
  getInterests,
  setUserInterests,
  getEventParticipants,
  isUserInEvent,
  getEvent,
  addUserToEvent,
  addEventToUser,
  removeUserFromEvent,
  removeEventFromUser,
  isUserVotedToDelete,
  deleteAllButOneEmptyGroup,
  emptyGroupsInterestAndRequirementsAmount,
  getUserNotParticiaingEvents,
} = require("../utils/dbUtils");

//connect to db
let db;
connectToDb((err) => {
  if (!err) {
    db = getDb();
  }
});

//
//
//
//
//
//
//
//
//
//
// Routes for USER
router.get("/", async (req, res) => {
  try {
    const token = verifyToken(res, req);

    if (token == null) {
      res.render("user2", { isLoggedIn: false, hasTypeWrong: false });
    } else {
      const user = await getLoggedInUser(token);
      const locations = await getLocations();
      const groups = await getUserGroups(token._id);
      const events = await getUserEvents(token._id);
      let groupsPerInterest = {};
      let eventsPerInterest = {};
      const warning = req.query.warning;
      const message = req.query.message;
      // Code below will count amount of groups user is member of for each interest.
      // And the amount of events user is participating in, per interest.
      user.interests.forEach((interest) => {
        //initialising the object.
        groupsPerInterest[interest] = 0;
        eventsPerInterest[interest] = 0;
      });

      groups.forEach((group) => {
        //adding 1 to the value of the interest corresponding the the group.
        groupsPerInterest[group.interest] += 1;
      });

      events.forEach((event) => {
        //adding 1 to the value of the interest corresponding the the event.
        eventsPerInterest[event.interest] += 1;
      });

      res.render("user2", {
        isLoggedIn: true,
        hasTypeWrong: false,
        user,
        groupsPerInterest,
        eventsPerInterest,
        locations: locations,
        warning,
        message,
      });
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

router.post("/profile-picture/update", async (req, res) => {
  try {
    const token = verifyToken(res, req);

    if (token == null) {
      res.render("user2", { isLoggedIn: false });
    } else {
      await db.collection("users").updateOne(
        { _id: new ObjectId(token._id) },
        {
          $set: {
            profileImageId: parseInt(req.body.profileImageId),
          },
        }
      );
      return res.redirect("/user");
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

router.post("/info/update", async (req, res) => {
  try {
    const token = verifyToken(res, req);
    if (token == null) {
      res.render("user2", { isLoggedIn: false });
    } else {
      const user = await getLoggedInUser(token);
      let locations = await getLocations();
      locations = locations.map((location) => location.location);

      //Checks if location is valid
      if (!locations.includes(req.body.location)) {
        return res.redirect(
          `/user?warning=+${req.body.location}+is+not+valid+a+valid+location`
        );
      }

      //Checks if username is already taken.
      if (
        req.body.username != user.username &&
        (await isUsernameTaken(req.body.username))
      ) {
        return res.redirect("/user?warning=Username+taken");
      } else {
        // Else change user info - if username is not taken or has not been changed.
        await updateUserInfo(
          token._id,
          req.body.username,
          {
            day: req.body.birthDay,
            month: req.body.birthMonth,
            year: req.body.birthYear,
          },
          req.body.location,
          req.body.firstName,
          req.body.lastName,
          req.body.bio,
          req.body.gender
        );
        return res.redirect("/user?message=User+updated");
      }
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

router.post("/password/update", async (req, res) => {
  try {
    const token = verifyToken(res, req);
    if (token == null) {
      res.render("user2", { isLoggedIn: false });
    } else {
      const user = await getLoggedInUser(token);
      //Check if current pass is correct
      const passMatch = await bcrypt.compare(
        req.body.currentPassword,
        user.password
      );

      if (passMatch) {
        //Check if confirm password is same as new password:
        if (req.body.newPassword !== req.body.confirmNewPassword) {
          res.redirect("/user?warning=Passwords+did+not+match");
        } else {
          //Hashing new password, and updating the user in the database
          const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
          await db.collection("users").updateOne(
            { _id: new ObjectId(token._id) },
            {
              $set: {
                password: hashedPassword,
              },
            }
          );
          res.redirect("/user?message=Password+updated");
        }
      } else {
        res.redirect("/user?warning=Wrong+password");
      }
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

router.delete("/delete", async (req, res) => {
  try {
    const token = verifyToken(res, req);
    if (token == null) {
      res.render("user2", { isLoggedIn: false, hasTypeWrong: false });
    } else {
      const user = await getLoggedInUser(token);
      // Remove user from participating events.
      await db.collection("events").updateMany(
        { _id: { $in: user.eventIds } },
        {
          $pull: {
            participantIds: user._id,
          },
        }
      );

      // Remove user from groups.
      await db.collection("groups").updateMany(
        { _id: { $in: user.groupIds } },
        {
          $pull: { userIds: user._id },
        }
      );

      // Delete user from db.
      await db.collection("users").deleteOne({ _id: user._id });
      res.clearCookie("token");
      res.status(200).send("user deleted");
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

//
//
//
//
//
//
//
//
//
//
//
//
// Routes for events
router.get("/events", async (req, res) => {
  try {
    const token = verifyToken(res, req);

    if (token == null) {
      res.render("userEvents", { isLoggedIn: false });
    } else {
      let user = await getLoggedInUser(token);
      let events = await getUserEvents(token._id);
      let userGroups = await getUserGroups(token._id);
      let notParticipatingEvents = await getUserNotParticiaingEvents(token._id);

         
      res.render("userEvents", {
        isLoggedIn: true,
        events,
        user,
        userGroups,
        notParticipatingEvents,
      });
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

//
//
//
//
//
//
//
//
//
//
//
// Routes for interests
router.get("/interests", async (req, res) => {
  try {
    const token = verifyToken(res, req);

    if (token == null) {
      res.render("interests", { isLoggedIn: false });
    } else {
      const interests = await getInterests();
      const user = await getLoggedInUser(token);
      const userGroups = await getUserGroups(token._id);

      // Creates a list of all the interests, of which groups, that user is member of, is related to.
      //TODO FIX this, så det er mere nydeligt, og så man også kan fravælge interests i den højre box.
      let groupInterestsSet = new Set();
      userGroups.forEach((group) => {
        groupInterestsSet.add(group.interest);
      });
      const groupInterests = Array.from(groupInterestsSet);

      // count amount of groups per interests
      const groupCountPerInterest = {};
      for (let interest of interests) {
        let count = await db.collection("groups").countDocuments({
          userIds: user._id,
          interest: interest.hobby,
        });
        groupCountPerInterest[interest.hobby] = count;
      }
      res.render("interests", {
        isLoggedIn: true,
        interests,
        groupInterests,
        groupCountPerInterest,
        user,
      });
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

// TODO Should be a put request, and has to be sent in js clientside.
router.post("/interests", async (req, res) => {
  try {
    const token = verifyToken(res, req);
    const selectedInterests = Object.values(req.body);

    if (token != null) {
      await setUserInterests(token._id, selectedInterests);

      res.redirect("/");
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

//
//
//
//
//
//
//
//
//
//
//
// Routes for groups

router.get("/groups", async (req, res) => {
  try {
    const token = verifyToken(res, req);

    if (token == null) {
      res.render("groups", { isLoggedIn: false });
    } else {
      const user = await getLoggedInUser(token);
      const groups = await getUserGroups(token._id);

      res.render("groups", { isLoggedIn: true, groups, user });
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

router.get("/groups/:groupId", async (req, res) => {
  try {
    const token = verifyToken(res, req);

    if (token == null) {
      res.render("group", { isLoggedIn: false });
    } else {
      const user = await getLoggedInUser(token);
      const group = await getGroup(req.params.groupId);
      const groupUsers = await getGroupUsers(req.params.groupId);

      //Checks if user is member of group
      if (await isUserInGroup(token._id, req.params.groupId)) {
        res.render("group", {
          isLoggedIn: true,
          groupUsers,
          group,
          user,
        });
      } else {
        res.render("errorPage", {
          errorMessage: "Access denied",
          isLoggedIn: true,
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});
// Todo, should be a post request to "/.../addMessage"
router.post("/groups/:groupId", async (req, res) => {
  try {
    const token = verifyToken(res, req);

    if (token == null) {
      res.render("group", { isLoggedIn: false });
    } else {
      await addMessageToGroup(
        {
          messageText: req.body.messageText,
          authorName: req.body.authorName,
          authorId:
            req.body.authorId !== null ? new ObjectId(req.body.authorId) : null,
          createdAt: {
            year: req.body.createdAt.year,
            month: req.body.createdAt.month,
            day: req.body.createdAt.day,
            hour: req.body.createdAt.hour,
            minute: req.body.createdAt.minute,
          },
          isCustom: req.body.isCustom,
        },
        req.params.groupId
      );
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

//TODO should be a put request
router.post("/groups/:groupId/leave", async (req, res) => {
  try {
    const token = verifyToken(res, req);
    const group = await getGroup(req.params.groupId);

    if (token == null) {
      res.render("groupEvents", { isLoggedIn: false });
    } else {
      //TODO Rodet
      //Finds all events in the group, that the user is participating in.
      const userGroupEvents = await db
        .collection("events")
        .find({
          groupId: new ObjectId(req.params.groupId),
          participantIds: new ObjectId(token._id),
        })
        .toArray();
      const userGroupEventIds = userGroupEvents.map((event) => event._id);

      // removes all eventId from user, og which he was participating in, in that group.
      await db.collection("users").updateOne(
        { _id: new ObjectId(token._id) },
        {
          $pull: {
            eventIds: {
              $in: userGroupEventIds,
            },
          },
        }
      );

      // removes userId from all events in the group.
      await db.collection("events").updateMany(
        { _id: { $in: userGroupEventIds } },
        {
          $pull: {
            participantIds: {
              $in: [new ObjectId(token._id)],
            },
          },
        }
      );

      await removeUserFromGroup(token._id, req.params.groupId);
      await removeGroupFromUser(req.params.groupId, token._id);

      // Checks to delete empty groups:
      if (group.userIds.length - 1 == 0) {
        // If user leaved a group with only him in - We delete that group so that there is only one group which is empty
        //Check for amounts of empty group just to be safe.
        if (
          (await emptyGroupsInterestAndRequirementsAmount(
            group.interest,
            group.requirements
          )) > 1
        ) {
          await deleteAllButOneEmptyGroup(
            group.interest,
            group.requirements,
            group.location
          );
        }
      }

      res.redirect("/");
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

//
//
//
//
//
//
//
//
//
// routes for group events
router.get("/groups/:groupId/events", async (req, res) => {
  try {
    const token = verifyToken(res, req);

    if (token == null) {
      res.render("groupEvents", { isLoggedIn: false });
    } else {
      const user = await getLoggedInUser(token);

      // Checks if user is member of group related to events.
      if (!(await isUserInGroup(token._id, req.params.groupId))) {
        res.render("errorPage", {
          errorMessage: "You are not a member of this group",
        });
        return;
      }

      const group = await getGroup(req.params.groupId);
      const groupEvents = await getGroupEvents(req.params.groupId);
      const groupSuggestedEvents = await getGroupSuggestedEvents(
        req.params.groupId
      );

      res.render("groupEvents", {
        isLoggedIn: true,
        group,
        groupEvents,
        groupSuggestedEvents,
        user,
      });
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

router.post("/groups/:groupId/events/create", async (req, res) => {
  try {
    const token = verifyToken(res, req);
    let groupId;

    const dateListed = req.body.startDate.split("-");
    const timeListed = req.body.startTime.split(":");

    if (token != null) {
      //Checks if event is created from inside group, or from user event page.
      if (req.params.groupId !== "undefined") {
        groupId = new ObjectId(req.params.groupId);
      } else {
        groupId = new ObjectId(req.body.groupId);
      }

      let createdEvent = {
        eventName: req.body.eventName,
        date: {
          year: parseInt(dateListed[0]),
          month: parseInt(dateListed[1]),
          day: parseInt(dateListed[2]),
          hour: parseInt(timeListed[0]),
          minute: parseInt(timeListed[1]),
        },
        description: req.body.description,
        location: { name: req.body.cityName, address: req.body.adressName },
        groupId: groupId,
        participantIds: [],
        isSuggested: false,
        userIdsVotedDelete: [],
      };

      let insertedEventRes = await db
        .collection("events")
        .insertOne(createdEvent);

      //Add event to group

      await db
        .collection("groups")
        .updateOne(
          { _id: groupId },
          { $push: { eventIds: insertedEventRes.insertedId } }
        );
      if (req.params.groupId !== "undefined") {
        res.redirect(
          `/user/groups/${req.params.groupId}/events/${insertedEventRes.insertedId}`
        );
      } else {
        res.redirect(
          `/user/groups/${req.body.groupId}/events/${insertedEventRes.insertedId}`
        );
      }
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

router.get("/groups/:groupId/events/:eventId", async (req, res) => {
  try {
    const token = verifyToken(res, req);

    if (token == null) {
      res.render("eventPage", { isLoggedIn: false });
    } else {
      const user = await getLoggedInUser(token);

      // Checks if user is member of group related to event.
      if (!isUserInGroup(token._id, req.params.groupId)) {
        res.render("errorPage", {
          errorMessage: "You are not a member of this group",
        });
        return;
      }
      const group = await getGroup(req.params.groupId);
      const event = await getEvent(req.params.eventId);
      const eventParticipants = await getEventParticipants(req.params.eventId);
      const usersRequiredToDelete = Math.ceil(group.userIds.length / 2);
      const isUserParticipating = await isUserInEvent(
        token._id,
        req.params.eventId
      );
      const isUserVoted = await isUserVotedToDelete(
        token._id,
        req.params.eventId
      );

      res.render("eventPage", {
        isLoggedIn: true,
        event,
        eventParticipants,
        user,
        group,
        isUserParticipating,
        isUserVoted,
        usersRequiredToDelete,
      });
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

// TODO Should be a put request
router.post("/groups/:groupId/events/:eventId/join", async (req, res) => {
  try {
    const token = verifyToken(res, req);
    if (token != null) {
      await addUserToEvent(token._id, req.params.eventId);
      await addEventToUser(req.params.eventId, token._id);

      res.redirect(
        `/user/groups/${req.params.groupId}/events/${req.params.eventId}`
      );
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

// TODO Should be a put request
router.post("/groups/:groupId/events/:eventId/delete", async (req, res) => {
  try {
    const token = verifyToken(res, req);
    if (token != null) {
      const group = await getGroup(req.params.groupId);
      const event = await getEvent(req.params.eventId);

      //If user was already voting to delete, we remove her vote.
      if (req.body.isUserVoted) {
        await db.collection("events").updateOne(
          {
            _id: new ObjectId(req.params.eventId),
          },
          { $pull: { userIdsVotedDelete: new ObjectId(token._id) } }
        );
      } else {
        //If user was not already voting to delete, it means user wants to delete, therefor user is added to list of voters.
        await db.collection("events").updateOne(
          {
            _id: new ObjectId(req.params.eventId),
          },
          { $push: { userIdsVotedDelete: new ObjectId(token._id) } }
        );

        //Here it checks if there are enough voters to delete the event (half the members, or more.)
        if (
          event.userIdsVotedDelete.length + 1 >=
          Math.ceil(group.userIds.length / 2)
        ) {
          //First, it removes the eventids from the users who were participating.

          await db.collection("users").updateMany(
            { _id: { $in: event.participantIds } },
            {
              $pull: { eventIds: new ObjectId(req.params.eventId) },
            }
          );

          //Then it removes the eventid from the group's eventIds list.
          if (event.isSuggested) {
            await db.collection("groups").updateOne(
              { _id: new ObjectId(req.params.groupId) },
              {
                $pull: {
                  suggestedEventIds: new ObjectId(req.params.eventId),
                },
              }
            );
          } else {
            await db
              .collection("groups")
              .updateOne(
                { _id: new ObjectId(req.params.groupId) },
                { $pull: { eventIds: new ObjectId(req.params.eventId) } }
              );
          }

          //Then it removes the event from the database.
          await db.collection("events").deleteOne({
            _id: new ObjectId(req.params.eventId),
          });

          return res.redirect(`/user/groups/${req.params.groupId}/events`);
        }
      }

      res.redirect(
        `/user/groups/${req.params.groupId}/events/${req.params.eventId}`
      );
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});

// TODO Should be a put request
router.post("/groups/:groupId/events/:eventId/leave", async (req, res) => {
  try {
    const token = verifyToken(res, req);
    if (token != null) {
      await removeUserFromEvent(token._id, req.params.eventId);
      await removeEventFromUser(req.params.eventId, token._id);

      res.redirect(
        `/user/groups/${req.params.groupId}/events/${req.params.eventId}`
      );
    }
  } catch (error) {
    console.log(error);
    res.render("errorPage", { errorMessage: error });
  }
});
module.exports = router;
