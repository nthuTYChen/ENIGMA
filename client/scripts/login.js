import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import Styling from './styling/stylingFuncs.js';
import Tools from './lib/commonTools.js';

import './styling/jquery.color-2.1.2.min.js';
import './menus.js';
import '../template/login.html';

let interfaceL = new ReactiveVar(null);

Tracker.autorun(()=>{
	interfaceL.set(translationDB.findOne({docType: 'general'}));
});

Template.login.onRendered(()=> {
	Styling.animateBackground('body', 'white', 500);
});

Template.login.helpers({
	'dynamic_trans' (col) {
		return interfaceL.get() && interfaceL.get()[Session.get(col)];
	},
	'translation' (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.login.events({
	'touchend #userLogin, click #userLogin' (event) {
		if(Tools.swipeCheck(event)) {
			Styling.showWarning('loggingin');
			let email = $('#userId').val(), password = $('#userPW').val();
			if(!$('form')[0].checkValidity()) {
				Styling.showWarning('formvalide');
			}
			else {
				Meteor.loginWithPassword(email, password, (err)=>{
					if(err) {
						Tools.callErrorHandler(err, 'loggingfailed');
					}
					else {
						Meteor.callAsync('funcEntryWindow', 'user', 'rememberLogin', {remember: Session.get('rememberMe')}).then(()=>{
							if(Meteor.user() && !Meteor.user().profile.rememberMe) {
								autoLogout();
							}
						}).catch((err)=>{
							Tools.callErrorHandler(err, 'server');
						});
						Styling.showWarning('loggingsuccess');
						let getHoldSession = Session.get('holdSession');
						if(getHoldSession && getHoldSession.hold) {
							if(getHoldSession.sessionType === 'runExp') {
								Tools.runExp();
							}
						}
						else {
							FlowRouter.go('userhome', {subpage: 'dashboard'});
						}
					}
				});
			}
		}
	},
	'touchend #userForgotPW, click #userForgotPW' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('forgotPW');
		}
	},
	'touchend #signup, click #signup' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('register');
		}
	},
	'touchend #rememberMe, click #rememberMe' (event) {
		if(Tools.swipeCheck(event, true, false)) {
			let checked = event.currentTarget.checked;
			Session.set('rememberMe', checked);
		}
	}
});

Template.forgotPW.helpers({
	'dynamic_trans' (col) {
		return interfaceL.get() && interfaceL.get()[Session.get(col)];
	},
	'translation' (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.forgotPW.events({
	'touchend #submitForgotPW, click #submitForgotPW' (event) {
		if(Tools.swipeCheck(event)) {
			Styling.showWarning('submitting');
			if(!$('form')[0].checkValidity()) {
				Styling.showWarning('formvalide');
			}
			else {
				let email = $('#forgotPWEmail').val();
				Meteor.callAsync('funcEntryWindow', 'user', 'resendUserEmail', 
					{email: email, type: 'sendForgotPW', userCat: Session.get('userCat')}).then((res)=>{
						FlowRouter.go('forgotPWSent');
					}).catch((err)=>{
						Tools.callErrorHandler(err, 'server');
					});
			}
		}
	}
});

Template.forgotPWSent.helpers({
	'translation' (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.resetPW.helpers({
	'translation' (col) {
		return interfaceL.get() && interfaceL.get()[col];
	},
	'verifyCode' () {
		return Session.get('verifyCode');
	}
});

Template.resetPW.events({
	'touchend #submitResetPW, click #submitResetPW' () {
		if(Tools.swipeCheck(event)) {
			Styling.showWarning('submitting');
			let newUserPW = $('#newPW').val();
			if(!$('form')[0].checkValidity()) {
				Styling.showWarning('formvalide');
			}
			else if(newUserPW.length < 8) {
				Styling.showWarning('pwshorte');
			}
			else if(newUserPW !== $('#newPWReType').val()) {
				Styling.showWarning('pwinconsistente');
			}
			else {
				let token = $('#verifyCode').val();
				Meteor.callAsync('funcEntryWindow', 'user', 'appResetPW',
					{token: token, password: Accounts._hashPassword(newUserPW)}).then(()=>{
						Styling.showWarning('pwresetok');
						FlowRouter.go('login');
					}).catch((err)=>{
						if(err.error === 'too-many-requests') {
							Styling.showWarning('slowdown');
						}
						else if(err.error === 403) { //Token might have expired.
							Styling.showWarning('tokenexpired');
						}
						else {
							Styling.showWarning('vitale');
						}
					});
			}
		}
	}
});

Template.resetPW.onDestroyed(()=>{
	Session.set('verifyCode', '');
});

//https://forums.meteor.com/t/meteor-accounts-remember-me-option/26295
function autoLogout() {
  //Accounts.loginWithPassword();
  // stops Accounts from logging you out due to token change
  Accounts._autoLoginEnabled = false;
  // remove login token from LocalStorage
  Accounts._unstoreLoginToken();
  // if you want to synchronise login states between tabs
  var pollLoginState = ()=>{
    var currentLoginToken = Accounts._storedLoginToken();
    if (! currentLoginToken) return;

    // != instead of !== just to make sure undefined and null are treated the same
    if (Accounts._lastLoginTokenWhenPolled != currentLoginToken) {
      if (currentLoginToken) {
        Accounts.loginWithToken(currentLoginToken, function (err) {
          if (err) {
            Accounts.makeClientLoggedOut();
          }
        });
      } else {
        Accounts.logout();
      }
    }
    Accounts._lastLoginTokenWhenPolled = currentLoginToken;
  };

  Meteor.setInterval(()=>{
    pollLoginState();
  }, 3000);
};