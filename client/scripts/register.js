import { Accounts } from 'meteor/accounts-base';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import Styling from './styling/stylingFuncs.js';
import Tools from './lib/commonTools.js';

import './styling/jquery.color-2.1.2.min.js';
import './menus.js';
import '../template/register.html';

var newUser = {};

let interfaceL = new ReactiveVar(null);

Tracker.autorun(()=>{
	interfaceL.set(translationDB.findOne({docType: 'general'}));
});

Template.register.onRendered(()=>{
	Session.set('browseSession', 'register');
	newUser = {
		username: '',
		email: '',
		password: '',
		profile: {
			userCat: Session.get('userCat'),
			userLang: Session.get('userLang'), 
			dob: '',
			gender: 'male',
			handedness: 'right',
			L1: Session.get('userLang'),
			L2: 'na',
			rememberMe: false
		}
	};
});

Template.register.helpers({
	langname () {
		return allLangList.find();
	},
	challengerSignUp () {
		return Session.equals('userCat', 'challenger');
	},
	dynamic_trans (col) {
		return interfaceL.get() && interfaceL.get()[Session.get(col)];
	},
	translation (col) {
		return interfaceL.get() && interfaceL.get()[col];
	},
	userLangSel (lang) {
		if(Session.equals('userLang', lang)) {
			return 'selected';
		}
		return '';
	}
});

Template.register.events({
	'change select[name=L1]' (event) {
		newUser.profile.L1 = event.target.value;
	},
	'change select[name=L2]' (event) {
		newUser.profile.L2 = event.target.value;
	},
	'change select[name=gender]' (event) {
		newUser.profile.gender = event.target.value;
	},
	'change select[name=handedness]' (event) {
		newUser.profile.handedness = event.target.value;
	},
	'change input[name=dob]' (event) {
		newUser.profile.dob = event.currentTarget.value;
	},
	'touchend #getAgreement, click #getAgreement' (event) {
		if(Tools.swipeCheck(event)) {
			Meteor.callAsync('funcEntryWindow', 'user', 'getUserAgreement', 
				{userCat: Session.get('userCat'), userLang: Session.get('userLang')}).then((res)=>{
					let agreementHeight = '';
					if($(window).width() <= 1200) {
						agreementHeight = '98vh';
					}
					else {
						agreementHeight = '80vh';
					}
					$('#agreementContainer').html(res.agreement).show().animate({
						height: agreementHeight,
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
	},
	'touchend #userSignUp, click #userSignUp' (event) {
		if(Tools.swipeCheck(event)) {
			if(!$('form')[0].checkValidity()) {
				Styling.showWarning('formvalide');
			}
			else if($('#userPW').val().length < 8) {
				Styling.showWarning('pwshorte');
			}
			else if($('#userPW').val() !== $('#userPWRetype').val()) {
				Styling.showWarning('pwinconsistente');
			}
			else {
				newUser.username = $('#userId').val();
				newUser.email = $('#userId').val();
				newUser.password = $('#userPW').val();
				Styling.showWarning('submitting');
				Accounts.createUser(newUser, (err)=>{
					if(err) {
						console.log(err);
						if(err.reason === 'Login forbidden') {
							FlowRouter.go('registered');
						}
						else if(err.error === 'too-many-requests') {
							Styling.showWarning('slowdown');
						}
						else if(err.error === 403) {
							Styling.showWarning('emailexiste');
						}
						else if(err.error === 555) {
							Styling.showWarning(err.reason);
						}
						else {
							Styling.showWarning('vitale');
						}
					}
					else {
						FlowRouter.go(urlRootPath + 'registered');
					}
				});
			}
		}
	},
	'touchend #userSignIn, click #userSignIn' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('login');
		}
	}
});

Template.register.onDestroyed(()=>{
	Session.set('browseSession', '');
});

Template.registered.helpers({
	'translation' (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.registered.events({
	'touchend #userResendVerify, click #userResendVerify' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('resendVerify');
		}
	}
});

Template.verify.onRendered(()=>{
	$('#submitVerify').click();
});

Template.verify.helpers({
	'translation' (col) {
		return interfaceL.get() && interfaceL.get()[col];
	},
	'verifyCode' () {
		return Session.get('verifyCode');
	}
});

Template.verify.events({
	'touchend #submitVerify, click #submitVerify' (event) {
		if(Tools.swipeCheck(event)) {
			Styling.showWarning('verifying');
			let verifyCode = $('#verifyCode').val();
			Accounts.verifyEmail(verifyCode, (err)=>{
				if(err) {
					if(err.error === 'too-many-requests') {
						Styling.showWarning('slowdown');
					}
					else if(err.error === 403) { //Token might have expired.
						Styling.showWarning('tokenexpired');
					}
					else {
						Styling.showWarning('verifye');
					}
				}
				else {
					Styling.showWarning('verifysuccess');
					FlowRouter.go('login');
				}
			});
		}
	}
});

Template.verify.onDestroyed(()=>{
	Session.set('verifyCode', '');
});

Template.resendVerify.helpers({
	'translation' (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.resendVerify.events({
	'touchend #submitReVerify, click #submitReVerify' (event) {
		if(Tools.swipeCheck(event)) {
			Styling.showWarning('submitting');
			let email = $('#verifyAgainEmail').val();
			if(!$('form')[0].checkValidity()) {
				Styling.showWarning('formvalide');
			}
			else {
				Meteor.callAsync('funcEntryWindow', 'user', 'resendUserEmail', 
					{email: email, type: 'resendVerify'}).then(()=>{
						FlowRouter.go('registered');
					}).catch((err)=>{
						Tools.callErrorHandler(err, 'server');
					});
			}
		}
	}
});