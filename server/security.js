import { Accounts } from 'meteor/accounts-base';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { Meteor } from 'meteor/meteor';

import './collections.js';

Meteor.startup(()=>{
  //Override default rate-limiting rules for accounts methods
  Accounts.removeDefaultRateLimit();
});

Meteor.users.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

interfaceLang.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

allLangList.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

challengerDB.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

experimenterDB.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

experimentDB.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

expResultsDB.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

expStatsDB.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

activityLogDB.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

translationDB.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

languageFactsDB.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

wmStatsDB.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

siteStatsDB.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

deletedUserRepo.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

adminLogDB.deny({
  insert() {return true},
  update() {return true},
  remove() {return true},
});

// Setting up constrains on client-server communication
const funcEntryLimit = {
	type: 'method',
	name: 'funcEntryWindow'
};

const loginLimit = {
  type: 'method',
  name: 'login'
};

/*const ENIGMALoginLimit = {
  type: 'method',
  name: 'ENIGMALogin'
};*/

const createUserLimit = {
  type: 'method',
  name: 'createUser'
};

const resetPWLimit = {
  type: 'method',
  name: 'resetPassword'
};

const forgotPWLimit = {
  type: 'method',
  name: 'forgotPassword'
};

const interfaceLangLimit = {
	type: 'subscription',
	name: 'interfaceLang'
};

const allLangListLimit = {
  type: 'subscription',
  name: 'allLangList'
};

const challengerDBLimit = {
	type: 'subscription',
	name: 'challengerDB'
};

const experimenterDBLimit = {
	type: 'subscription',
	name: 'experimenterDB'
};

const experimentDBLimit = {
  type: 'subscription',
  name: 'experimentDB'
};

const expResultsDBLimit = {
  type: 'subscription',
  name: 'expResultsDB'
};

const expStatsDBLimit = {
  type: 'subscription',
  name: 'expStatsDB'
};

const activityLogDBLimit = {
  type: 'subscription',
  name: 'activityLogDB'
};

const translationDBLimit = {
  type: 'subscription',
  name: 'translationDB'
};

const languageFactsDBLimit = {
  type: 'subscription',
  name: 'languageFactsDB'
};

const wmStatsDBLimit = {
  type: 'subscription',
  name: 'wmStatsDB'
};

const siteStatsDBLimit = {
  type: 'subscription',
  name: 'siteStatsDB'
};

DDPRateLimiter.addRule(funcEntryLimit, 3, 1000);
DDPRateLimiter.addRule(loginLimit, 2, 5000);
//DDPRateLimiter.addRule(ENIGMALoginLimit, 2, 5000);
DDPRateLimiter.addRule(createUserLimit, 1, 5000);
DDPRateLimiter.addRule(resetPWLimit, 2, 5000);
DDPRateLimiter.addRule(forgotPWLimit, 1, 5000);
DDPRateLimiter.addRule(interfaceLangLimit, 1, 10000);
DDPRateLimiter.addRule(allLangListLimit, 3, 1000);
DDPRateLimiter.addRule(challengerDBLimit, 1, 10000);
DDPRateLimiter.addRule(experimenterDBLimit, 1, 10000);
DDPRateLimiter.addRule(experimentDBLimit, 3, 1000);
DDPRateLimiter.addRule(activityLogDBLimit, 3, 1000);
DDPRateLimiter.addRule(expResultsDBLimit, 3, 1000);
DDPRateLimiter.addRule(expStatsDBLimit, 3, 1000);
DDPRateLimiter.addRule(translationDBLimit, 3, 1000);
DDPRateLimiter.addRule(languageFactsDBLimit, 3, 1000);
DDPRateLimiter.addRule(wmStatsDBLimit, 3, 1000);
DDPRateLimiter.addRule(siteStatsDBLimit, 1, 1000);
DDPRateLimiter.setErrorMessage('toofaste');