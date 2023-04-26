import { Accounts } from 'meteor/accounts-base';
import { Email } from 'meteor/email';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

import './collections.js';
import './security.js';
import './dbProcesses.js';

import ExpFunc from './experiment.js';
import UserFunc from './user.js';

Meteor.startup(() => {
  // Uncomment the next line when you need to add a default admin user 
  //addAdmin();
  loadTranslation();
  loadAllLangList();
  loadDemoExp();
});

Meteor.methods({
	// The single function window that avoids server connection abuse
	'funcEntryWindow' (cat, name, data) {
    let results, userData = Meteor.user();
    let userCheck = {verified: false, owner: false, coordinator: false, userCat: userData && userData.profile.userCat};
    let exp = experimentDB.findOne({_id: data.expId, $or: [{user: Meteor.userId()}, {coordinators: userData && userData.username}]});
    if(userData && userData.emails[0].verified) {
      userCheck.verified = true;
    }
    if(exp && userData && userData._id === Meteor.userId()) {
      userCheck.owner = true;
    }
    if(exp && userData && exp.coordinators.includes(userData.username)) {
      userCheck.coordinator = true;
    }
    data.clientIP = this.connection.clientAddress;

    if(cat === 'user') {
      results = UserFunc[name](data);
    }
    else if(cat === 'exp') {
      results = ExpFunc[name](data, userCheck);
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

// Add a admin for your own ENIGMA application
function addAdmin() {
  if(Meteor.users.find({'profile.userCat': 'admin'}).fetch().length === 0) {
    Accounts.createUser({
      username: 'admin@enigma.org',
      email: 'admin@enigma.org',
      password: '11111111',
      profile: {userCat: 'admin', lang: 'en-us'}
    });
    Meteor.users.update({username: 'admin@enigma.org'}, {$set: {'emails.0.verified': true}});
  }
};

function loadTranslation() {
  translationDB.remove({});
  languageFactsDB.remove({});
  let langList = ['zh-tw', 'en-us'];
  let numLang = langList.length;
  for(i=0 ; i < numLang ; i++) {
    let langName = langList[i];
    //General translations
    translationDB.insert({docType: 'general', lang: langName});
    translationDB.insert({docType: 'experimenter', lang: langName});
    translationDB.insert({docType: 'challenger', lang: langName})
    translationDB.insert({docType: 'experiment', lang: langName})
    let scriptName = 'general_'+langName+'.txt';
    let texts = Assets.getText('translations/'+scriptName).trim();
    let rows = texts.split('\r\n');
    let numRow = rows.length;
    let update = {$set: {}};
    for(j=0 ; j < numRow ; j++) {
      let colAndText = rows[j].split('#');
      update.$set[colAndText[0]] = colAndText[1];
    }
    translationDB.update({docType: 'general', lang: langName}, update);
    //Experimenter translations
    scriptName = 'experimenter_'+langName+'.txt';
    texts = Assets.getText('translations/'+scriptName).trim();
    rows = texts.split('\r\n');
    numRow = rows.length;
    update = {$set: {}};
    for(j=0 ; j < numRow ; j++) {
      let colAndText = rows[j].split('#');
      update.$set[colAndText[0]] = colAndText[1];
    }
    translationDB.update({docType: 'experimenter', lang: langName}, update);
    //Challenger translations
    scriptName = 'challenger_'+langName+'.txt';
    texts = Assets.getText('translations/'+scriptName).trim();
    rows = texts.split('\r\n');
    numRow = rows.length;
    update = {$set: {}};
    for(j=0 ; j < numRow ; j++) {
      let colAndText = rows[j].split('#');
      update.$set[colAndText[0]] = colAndText[1];
    }
    translationDB.update({docType: 'challenger', lang: langName}, update);
    //Experiment translations
    scriptName = 'experiment_'+langName+'.txt';
    texts = Assets.getText('translations/'+scriptName).trim();
    rows = texts.split('\r\n');
    numRow = rows.length;
    update = {$set: {}};
    for(j=0 ; j < numRow ; j++) {
      let colAndText = rows[j].split('#');
      update.$set[colAndText[0]] = colAndText[1];
    }
    translationDB.update({docType: 'experiment', lang: langName}, update);
    //Language Facts
    scriptName = 'languageFacts_'+langName+'.txt';
    texts = Assets.getText('translations/'+scriptName).trim();
    rows = texts.split('\r\n');
    numRow = rows.length;
    for(j=0 ; j < numRow ; j++) {
      languageFactsDB.insert({lang: langName, fact: rows[j]});
    }
  }
};

function loadAllLangList() {
  allLangList.remove({});
  let langlist = Assets.getText('others/langList.txt');
  let langListRows = langlist.split('\r\n');
  let headers = langListRows[0].split('\t');
  let nrows = langListRows.length-1; // Exclude Header
  // Skip the language code column
  for(let i=1 ; i < headers.length ; i++) {
    let langName = headers[i];
    for(let j=1 ; j < nrows ; j++) {
      let columns = langListRows[j].split('\t');
      allLangList.insert({lang: langName, code: columns[0], name: columns[i]});
    }
  }
};

function loadDemoExp () {
  experimentDB.remove({'basicInfo.title': 'Demo Exp'});
  let newDemoExp = Assets.getText('others/demoExp.json');
  newDemoExp = JSON.parse(newDemoExp);
  newDemoExp.createdAt = new Date();
  experimentDB.insert(newDemoExp);
};