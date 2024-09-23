import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

import Styling from '../styling/stylingFuncs.js';
import Tools from '../lib/commonTools.js';

import '../../template/experimenter/profile.html';
import '../../template/experimenter/menus.html';

var newProfile = {
	email: '',
	password: '',
	userLang: ''
};

let expErTexts = new ReactiveVar(null), interfaceL = new ReactiveVar(null);

Tracker.autorun(()=>{
	expErTexts.set(translationDB.findOne({docType: 'experimenter'}));
	interfaceL.set(translationDB.findOne({docType: 'general'}));
});

Template.profile_exp.onRendered(()=>{
	newProfile.userLang = Session.get('userLang');
});

Template.profile_exp.helpers({
	expTranslation (col) {
		let texts = expErTexts.get();
		return texts && texts[col];
	},
	genTranslation (col) {
		return interfaceL.get() && interfaceL.get()[col];
	},
	notVerified () {
		let user = Meteor.user();
		return user && !user.emails[0].verified;
	},
	userCat () {
		let user = Meteor.user();
		if(user) {
			return interfaceL.get() && interfaceL.get()[user.profile.userCat];
		}
		return;
	},
	userLangSel (lang) {
		let user = Meteor.user();
		if(user) {
			if(user.profile.userLang === lang) {
				return 'selected';
			}
			return;
		}
		return;
	},
	username () {
		let user = Meteor.user();
		return user && user.username;
	},
	verifiedStatus () {
		let user = Meteor.user(), texts = expErTexts.get();
		if(user) {
			if(user.emails[0].verified) {
				return texts && texts['yes'];
			}
			else {
				return texts && texts['no'];
			}
		}
		return;
	}
});

Template.profile_exp.events({
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
				Meteor.callAsync('funcEntryWindow', 'user', 'changeProfile', newProfile).then((res)=>{
					if(res.username) {
						Styling.showWarning('changedandlogin');
						FlowRouter.go('registered');
					}
					else if(res.password) {
						Styling.showWarning('changedandlogin');
						FlowRouter.go('home');
					}
					else {
						Styling.showWarning('changed');
					}
				}).catch((err)=>{
					Tools.callErrorHandler(err, 'server');
				});
			}
		}
	},
	'touchend #profileResendVerify, click #profileResendVerify' (event) {
		if(Tools.swipeCheck(event)) {
			Styling.showWarning('submitting');
			let email = Meteor.user().username;
			Meteor.callAsync('funcEntryWindow', 'user', 'resendUserEmail', 
					{email: email, type: 'resendVerify'}).then(()=>{
						FlowRouter.go('registered');
					}).catch((err)=>{
						Tools.callErrorHandler(err, 'server');
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
			Meteor.callAsync('funcEntryWindow', 'user', 'getUserAgreement', 
					{userCat: Session.get('userCat'), userLang: Session.get('userLang')}).then((res)=>{
						$('#agreementContainer').html(res.agreement).show().animate({
							height: '80%',
							opacity: 0.98
						}, 500);
					}).catch((err)=>{
						Tools.callErrorHandler(err, 'server');
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

Template.exp_deleteAccount.helpers({
	expTranslation (col) {
		let texts = expErTexts.get();
		return texts && texts[col];
	},
	genTranslation (field) {
		return interfaceL.get() && interfaceL.get()[field];
	}
});

Template.exp_deleteAccount.events({
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