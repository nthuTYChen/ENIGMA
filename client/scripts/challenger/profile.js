import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

import Styling from '../styling/stylingFuncs.js';
import Tools from '../lib/commonTools.js';

import '../../template/challenger/profile.html';
import '../../template/challenger/menus.html';

var newProfile = {
	email: '',
	password: '',
	userLang: ''
};

let interfaceL = new ReactiveVar(null), chaTexts = new ReactiveVar(null);

Tracker.autorun(()=>{
	chaTexts.set(translationDB.findOne({docType: 'challenger'}));
	interfaceL.set(translationDB.findOne({docType: 'general'}));
});

Template.profile_cha.onRendered(()=>{
	Session.set('browseSession', 'manageAccount');
	newProfile.userLang = Session.get('userLang');
});

Template.profile_cha.helpers({
	chaTranslation (col) {
		return chaTexts.get() && chaTexts.get()[col];
	},
	genTranslation (col) {
		return interfaceL.get() && interfaceL.get()[col];
	},
	notVerified () {
		return Meteor.user() && !Meteor.user().emails[0].verified;
	},
	userCat () {
		if(Meteor.user()) {
			return interfaceL.get() && interfaceL.get()[Meteor.user().profile.userCat];
		}
		return;
	},
	userData (type) {
		if(Meteor.user()) {
			return interfaceL.get() && interfaceL.get()[Meteor.user().profile[type]];
		}
		return;
	},
	userDob () {
		return Meteor.user() && Meteor.user().profile.dob;
	},
	userNatLang (type) {
		if(Meteor.user()) {
			let lang = Meteor.user().profile[type];
			let langName = allLangList.findOne({code: lang});
			return langName && langName.name;
		}
		return;
	},
	userLangSel (lang) {
		if(Meteor.user()) {
			if(Meteor.user().profile.userLang === lang) {
				return 'selected';
			}
			return;
		}
		return;
	},
	username () {
		return Meteor.user() && Meteor.user().username;
	},
	verifiedStatus () {
		if(Meteor.user()) {
			if(Meteor.user().emails[0].verified) {
				return chaTexts.get() && chaTexts.get()['yes'];
			}
			else {
				return chaTexts.get() && chaTexts.get()['no'];
			}
		}
		return;
	}
});

Template.profile_cha.events({
	'change select[name=userLang]' (event) {
		newProfile.userLang = event.target.value;
	},
	'touchend #profileChange, click #profileChange' (event) {
		if(Tools.swipeCheck(event)) {
			Styling.showWarning('submitting');
			let newpw = $('#userPW').val(), newpwRetype = $('#userPWRetype').val();
			if(!$('form')[0].checkValidity()) {
				Styling.showWarning('formvalide');
			}
			else if(newpw !== '' && newpw.length < 8) {
				Styling.showWarning('pwshorte');
			}
			else if(newpw !== newpwRetype) {
				Styling.showWarning('pwinconsistente');
			}
			else {
				newProfile.username = $('#userId').val();
				if(newpw !== '') {
					newProfile.password = Accounts._hashPassword(newpw);
				}
				Meteor.call('funcEntryWindow', 'user', 'changeProfile', newProfile, (err, result)=>{
					if(err) {
						Tools.callErrorHandler(err, 'server');
					}
					else {
						if(result.username) {
							Styling.showWarning('changedandlogin');
							Meteor.logout();
							import('../register.js').then(()=>{
								//Router.go(urlRootPath + 'registered');
								FlowRouter.go('registered');
							});
						}
						else if(result.password) {
							Styling.showWarning('changedandlogin');
							Meteor.logout();
							Meteor.setTimeout(()=>{
								FlowRouter.go('home');
							}, 2000);
						}
						else {
							Styling.showWarning('changed');
						}
					}
				});
			}
		}
	},
	'touchend #profileResendVerify, click #profileResendVerify' (event) {
		if(Tools.swipeCheck(event)) {
			Styling.showWarning('submitting');
			let email = Meteor.user().username;
			Meteor.call('funcEntryWindow', 'user', 'resendUserEmail', 
					{email: email, type: 'resendVerify'}, (err, result)=>{
					if(err) {
						Tools.callErrorHandler(err, 'server');
					}
					else {
						FlowRouter.go('registered');
					}
				});
		}
	},
	'touchend #deleteAccount, click #deleteAccount' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('deleteAccount');
		}
	},
	'touchend #getAgreement, click #getAgreement' (event) {
		if(Tools.swipeCheck(event)) {
			Meteor.call('funcEntryWindow', 'user', 'getUserAgreement', 
					{userCat: Session.get('userCat'), userLang: Session.get('userLang')}, (err, result)=>{
					if(err) {
						Tools.callErrorHandler(err, 'server');
					}
					else {
						$('#agreementContainer').html(result.agreement).show().animate({
							height: '80%',
							opacity: 0.98
						}, 500);
					}
				});
		}
	},
	'touchend #acceptAgreement, click #acceptAgreement' (event) {
		if(Tools.swipeCheck(event)) {
			$('#agreementContainer').html('').animate({
				height: 0,
				opacity: 0
			}, 500).hide();
		}
	}
});

Template.cha_deleteAccount.helpers({
	chaTranslation (col) {
		return chaTexts.get() && chaTexts.get()[col];
	},
	genTranslation (field) {
		return interfaceL.get() && interfaceL.get()[field];
	}
});

Template.cha_deleteAccount.events({
	'touchend #cancelDelete, click #cancelDelete' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'profile'});
		}
	},
	'touchend #confirmDelete, click #confirmDelete' (event) {
		if(Tools.swipeCheck(event)) {
			Tools.deleteAccount();	
		}
	}
});