import Tools from '../lib/commonTools.js';

import '../../template/experimenter/dashboard.html';
import '../../template/experimenter/menus.html';
import './menus.js';

let expErTexts = new ReactiveVar(null);

Tracker.autorun(()=>{
	expErTexts.set(translationDB.findOne({docType: 'experimenter'}));
});

Template.dashboard_exp.onRendered(()=>{
	Session.set('browseSession', 'experimenterHome');
	Session.set('expId', '');
});

Template.dashboard_exp.helpers({
	allActivityLog () {
		return activityLogDB.find({}, {sort: {date: -1}});
	},
	allRunningExp () {
		return experimentDB.find({'status.state': 'active'});
	},
	fastCompletion () {
		let user = Meteor.user();
		return user && user.profile.exp.sideNotes.fastCompletion.recorded;
	},
	fastCompletionDate () {
		let user = Meteor.user();
		let date = user && user.profile.exp.sideNotes.fastCompletion.date;
		if(date) {
			return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' (date.getDate());
		}
		return;
	},
	frequentQuitter () {
		let user = Meteor.user();
		return user && user.profile.exp.sideNotes.frequentQuitter.recorded;
	},
	frequentQuitterDate () {
		let user = Meteor.user();
		let date = user && user.profile.exp.sideNotes.frequentQuitter.date;
		if(date) {
			return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' (date.getDate());
		}
		return;
	},
	lastIP () {
		let user = Meteor.user();
		return user && user.profile.loginAttemptIP.lastLogin;
	},
	progressPerc (currentN, targetN) {
		return currentN / targetN * 100;
	},
	runningExpQuota () {
		let user = Meteor.user();
		let quota = user && user.profile.exp.runningExpQuota;
		return quota;
	},
	runningExps () {
		let user = Meteor.user();
		let exps = user && user.profile.exp.runningExp;
		return exps;
	},
	translation (col) {
		let texts = expErTexts.get();
		return texts && texts[col];
	},
	username () {
		let user = Meteor.user();
		let username = user && user.username;
		if(username) {
			return username.split('@')[0];
		}
		return;
	},
	userLang () {
		return Session.get('userLang');
	}
});

Template.dashboard_exp.events({
	'touchend #logPrev10, click #logPrev10' (event) {
		if(Tools.swipeCheck(event, false, true)) {
			let currentOnset = Session.get('experimenterLogOnset');
			if(currentOnset - 10 >= 0) {
				Session.set('experimenterLogOnset', currentOnset - 10);
			}
		}
	},
	'touchend #logNext10, click #logNext10' (event) {
		if(Tools.swipeCheck(event, false, true)) {
			let currentOnset = Session.get('experimenterLogOnset');
			if(activityLogDB.find({}).fetch().length === 10) {
				Session.set('experimenterLogOnset', currentOnset + 10);
			}
		}
	}
});

Template.dashboard_exp.onDestroyed(()=>{
	Session.set('browseSession', '');
	Session.set('experimenterLogOnset', 0);
});