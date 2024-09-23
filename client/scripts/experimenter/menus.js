import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

import Tools from '../lib/commonTools.js';

let expErTexts = new ReactiveVar(null), interfaceL = new ReactiveVar(null);

Tracker.autorun(()=>{
	expErTexts.set(translationDB.findOne({docType: 'experimenter'}));
	interfaceL.set(translationDB.findOne({docType: 'general'}));
});

Template.experimenterMenu.helpers({
	expTranslation (col) {
		return expErTexts.get() && expErTexts.get()[col];
	},
	genTranslation (col) {
		return interfaceL.get() && interfaceL.get()[col];
	},
	verified () {
		let user = Meteor.user();
		return user && user.emails[0].verified;
	}
});

Template.experimenterMenu.events({
	'touchend #manageAccount, click #manageAccount' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'profile'});
		}
	},
	'touchend #manageExp, click #manageExp' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'manageExp'});
		}
	},
	'touchend #aboutSite, click #aboutSite' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('about');
		}
	},
	'touchend #backToHome, click #backToHome' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'dashboard'});
		}
	},
	'touchend #logout, click #logout' (event) {
		if(Tools.swipeCheck(event)) {
			Meteor.logout();
			FlowRouter.go('home');
		}
	}
});

Template.configExpMenu.helpers({
	expTranslation (col) {
		return expErTexts.get() && expErTexts.get()[col];
	},
	genTranslation (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.configExpMenu.events({
	'touchend #basicConfig, click #basicConfig' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('configExp', {subpage: 'basicInfo', expid: getExpId ()});
		}
	},
	'click #orientation' (event) {
		Tools.stopPropDefault(event);
		FlowRouter.go('configExp', {subpage: 'orientation', expid: getExpId ()});
	},
	'click #trainingConfig' (event) {
		Tools.stopPropDefault(event);
		FlowRouter.go('configExp', {subpage: 'trainingConfig', expid: getExpId ()});
	},
	'click #testConfig' (event) {
		Tools.stopPropDefault(event);
		FlowRouter.go('configExp', {subpage: 'testConfig', expid: getExpId ()});
	},
	'click #debriefing' (event) {
		Tools.stopPropDefault(event);
		FlowRouter.go('configExp', {subpage: 'debriefing', expid: getExpId ()});
	},
	'touchend #manageExp, click #manageExp' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'manageExp'});
		}
	},
	'touchend #backToHome, click #backToHome' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'dashboard'});
		}
	},
	'touchend #logout, click #logout' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			Meteor.logout();
			FlowRouter.go('home');
		}
	}
});

function getExpId () {
	return FlowRouter.getParam('expid');
};