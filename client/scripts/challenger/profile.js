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
	userData (type) {
		let user = Meteor.user();
		if(user) {
			return interfaceL.get() && interfaceL.get()[user.profile[type]];
		}
		return;
	},
	userDob () {
		let user = Meteor.user();
		return user && user.profile.dob;
	},
	userNatLang (type) {
		let user = Meteor.user();
		if(user) {
			let lang = user.profile[type];
			let langName = allLangList.findOne({code: lang});
			return langName && langName.name;
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
		let user = Meteor.user(), texts = chaTexts.get();
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