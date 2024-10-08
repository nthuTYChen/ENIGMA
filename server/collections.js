import { Mongo } from 'meteor/mongo';

// Setting up server-side databases and database protection
global.allLangList = new Mongo.Collection('allLangList');
global.experimentDB = new Mongo.Collection('experimentDB');
global.expResultsDB = new Mongo.Collection('expResultsDB');
global.expStatsDB = new Mongo.Collection('expStatsDB');
global.activityLogDB = new Mongo.Collection('activityLogDB');
global.translationDB = new Mongo.Collection('translationDB');
global.languageFactsDB = new Mongo.Collection('languageFactsDB');
global.wmStatsDB = new Mongo.Collection('wmStatsDB');
global.siteStatsDB = new Mongo.Collection('siteStatsDB');
global.adminLogDB = new Mongo.Collection('adminLogDB');
global.mailLogDB = new Mongo.Collection('mailLogDB');
global.deletedUserRepo = new Mongo.Collection('deletedUserRepo');

// Old database
global.experimenterDB = new Mongo.Collection('experimenterDB');
global.interfaceLang = new Mongo.Collection('interfaceLang');
global.challengerDB = new Mongo.Collection('challengerDB');

Meteor.publish('userData', function() {
  if(this.userId) {
    return Meteor.users.find({_id: this.userId}, 
      {fields: {services: 0, 'runExpRecord.resultsTemp': 0, 'runExpRecord.trainingResults': 0, 
      'runExpRecord.consent': 0, 'runExpRecord.compensation': 0}});
  }
  this.ready();
});

Meteor.publish('allLangList', function(lang, session) {
  let targetSessions = ['register', 'challengerHome', 'runExp', 'configExp', 'runWMExp', 'manageAccount'];
  if(targetSessions.includes(session)) {
    return allLangList.find({lang: lang});
  }
  return;
});

Meteor.publish('challengerDB', async function(session, id) {
  let user = await Meteor.users.findOneAsync({_id: this.userId});
  if(id !== this.userId || session !== 'challengerHome' || (user && user.profile.userCat !== 'challenger')) {
    this.ready();
  }
  return;
});

Meteor.publish('experimentDB', async function(session, id, expId) {
  let targetSessions = ['ENIGMAHome', 'exploreChallenge', 'challengerHome', 'experimenterHome', 'manageExp', 'configExp', 'runExp', 'completeExp', 'completeExpInfo'];
  if((id !== this.userId && session !== 'ENIGMAHome') || !targetSessions.includes(session)) {
    return;
  }
  let userData = await Meteor.users.findOneAsync({_id: this.userId});
  let userCat = userData && userData.profile && userData.profile.userCat;
  let runExpRecord = userData && userData.runExpRecord;
  if(session === 'ENIGMAHome') {
    return experimentDB.find({'basicInfo.title': 'Demo Exp'}, {fields: {status: 1, basicInfo: 1, orientation: 1, training: 1, test: 1, debriefing: 1, availableLang: 1, stats: 1}});
  }
  else if(session === 'completeExpInfo') {
    return experimentDB.find({_id: expId, 'status.state': 'complete'}, {fields: {status: 1, userAccount: 1, basicInfo: 1, completedAt: 1, completeExpInfo: 1}});
  }
  else if(expId !== '' && session === 'configExp' && userCat === 'experimenter') {
    return experimentDB.find({_id: expId, $or: [{user: id}, {coordinators: userData.username}]}, {fields: {user: 0}});
  }
  else if((session === 'manageExp' || session === 'experimenterHome') && userCat === 'experimenter') {
    return experimentDB.find({$or: [{user: id}, {coordinators: userData.username}]}, {fields: {user: 0, orientation: 0, training: 0, test:0, debriefing: 0}});
  }
  else if(session === 'challengerHome' && userCat === 'challenger' && runExpRecord) {
    return experimentDB.find({_id: runExpRecord.expId}, {fields: {user: 0, coordinators: 0, description: 0, training: 0, test: 0, debriefing: 0, stats: 0}});
  }
  else if(session === 'exploreChallenge' && userCat === 'challenger') {
    let participatedData = userData.profile.exp.participated;
    let currentTime = new Date(), userDOB = userData.profile.dob;
    let participantAge = currentTime.getFullYear() - (new Date(userDOB)).getFullYear();
    if((new Date(userDOB)).getMonth() - currentTime.getMonth() > 0 || 
      ((new Date(userDOB)).getMonth() - currentTime.getMonth() === 0 &&
        (new Date(userDOB)).getDate() - currentTime.getDate() > 0
      )) {
      participantAge -= 1;
    }
    let fullyTriedExp = [], withScreeningRecord = false;;
    let screeningContent = {
      basicInfo: {
        screening: {}
      }
    };
    for(let i=0 ; i<participatedData.length ; i++) {
      if(await expStatsDB.find({userId: Meteor.userId(), expId: participatedData[i]}).fetchAsync().length > 30) {
        fullyTriedExp.push(participatedData[i]);
      }
    }
    let sideNotes = userData.profile.exp.sideNotes;
    if(sideNotes.fastCompletion.recorded) {
      screeningContent.basicInfo.screening.fastCompletion = false;
      withScreeningRecord = true;
    }
    if(sideNotes.frequentQuitter.recorded) {
      screeningContent.basicInfo.screening.frequentQuitter = false;
      withScreeningRecord = true;
    }
    if(sideNotes.daydreamer.recorded) {
      screeningContent.basicInfo.screening.daydreamer = false;
      withScreeningRecord = true;
    }
    if(userData && withScreeningRecord) {
      return experimentDB.find({$and: [{$or: [{'status.state': 'active'}, {'status.state': 'complete'}]}, {_id: {$nin: fullyTriedExp}}, 
        {$or: [{excludedExps: {$elemMatch: {id: {$nin: participatedData}}}}, {excludedExps: {$eq: []}}]},
        screeningContent, {'basicInfo.age': {$lte: participantAge}}]}, 
        {fields: {user: 0, coordinators: 0, excludedExps: 0, orientation: 0, training: 0, test: 0, debriefing: 0}},
        {sort: {createdAt: -1}});
    }
    return experimentDB.find({$and: [{$or: [{'status.state': 'active'}, {'status.state': 'complete'}]}, {_id: {$nin: fullyTriedExp}}, 
      {$or: [{excludedExps: {$elemMatch: {id: {$nin: participatedData}}}}, {excludedExps: {$eq: []}}]},
      {'basicInfo.age': {$lte: participantAge}}]}, 
      {fields: {user: 0, coordinators: 0, excludedExps: 0, orientation: 0, training: 0, test: 0, debriefing: 0}},
      {sort: {createdAt: -1}});
  }
  else if(expId !== '' && session === 'runExp') {
    let exp = await experimentDB.findOneAsync({_id: expId});
    if(exp) {
      if(userCat === 'experimenter') {
        return experimentDB.find({_id: expId});
      }
      else if(userCat === 'challenger' && (exp.status.state === 'active' || exp.status.state === 'complete')) {
        return experimentDB.find({_id: expId}, {fields: {user: 0, coordinators: 0, excludedExps: 0, completedAt: 0}});
      }
      else if(exp.basicInfo.title === 'Demo Exp') {
        return experimentDB.find({'basicInfo.title': 'Demo Exp'}, {fields: {status: 1, basicInfo: 1, orientation: 1, training: 1, test: 1, debriefing: 1, availableLang: 1, stats: 1}});
      }
    }
    return;
  }
  return;
});

Meteor.publish('expStatsDB', async function (session, id) {
  let userData = await Meteor.users.findOneAsync({_id: this.userId});
  if(!userData || userData._id !== id || !userData.emails[0].verified || 
    userData.profile.userCat !== 'challenger' || session !== 'challengeHistory') {
    return;
  }
  else {
    return expStatsDB.find({userId: userData._id});
  }
});

Meteor.publish('expResultsDB', async function (session, id, expId) {
  let userData = await Meteor.users.findOneAsync({_id: this.userId});
  let exp = await experimentDB.findOneAsync({$and: [{_id: expId}, {$or: [{user: id}, {coordinators: userData && userData.username}]}]});
  if(!userData || userData._id !== id || !userData.emails[0].verified || 
    userData.profile.userCat !== 'experimenter' || session !== 'configExp' || !exp) {
    return;
  }
  else {
    return expResultsDB.find({expId: expId}, {fields: {verifyCode: 1, endTime: 1, verified: 1, stage: 1, sessionN: 1, withdrawDate: 1}});
  }
});

Meteor.publish('activityLogDB', async function (session, id, onset) {
  let user = await Meteor.users.findOneAsync({_id: this.userId});
  if(!user || id !== user._id || session !== 'experimenterHome' || user.profile.userCat !== 'experimenter') {
    return;
  }
  return activityLogDB.find({audience: id}, {fields: {audience: 0}, sort: {date: -1}, skip: onset, limit: 10});
});

Meteor.publish('translationDB', (session, lang, userCat)=>{
  let docs = [];
  docs.push('general');
  if(userCat === 'experimenter' || session === 'completeExpInfo') {
    docs.push('experimenter');
  }
  else if(userCat === 'challenger' || session === 'expResults') {
    docs.push('challenger');
  }
  let targetSessions = ['experimenterHome', 'manageExp', 'configExp', 'runExp', 'expResults', 'runWMExp'];
  if(targetSessions.includes(session)) {
    docs.push('experiment');
  }
  return translationDB.find({docType: {$in: docs}, lang: lang});
});

Meteor.publish('wmStatsDB', async (session, id)=>{
  let userData = await Meteor.users.findOneAsync({_id: this.userId});
  if(!userData || userData._id !== id || !userData.emails[0].verified || 
    userData.profile.userCat !== 'challenger' || (session !== 'wmHistory' && session !== 'challengerHome')) {
    return;
  }
  return wmStatsDB.find({userId: id}, {fields: {researchScores: 0}}, {sort: {endTime: -1}, limit: 7});
});

Meteor.publish('siteStatsDB', async ()=>{
  let targets = [], userData = await Meteor.users.findOneAsync({_id: this.userId});
  targets.push('general');
  if(userData) {
    if(userData.profile.userCat === 'challenger') {
      targets.push('wmStats');
    }
  }
  return siteStatsDB.find({docType: {$in: targets}});
});

Meteor.publish('languageFactsDB', function (session, lang) {
  if(session === 'challengerHome' && this.userId) {
    return languageFactsDB.find({lang: lang});
  }
  return;
});