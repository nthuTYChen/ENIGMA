import { Accounts } from 'meteor/accounts-base';
import { Email } from 'meteor/email';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

import './collections.js';
import './security.js';
import './dbProcesses.js';

import ExpFunc from './experiment.js';
import UserFunc from './user.js';

Meteor.startup(async () => {
  await loadTranslation();
  await loadAllLangList();
  await loadDemoExp();
});

Meteor.methods({
  // The single function window that avoids server connection abuse
  async funcEntryWindow (cat, name, data) {
    let results, userData = await Meteor.users.findOneAsync({_id: this.userId});
    let userCheck = {verified: false, owner: false, coordinator: false, userCat: userData && userData.profile && userData.profile.userCat};
    let exp = await experimentDB.findOneAsync({_id: data.expId, $or: [{user: this.userId}, {coordinators: userData && userData.username}]});
    if(userData && userData.emails[0].verified) {
      userCheck.verified = true;
    }
    if(exp && userData && userData._id === this.userId) {
      userCheck.owner = true;
    }
    if(exp && userData && exp.coordinators.includes(userData.username)) {
      userCheck.coordinator = true;
    }
    data.clientIP = this.connection && this.connection.clientAddress;

    if(cat === 'user') {
      results = await UserFunc[name](data);
    }
    else if(cat === 'exp') {
      results = await ExpFunc[name](data, userCheck);
    }
    if(!results) {
      throw new Meteor.Error('vitale');
    }
    if(results.type === 'error' && name === 'activateCheck') {
      throw new Meteor.Error(results.errMsg);
    }
    else if(results.type === 'error') {
      throw new Meteor.Error(results.errMsg[0]);
    }
    else {
      return results;
    }
  }
});

async function loadTranslation() {
  await translationDB.removeAsync({});
  await languageFactsDB.removeAsync({});
  let langList = ['zh-tw', 'en-us'];
  let numLang = langList.length;
  for(let i=0 ; i < numLang ; i++) {
    let langName = langList[i];
    //General translations
    await translationDB.insertAsync({docType: 'general', lang: langName});
    await translationDB.insertAsync({docType: 'experimenter', lang: langName});
    await translationDB.insertAsync({docType: 'challenger', lang: langName});
    await translationDB.insertAsync({docType: 'experiment', lang: langName});
    let scriptName = 'general_'+langName+'.txt';
    let texts = await Assets.getTextAsync('translations/'+scriptName);
    texts = texts.trim();
    let rows = texts.split('\r\n');
    let numRow = rows.length;
    let update = {$set: {}};
    for(let j=0 ; j < numRow ; j++) {
      let colAndText = rows[j].split('#');
      update.$set[colAndText[0]] = colAndText[1];
    }
    await translationDB.updateAsync({docType: 'general', lang: langName}, update);
    //Experimenter translations
    scriptName = 'experimenter_'+langName+'.txt';
    texts = await Assets.getTextAsync('translations/'+scriptName);
    texts = texts.trim();
    rows = texts.split('\r\n');
    numRow = rows.length;
    update = {$set: {}};
    for(let j=0 ; j < numRow ; j++) {
      let colAndText = rows[j].split('#');
      update.$set[colAndText[0]] = colAndText[1];
    }
    await translationDB.updateAsync({docType: 'experimenter', lang: langName}, update);
    //Challenger translations
    scriptName = 'challenger_'+langName+'.txt';
    texts = await Assets.getTextAsync('translations/'+scriptName);
    texts = texts.trim();
    rows = texts.split('\r\n');
    numRow = rows.length;
    update = {$set: {}};
    for(let j=0 ; j < numRow ; j++) {
      let colAndText = rows[j].split('#');
      update.$set[colAndText[0]] = colAndText[1];
    }
    await translationDB.updateAsync({docType: 'challenger', lang: langName}, update);
    //Experiment translations
    scriptName = 'experiment_'+langName+'.txt';
    texts = await Assets.getTextAsync('translations/'+scriptName);
    texts = texts.trim();
    rows = texts.split('\r\n');
    numRow = rows.length;
    update = {$set: {}};
    for(let j=0 ; j < numRow ; j++) {
      let colAndText = rows[j].split('#');
      update.$set[colAndText[0]] = colAndText[1];
    }
    await translationDB.updateAsync({docType: 'experiment', lang: langName}, update);
    //Language Facts
    scriptName = 'languageFacts_'+langName+'.txt';
    texts = await Assets.getTextAsync('translations/'+scriptName);
    texts = texts.trim();
    rows = texts.split('\r\n');
    numRow = rows.length;
    for(let j=0 ; j < numRow ; j++) {
      await languageFactsDB.insertAsync({lang: langName, fact: rows[j]});
    }
  }
};

async function loadAllLangList() {
  await allLangList.removeAsync({});
  let langlist = await Assets.getTextAsync('others/langList.txt');
  let langListRows = langlist.split('\r\n');
  let headers = langListRows[0].split('\t');
  let nrows = langListRows.length-1; // Exclude Header
  // Skip the language code column
  for(let i=1 ; i < headers.length ; i++) {
    let langName = headers[i];
    for(let j=1 ; j < nrows ; j++) {
      let columns = langListRows[j].split('\t');
      await allLangList.insertAsync({lang: langName, code: columns[0], name: columns[i]});
    }
  }
};

async function loadDemoExp () {
  await experimentDB.removeAsync({'basicInfo.title': 'Demo Exp'});
  let newDemoExp = await Assets.getTextAsync('others/demoExp.json');
  newDemoExp = JSON.parse(newDemoExp);
  newDemoExp.createdAt = new Date();
  await experimentDB.insertAsync(newDemoExp);
};