import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Accounts } from 'meteor/accounts-base';

import Styling from '../styling/stylingFuncs.js';

let swiping = false;

export let initiateSwipeCheck = function () {
	$(document).on('touchmove', ()=>{
		swiping = true;
		$(document).on('touchend', ()=>{
			Meteor.setTimeout(()=>{
				$(document).off('touchend');
				swiping = false;
			}, 500);
		});
	});
};

export let swipeCheck = function (event, sp=true, pd=true) {
	if(sp) {
		event.stopPropagation();
	}
	if(pd) {
		event.preventDefault();
	}
	if(event.type === 'touchend') {
		if(swiping) {
			swiping = false;
			return false;
		}
		else {
			return true;
		}
	}
	return true;
};

export let callErrorHandler = function (err, specificType, userCat) {
	let errorMsg = '';
	if(err.error === 'too-many-requests') {
		errorMsg = 'slowdown';
	}
	else if (specificType === 'server') {
		errorMsg = err.error;
	}
	else {
		errorMsg = specificType;
	}
	if(errorMsg === 'slowdown' || errorMsg === 'vitale') {
		userCat = '';
	}
	if(userCat) {
		Styling.showWarning(errorMsg, userCat);
	}
	else {
		Styling.showWarning(errorMsg);
	}
};

export let stopPropDefault = function (event) {
	event.stopPropagation();
	event.preventDefault();
};

export let getAndShowInstruction = function (ins) {
	Meteor.call('funcEntryWindow', 'exp', 'getInstruction', 
		{instruction: ins,  userLang: Session.get('userLang')}, (err, result)=>{
		if(err) {
			if(err.error === 'too-many-requests') {
				Styling.showWarning('slowdown');
			}
			else {
				Styling.showWarning(err.error);
			}
		}
		else {
			let insHeight = '';
			$('#instructionContainer').html(result.instruction).show().animate({
				height: '80%',
				opacity: 0.98
			}, 500);
		}
	});
};

export let closeInstruction = function () {
	$('#instructionContainer').html('').animate({
		height: 0,
		opacity: 0
	}, 500).hide();
};

export let deleteAccount = function () {
	Styling.showWarning('deleting');
	let password = $('input').eq(0).val();
	password = Accounts._hashPassword(password);
	Meteor.call('funcEntryWindow', 'user', 'deleteUserAccount', {password: password}, (err, res)=>{
		if(err) {
			$('input').eq(0).val('');
			callErrorHandler(err, 'server');
		}
		else {
			Meteor.logout();
			FlowRouter.go('register');
			Styling.showWarning('accountdeleted');
		}
	});
}

export let runExp = function () {
	let expId = Session.get('expId');
	Meteor.call('funcEntryWindow', 'exp', 'expInitializer', 
		{expId: expId, 
		screenX: $(window).width(), 
		screenY: $(window).height()}, (err, res)=>{
			if(err) {
				callErrorHandler(err, 'server');
				Session.set('expType', '');
				FlowRouter.go('userhome', {subpage: 'dashboard'});
			}
			else {
				Session.set('expSession', 'loadingSettings');
				FlowRouter.go('runExp', {expid: expId});
			}
	});
};