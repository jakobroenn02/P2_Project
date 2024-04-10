const { ObjectId } = require("mongodb");
const { connectToDb, getDb } = require("../db");

let db;
connectToDb((err) => {
  if (!err) {
    db = getDb();
  }
});

// Common usecases of db interaction made easier.

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
//Group functionality
async function getGroup(groupId) {
  //Returns a group from id
  return await db.collection("groups").findOne({ _id: new ObjectId(groupId) });
}
async function addUserToGroup(userId, groupId) {
  //Takes user and group, and adds the user to groupIds
  await db.collection("groups").updateOne(
    { _id: new ObjectId(groupId) },
    {
      $push: {
        userIds: new ObjectId(userId),
      },
    }
  );
}
async function addGroupToUser(groupId, userId) {
  //Takes group and user, and ands group to user
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $push: {
        groupIds: new ObjectId(groupId),
      },
    }
  );
}
async function getUserGroups(userId) {
  //Takes a user, and return a list of all the groups he is member of
  const user = await getUser(userId);

  return await db
    .collection("groups")
    .find({
      _id: {
        $in: user.groupIds,
      },
    })
    .toArray();
}
async function getUserUnattendedGroups(userId) {
  //Takes a user, and returns a list of all the groups the user is not a member of.
  const user = await getUser(userId);
  return await db
    .collection("groups")
    .find({
      _id: {
        $nin: user.groupIds,
      },
    })
    .toArray();
}
function getCommonGroups() {
  //Should take user1 and user2, and return their common groups
}
async function getGroupUsers(groupId) {
  // returns the list of users from a group
  const group = await getGroup(groupId);

  return await db
    .collection("users")
    .find({ _id: { $in: group.userIds } })
    .toArray();
}
async function isUserInGroup(userId, groupId) {
  //Takes a user and a group, and return true or false wether user is in group or not
  const group = await getGroup(groupId);
  for (let i = 0; i < group.userIds.length; i++) {
    if (group.userIds[i].toString() == userId) {
      return true;
    }
  }
  return false;
}
async function removeUserFromGroup(userId, groupId) {
  //Takes user and group, and removes user from userIDs in group
  await db.collection("groups").updateOne(
    { _id: new ObjectId(groupId) },
    {
      $pull: {
        userIds: {
          $in: [new ObjectId(userId)],
        },
      },
    }
  );
}
async function removeGroupFromUser(groupId, userId) {
  // Takes group and user, and removes group from groupIds in user
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $pull: {
        groupIds: {
          $in: [new ObjectId(groupId)],
        },
      },
    }
  );
}
async function addMessageToGroup(message, groupId) {
  //Takes a message, and a group, and add the message to the group in the database.
  await db.collection("groups").updateOne(
    { _id: new ObjectId(groupId) },
    {
      $push: {
        messages: {
          messageText: message.messageText,
          authorName: message.authorName,
          authorId: message.authorId,
          createdAt: {
            year: message.year,
            month: message.createdAt.month,
            day: message.createdAt.day,
            hour: message.createdAt.hour,
            minute: message.createdAt.minute,
          },
          isCustom: message.isCustom,
        },
      },
    }
  );
}

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
//User functionality
async function getLoggedInUser(token) {
  //Takes a token, and returns the user of which the id in the token is related to.
  return await db.collection("users").findOne({ _id: new ObjectId(token._id) });
}
async function getUser(userId) {
  //takes id, and return the user related to the id.
  return await db.collection("users").findOne({ _id: new ObjectId(userId) });
}
async function updateUserInfo(
  userId,
  username,
  age,
  location,
  firstName,
  lastName,
  bio,
  gender,
  password
) {
  // if parameter value is null, it wont change it
  const user = await getUser(userId);

  await db.collection("users").updateMany(
    { _id: new ObjectId(userId) },
    {
      $set: {
        username: username == null ? user.username : username,
        age: age == null ? user.age : age,
        location: location == null ? user.location : location,
        gender: gender == null ? user.gender : gender,
        "name.firstName": firstName == null ? user.name.firstName : firstName,
        "name.lastName": lastName == null ? user.name.lastName : lastName,
        bio: bio == null ? user.bio : bio,
        password: password == null ? user.password : password,
      },
    }
  );
}
async function isUsernameTaken(username) {
  //return true if username is taken, else false.
  return (await db.collection("users").findOne({ username: username }))
    ? true
    : false;
}

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
//Event functionality
async function getUserEvents(userId) {
  //Takes a user, and returns a list of its events
  const user = await getUser(userId);

  return await db
    .collection("events")
    .find({
      _id: {
        $in: user.eventIds,
      },
    })
    .toArray();
}
async function getGroupEvents(groupId) {
  //Takes a group, and returns the list of events related to that group
  const group = await getGroup(groupId);

  return await db
    .collection("events")
    .find({ _id: { $in: group.eventIds } })
    .toArray();
}
async function getGroupSuggestedEvents(groupId) {
  //Returns a list of the suggested events related to the group.
  const group = await getGroup(groupId);

  return await db
    .collection("events")
    .find({ _id: { $in: group.suggestedEventIds } })
    .toArray();
}
function getCommonEvents() {
  //Should take user1 and user2 and return the events they have in common
}
async function getEvent(eventId) {
  //Takes event id and return event related to id
  return await db.collection("events").findOne({ _id: new ObjectId(eventId) });
}
async function getEventParticipants(eventId) {
  //Takes eventId, and return participants of event.
  const event = await getEvent(eventId);

  return await db
    .collection("users")
    .find({
      _id: { $in: event.participantIds },
    })
    .toArray();
}
async function removeUserFromEvent(userId, eventId) {
  //Removes user from event, takes id of both user and event
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $pull: {
        eventIds: new ObjectId(eventId),
      },
    }
  );
}
async function removeEventFromUser(eventId, userId) {
  // Removes event from user, takes id of both user and event.
  await db.collection("events").updateOne(
    { _id: new ObjectId(eventId) },
    {
      $pull: {
        participantIds: new ObjectId(userId),
      },
    }
  );
}
async function isUserInEvent(userId, eventId) {
  //Returns true or false, wether user is in event or not.
  const eventParticipants = await getEventParticipants(eventId);
  const user = await getUser(userId);

  return eventParticipants.filter(
    (participant) => participant.username == user.username
  ).length > 0
    ? true
    : false;
}
async function addUserToEvent(userId, eventId) {
  //Adds user to event in participantids
  await db.collection("events").updateOne(
    { _id: new ObjectId(eventId) },
    {
      $push: {
        participantIds: new ObjectId(userId),
      },
    }
  );
}
async function addEventToUser(eventId, userId) {
  //Adds event to user in eventIds
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $push: {
        eventIds: new ObjectId(eventId),
      },
    }
  );
}

async function isUserVotedToDelete(userId, eventId) {
  //Takes a user and a group, and return true or false whether user is in group or not
  const event = await getEvent(eventId);
  for (let i = 0; i < event.userIdsVotedDelete.length; i++) {
    if (event.userIdsVotedDelete[i].toString() == userId) {
      return true;
    }
  }
  return false;
}

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
//Location functionality
async function getLocations() {
  //Returns a list of all locations
  return await db.collection("locations").find().toArray();
}

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
//Interest functionality
async function setUserInterests(userId, interests) {
  //Sets the interest of a user to  a list of interests.
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        interests: interests,
      },
    }
  );
}
async function getInterests() {
  //Returns a list of all interests.
  return await db.collection("interests").find().toArray();
}

module.exports = {
  getUserEvents,
  getLoggedInUser,
  getUserGroups,
  getUserUnattendedGroups,
  getGroup,
  isUserInGroup,
  getGroupUsers,
  getGroupEvents,
  addGroupToUser,
  addUserToGroup,
  getLocations,
  isUsernameTaken,
  updateUserInfo,
  addMessageToGroup,
  removeGroupFromUser,
  removeUserFromGroup,
  getGroupSuggestedEvents,
  getInterests,
  setUserInterests,
  getEventParticipants,
  getEvent,
  isUserInEvent,
  addEventToUser,
  addUserToEvent,
  removeUserFromEvent,
  removeEventFromUser,
  isUserVotedToDelete,
};
