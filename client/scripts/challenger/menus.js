import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

import Styling from '../styling/stylingFuncs.js';
import Tools from '../lib/commonTools.js';

let interfaceL = new ReactiveVar(null), chaTexts = new ReactiveVar(null);

Tracker.autorun(()=>{
	chaTexts.set(translationDB.findOne({docType: 'challenger'}));
	interfaceL.set(translationDB.findOne({docType: 'general'}));
});

Template.challengerMenu.helpers({
	chaTranslation (col) {
		return chaTexts.get() && chaTexts.get()[col];
	},
	genTranslation (col) {
		return interfaceL.get() && interfaceL.get()[col];
	},
	hasNewAchieve () {
		let user = Meteor.user();
		return user && user.profile.gaming.newAchieve > 0;
	},
	newAchieveNum () {
		let user = Meteor.user();
		return user && user.profile.gaming.newAchieve;
	},
	verified () {
		let user = Meteor.user();
		return user && user.emails[0].verified;
	}
});

Template.challengerMenu.events({
	'touchend #backToHome, click #backToHome' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'dashboard'});
		}
	},
	'touchend #explore, click #explore' (event) {
		if(Tools.swipeCheck(event)) {
			if(!Meteor.user().runExpRecord) {
				FlowRouter.go('userhome', {subpage: 'explore'});
			}
			else {
				Styling.showWarning('expongoing', 'challenger');
			}
		}
	},
	'touchend #history, click #history' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'history'});
		}
	},
	'touchend #achievements, click #achievements' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'achievements'});
		}
	},
	'touchend #manageAccount, click #manageAccount' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'profile'});
		}
	},
	'touchend #aboutSite, click #aboutSite' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('about');
		}
	},
	'touchend #logout, click #logout' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			Meteor.logout();
			FlowRouter.go('home');
		}
	}
});