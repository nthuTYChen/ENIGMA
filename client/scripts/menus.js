import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Template } from 'meteor/templating';
import Tools from './lib/commonTools.js';

import '../template/menus.html';

let interfaceL = new ReactiveVar(null);

Tracker.autorun(()=>{
	interfaceL.set(translationDB.findOne({docType: 'general'}));
});

Template.loginMenu.helpers({
	'translation' (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.loginMenu.events({
	'touchend #aboutSite, click #aboutSite' (event) {
		if(Tools.swipeCheck(event)) {
			//Router.go(urlRootPath + 'about');
			FlowRouter.go('about');
		}
	},
	'touchend #backToHome, click #backToHome' (event) {
		if(Tools.swipeCheck(event)) {
			//Router.go(urlRootPath + 'home');
			FlowRouter.go('home');
		}
	}
});

Template.registerMenu.helpers({
	'translation' (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.registerMenu.events({
	'touchend #aboutSite, click #aboutSite' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('about');
		}
	},
	'touchend #backToHome, click #backToHome' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('home');
		}
	}
});

Template.aboutMenu.helpers({
	'translation' (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.aboutMenu.events({
	'touchend #aboutChallenger, click #aboutChallenger' (event) {
		if(Tools.swipeCheck(event)) {
			getAbout('challenger');
		}
	},
	'touchend #aboutExperimenter, click #aboutExperimenter' (event) {
		if(Tools.swipeCheck(event)) {
			getAbout('experimenter');
		}
	},
	'touchend #logout, click #logout' (event) {
		if(Tools.swipeCheck(event)) {
			Meteor.logout();
			FlowRouter.go('home');
		}
	},
	'touchend #backToHome, click #backToHome' (event) {
		if(Tools.swipeCheck(event)) {
			if(Meteor.userId()) {
				FlowRouter.go('userhome', {subpage: 'dashboard'});
			}
			else {
				FlowRouter.go('home');
			}
		}
	}
});

function getAbout(userCat) {
	if(Session.equals('browseSession', 'completeExpInfo')) {
		FlowRouter.go('about');
	}
	Meteor.call('funcEntryWindow', 'user', 'getAbout', {userCat: userCat, 
		userLang: Session.get('userLang')}, (err, res) => {
			if(err) {
				Tools.callErrorHandler(err, 'server');
			}
			else {
				$('#aboutContent').html(res.about);
			}
		});
};